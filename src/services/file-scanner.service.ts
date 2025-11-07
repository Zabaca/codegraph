import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { shouldExcludePath } from '../utils/path.util';

@Injectable()
export class FileScannerService {
  /**
   * Scan directory for TypeScript files
   * @param directory Starting directory (defaults to current working directory)
   * @param pattern Optional glob pattern (e.g., "src/**\/*.ts")
   * @returns List of absolute file paths
   */
  async scanDirectory(directory: string = process.cwd(), pattern?: string): Promise<string[]> {
    const files: string[] = [];

    // Start scanning from the specified directory
    await this.scanRecursive(directory, files);

    return files;
  }

  /**
   * Recursively scan directory for .ts files
   */
  private async scanRecursive(dir: string, files: string[]): Promise<void> {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip excluded paths
        if (shouldExcludePath(fullPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          await this.scanRecursive(fullPath, files);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          // Add TypeScript files (excluding test and declaration files)
          if (!entry.name.endsWith('.test.ts') &&
              !entry.name.endsWith('.spec.ts') &&
              !entry.name.endsWith('.d.ts')) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error);
    }
  }

  /**
   * Check if a path exists
   */
  pathExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Get project root (directory containing package.json)
   */
  getProjectRoot(startPath: string = process.cwd()): string {
    let currentPath = startPath;

    while (currentPath !== path.parse(currentPath).root) {
      const packageJsonPath = path.join(currentPath, 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        return currentPath;
      }

      currentPath = path.dirname(currentPath);
    }

    // If no package.json found, return the starting path
    return startPath;
  }
}
