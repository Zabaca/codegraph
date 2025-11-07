import { Injectable } from '@nestjs/common';
import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import {
  ParsedFile,
  ParsedClass,
  ParsedMethod,
  ParsedFunction,
  ParsedImport,
} from '../interfaces/graph.interface';

@Injectable()
export class ParserService {
  private project: Project;

  constructor() {
    this.project = new Project({
      skipAddingFilesFromTsConfig: true,
    });
  }

  /**
   * Parse a TypeScript file
   * @param filePath Absolute path to the file
   * @param relativePath Relative path from project root (for entity IDs)
   * @returns Parsed file data
   */
  parseFile(filePath: string, relativePath: string): ParsedFile {
    const sourceFile = this.project.addSourceFileAtPath(filePath);

    const classes = this.extractClasses(sourceFile);
    const functions = this.extractFunctions(sourceFile);
    const imports = this.extractImports(sourceFile);

    return {
      filePath: relativePath,
      classes,
      functions,
      imports,
    };
  }

  /**
   * Extract classes from a source file
   */
  private extractClasses(sourceFile: SourceFile): ParsedClass[] {
    const classes: ParsedClass[] = [];

    for (const classDeclaration of sourceFile.getClasses()) {
      const name = classDeclaration.getName();
      if (!name) continue;

      const line = classDeclaration.getStartLineNumber();
      const endLine = classDeclaration.getEndLineNumber();

      // Get extends clause
      const extendsClause = classDeclaration.getExtends();
      const extendsName = extendsClause?.getText();

      // Get implements clauses
      const implementsClauses = classDeclaration.getImplements();
      const implementsNames = implementsClauses.map(impl => impl.getText());

      // Extract methods
      const methods = this.extractMethods(classDeclaration);

      classes.push({
        name,
        line,
        endLine,
        methods,
        extends: extendsName,
        implements: implementsNames.length > 0 ? implementsNames : undefined,
      });
    }

    return classes;
  }

  /**
   * Extract methods from a class declaration
   */
  private extractMethods(classDeclaration: any): ParsedMethod[] {
    const methods: ParsedMethod[] = [];

    for (const method of classDeclaration.getMethods()) {
      const name = method.getName();
      const line = method.getStartLineNumber();
      const endLine = method.getEndLineNumber();

      // Extract function calls within the method
      const calls = this.extractCalls(method);

      methods.push({
        name,
        line,
        endLine,
        calls,
      });
    }

    return methods;
  }

  /**
   * Extract standalone functions from a source file
   */
  private extractFunctions(sourceFile: SourceFile): ParsedFunction[] {
    const functions: ParsedFunction[] = [];

    for (const functionDeclaration of sourceFile.getFunctions()) {
      const name = functionDeclaration.getName();
      if (!name) continue;

      const line = functionDeclaration.getStartLineNumber();
      const endLine = functionDeclaration.getEndLineNumber();

      // Extract function calls
      const calls = this.extractCalls(functionDeclaration);

      functions.push({
        name,
        line,
        endLine,
        calls,
      });
    }

    return functions;
  }

  /**
   * Extract function/method calls from a node
   */
  private extractCalls(node: any): string[] {
    const calls: string[] = [];
    const callExpressions = node.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const callExpr of callExpressions) {
      const expression = callExpr.getExpression();
      let callName: string | undefined;

      if (expression.getKind() === SyntaxKind.Identifier) {
        // Simple function call: formatDate()
        callName = expression.getText();
      } else if (expression.getKind() === SyntaxKind.PropertyAccessExpression) {
        // Method call: this.logAction() or obj.method()
        callName = expression.getText();
      }

      if (callName && !calls.includes(callName)) {
        calls.push(callName);
      }
    }

    return calls;
  }

  /**
   * Extract imports from a source file
   */
  private extractImports(sourceFile: SourceFile): ParsedImport[] {
    const imports: ParsedImport[] = [];

    for (const importDeclaration of sourceFile.getImportDeclarations()) {
      const moduleSpecifier = importDeclaration.getModuleSpecifierValue();
      const isTypeOnly = importDeclaration.isTypeOnly();

      imports.push({
        from: moduleSpecifier,
        isTypeOnly,
      });
    }

    return imports;
  }

  /**
   * Clear cached source files
   */
  clearCache(): void {
    this.project.getSourceFiles().forEach(sf => this.project.removeSourceFile(sf));
  }
}
