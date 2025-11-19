import * as path from 'path';
import * as fs from 'fs';

/**
 * Normalize an absolute path to be relative to the project root
 * @param absolutePath Absolute file path
 * @param projectRoot Project root directory
 * @returns Relative path from project root
 */
export function normalizePath(absolutePath: string, projectRoot: string): string {
  const relativePath = path.relative(projectRoot, absolutePath);

  // Convert Windows paths to Unix style
  return relativePath.replace(/\\/g, '/');
}

/**
 * Check if a path should be excluded from scanning
 * @param filePath File path to check
 * @returns True if the path should be excluded
 */
export function shouldExcludePath(filePath: string): boolean {
  const excludePatterns = [
    'node_modules',
    'dist',
    'build',
    '.git',
    'coverage',
    '*.test.ts',
    '*.spec.ts',
    '*.d.ts', // TypeScript declaration files
  ];

  return excludePatterns.some(pattern => {
    if (pattern.includes('*')) {
      // Simple glob matching - anchor to end of string
      const regexPattern = pattern.replace(/\*/g, '.*').replace(/\./g, '\\.');
      const regex = new RegExp(regexPattern + '$');
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

/**
 * Resolve an import path to a file path
 * @param importFrom The import path (e.g., "./utils", "@/services/user")
 * @param fromFile The file doing the importing
 * @param projectRoot Project root directory
 * @returns Resolved file path or null if cannot be resolved
 */
export function resolveImportPath(
  importFrom: string,
  fromFile: string,
  projectRoot: string
): string | null {
  // Handle relative imports
  if (importFrom.startsWith('.')) {
    const fromDir = path.dirname(fromFile);
    const basePath = path.join(projectRoot, fromDir, importFrom);

    // Try multiple resolution strategies in order
    const candidates = [
      basePath + '.ts',           // ./utils -> ./utils.ts
      basePath + '.tsx',          // ./component -> ./component.tsx
      basePath + '/index.ts',     // ./auth -> ./auth/index.ts
      basePath + '/index.tsx',    // ./components -> ./components/index.tsx
      basePath,                   // Already has extension
    ];

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          return normalizePath(candidate, projectRoot);
        }
      } catch (error) {
        // Permission error or other issue, continue to next candidate
        continue;
      }
    }

    // No valid file found
    return null;
  }

  // Handle absolute/alias imports (e.g., "@/services/user")
  // For now, return null - would need tsconfig path mapping
  return null;
}
