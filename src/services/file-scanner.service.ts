import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { shouldExcludePath } from '../utils/path.util';

@Injectable()
export class FileScannerService {
  private skippedDirs: string[] = [];

  /**
   * Scan directory for TypeScript files
   * @param directory Starting directory (defaults to current working directory)
   * @param pattern Optional glob pattern (e.g., "src/**\/*.ts")
   * @param debug Enable debug logging
   * @returns List of absolute file paths
   */
  async scanDirectory(directory: string = process.cwd(), pattern?: string, debug: boolean = false): Promise<string[]> {
    const files: string[] = [];
    this.skippedDirs = []; // Reset skipped directories counter

    // Start scanning from the specified directory
    await this.scanRecursive(directory, files, debug);

    // Show summary of skipped directories if any
    if (this.skippedDirs.length > 0) {
      console.log(`ℹ️  Skipped ${this.skippedDirs.length} ${this.skippedDirs.length === 1 ? 'directory' : 'directories'} due to permissions`);
      if (debug) {
        this.skippedDirs.forEach(dir => console.log(`   - ${dir}`));
      }
    }

    return files;
  }

  /**
   * Recursively scan directory for .ts files
   */
  private async scanRecursive(dir: string, files: string[], debug: boolean = false): Promise<void> {
    try {
      if (debug && dir.includes('query-builder')) {
        console.log(`\n[DEBUG] Entering directory: ${dir}`);
      }

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      if (debug && dir.includes('query-builder')) {
        console.log(`[DEBUG] Found ${entries.length} entries in ${dir}`);
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip excluded paths
        if (shouldExcludePath(fullPath)) {
          if (debug && fullPath.includes('query-builder')) {
            console.log(`[DEBUG] Excluded: ${fullPath}`);
          }
          continue;
        }

        if (entry.isDirectory()) {
          if (debug && fullPath.includes('query-builder')) {
            console.log(`[DEBUG] Recursing into directory: ${fullPath}`);
          }
          try {
            // Recursively scan subdirectories
            await this.scanRecursive(fullPath, files, debug);
          } catch (error) {
            // Silently skip directories with permission errors
            if (this.isPermissionError(error)) {
              this.skippedDirs.push(fullPath);
              if (debug) {
                console.log(`[DEBUG] Permission error on directory: ${fullPath}`);
              }
              continue;
            }
            // Re-throw other errors
            if (debug) {
              console.log(`[DEBUG] Error in directory ${fullPath}:`, error);
            }
            throw error;
          }
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          // Add TypeScript files (excluding test and declaration files)
          if (!entry.name.endsWith('.test.ts') &&
              !entry.name.endsWith('.spec.ts') &&
              !entry.name.endsWith('.d.ts')) {
            if (debug && fullPath.includes('query-builder')) {
              console.log(`[DEBUG] Adding file: ${fullPath}`);
            }
            files.push(fullPath);
          } else {
            if (debug && fullPath.includes('query-builder')) {
              console.log(`[DEBUG] Skipped test/declaration file: ${fullPath}`);
            }
          }
        }
      }
    } catch (error) {
      // Handle permission errors at the root level
      if (this.isPermissionError(error)) {
        this.skippedDirs.push(dir);
        if (debug) {
          console.log(`[DEBUG] Permission error at root level: ${dir}`);
        }
        return;
      }

      // Log other types of errors
      console.error(`Error scanning directory ${dir}:`, error);
      if (debug) {
        console.error(`[DEBUG] Full error details:`, error);
      }
    }
  }

  /**
   * Check if an error is a permission error
   */
  private isPermissionError(error: any): boolean {
    return error?.code === 'EACCES' ||
           error?.code === 'EPERM' ||
           error?.message?.includes('permission denied');
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
