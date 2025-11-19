import { Injectable } from '@nestjs/common';
import {
  GraphData,
  Node,
  Edge,
  ParsedFile,
} from '../interfaces/graph.interface';
import {
  formatFileId,
  formatClassId,
  formatMethodId,
  formatFunctionId,
  formatInterfaceId,
} from '../utils/entity-id.util';
import { resolveImportPath } from '../utils/path.util';

@Injectable()
export class GraphBuilderService {
  /**
   * Build a complete graph from parsed files
   * @param parsedFiles Array of parsed file data
   * @param commitHash Current git commit hash
   * @param projectRoot Project root directory
   * @returns Complete graph data structure
   */
  buildGraph(
    parsedFiles: ParsedFile[],
    commitHash: string,
    projectRoot: string
  ): GraphData {
    const nodes: Record<string, Node> = {};
    const edges: Edge[] = [];
    const skippedEdges: Array<{ source: string; target: string; reason: string }> = [];

    // First pass: Create all nodes
    for (const parsedFile of parsedFiles) {
      this.addFileNodes(parsedFile, nodes);
    }

    // Second pass: Create all edges (relationships)
    for (const parsedFile of parsedFiles) {
      this.addFileEdges(parsedFile, edges, projectRoot, nodes, skippedEdges);
    }

    // Report skipped edges if any
    if (skippedEdges.length > 0) {
      console.warn(`\n⚠️  Warning: Skipped ${skippedEdges.length} edges to files that weren't parsed:`);
      const uniqueTargets = new Set(skippedEdges.map(e => e.target));
      uniqueTargets.forEach(target => {
        const sources = skippedEdges.filter(e => e.target === target).map(e => e.source);
        console.warn(`   • ${target}`);
        console.warn(`     Referenced by: ${sources.slice(0, 3).join(', ')}${sources.length > 3 ? ` (+${sources.length - 3} more)` : ''}`);
      });
      console.warn(`   Tip: These files may be excluded, outside the scan directory, or failed to parse.\n`);
    }

    return {
      version: '1.0.0',
      commitHash,
      timestamp: new Date().toISOString(),
      nodes,
      edges,
    };
  }

  /**
   * Add nodes for a file and its contents
   */
  private addFileNodes(parsedFile: ParsedFile, nodes: Record<string, Node>): void {
    const { filePath, classes, functions } = parsedFile;

    // Add file node
    nodes[formatFileId(filePath)] = {
      type: 'file',
    };

    // Add class nodes
    for (const classDecl of classes) {
      const classId = formatClassId(filePath, classDecl.name);
      nodes[classId] = {
        type: 'class',
        file: filePath,
        line: classDecl.line,
        endLine: classDecl.endLine,
      };

      // Add method nodes
      for (const method of classDecl.methods) {
        const methodId = formatMethodId(filePath, classDecl.name, method.name);
        nodes[methodId] = {
          type: 'method',
          file: filePath,
          line: method.line,
          endLine: method.endLine,
        };
      }
    }

    // Add function nodes
    for (const func of functions) {
      const functionId = formatFunctionId(filePath, func.name);
      nodes[functionId] = {
        type: 'function',
        file: filePath,
        line: func.line,
        endLine: func.endLine,
      };
    }
  }

  /**
   * Add edges (relationships) for a file
   */
  private addFileEdges(
    parsedFile: ParsedFile,
    edges: Edge[],
    projectRoot: string,
    nodes: Record<string, Node>,
    skippedEdges: Array<{ source: string; target: string; reason: string }>
  ): void {
    const { filePath, classes, functions, imports } = parsedFile;
    const fileId = formatFileId(filePath);

    // Add import edges
    for (const imp of imports) {
      if (imp.isTypeOnly) continue; // Skip type-only imports

      const targetPath = resolveImportPath(imp.from, filePath, projectRoot);
      if (targetPath) {
        const targetId = formatFileId(targetPath);

        // Only create edge if target node exists
        if (nodes[targetId]) {
          edges.push({
            source: fileId,
            relationship: 'imports',
            target: targetId,
          });
        } else {
          // Track skipped edge for reporting
          skippedEdges.push({
            source: fileId,
            target: targetId,
            reason: 'Target file not parsed as node',
          });
        }
      }
    }

    // Add class relationship edges
    for (const classDecl of classes) {
      const classId = formatClassId(filePath, classDecl.name);

      // Add extends edges
      if (classDecl.extends) {
        // For now, use the extends name as-is
        // In a more sophisticated version, we'd resolve it to the actual class
        const extendsClassId = this.resolveClassName(classDecl.extends, filePath);
        if (extendsClassId) {
          edges.push({
            source: classId,
            relationship: 'extends',
            target: extendsClassId,
          });
        }
      }

      // Add implements edges
      if (classDecl.implements) {
        for (const impl of classDecl.implements) {
          const interfaceId = this.resolveInterfaceName(impl, filePath);
          if (interfaceId) {
            edges.push({
              source: classId,
              relationship: 'implements',
              target: interfaceId,
            });
          }
        }
      }

      // Add method call edges
      for (const method of classDecl.methods) {
        const methodId = formatMethodId(filePath, classDecl.name, method.name);

        for (const call of method.calls) {
          const targetId = this.resolveCallTarget(call, filePath, classDecl.name);
          if (targetId) {
            edges.push({
              source: methodId,
              relationship: 'calls',
              target: targetId,
            });
          }
        }
      }
    }

    // Add function call edges
    for (const func of functions) {
      const functionId = formatFunctionId(filePath, func.name);

      for (const call of func.calls) {
        const targetId = this.resolveCallTarget(call, filePath);
        if (targetId) {
          edges.push({
            source: functionId,
            relationship: 'calls',
            target: targetId,
          });
        }
      }
    }
  }

  /**
   * Resolve a class name to an entity ID
   * This is simplified - a more complete version would use import resolution
   */
  private resolveClassName(className: string, currentFile: string): string | null {
    // If it's a simple name, assume it's in the same file or imported
    // For now, return null to avoid creating incorrect edges
    // TODO: Implement proper resolution using import statements
    return null;
  }

  /**
   * Resolve an interface name to an entity ID
   */
  private resolveInterfaceName(
    interfaceName: string,
    currentFile: string
  ): string | null {
    // Similar to resolveClassName
    // TODO: Implement proper resolution
    return null;
  }

  /**
   * Resolve a function/method call to an entity ID
   * @param call The call expression (e.g., "formatDate", "this.logAction")
   * @param currentFile Current file path
   * @param currentClass Current class name (if inside a class)
   */
  private resolveCallTarget(
    call: string,
    currentFile: string,
    currentClass?: string
  ): string | null {
    // Handle "this." calls
    if (call.startsWith('this.') && currentClass) {
      const methodName = call.replace('this.', '');
      return formatMethodId(currentFile, currentClass, methodName);
    }

    // For simple function calls, assume they're in the same file
    // This is a simplification - proper resolution would check imports
    if (!call.includes('.')) {
      return formatFunctionId(currentFile, call);
    }

    // For other cases, return null for now
    // TODO: Implement proper call resolution across files
    return null;
  }
}
