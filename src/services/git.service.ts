import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GitService {
  private readonly GRAPH_DIR = '.codegraph';
  private readonly GRAPH_FILE = 'graph.json';

  /**
   * Get the current git commit hash
   * @param projectRoot Project root directory
   * @returns Commit hash (short version)
   */
  async getCurrentCommitHash(projectRoot: string): Promise<string> {
    try {
      const proc = Bun.spawn(['git', 'rev-parse', '--short', 'HEAD'], {
        cwd: projectRoot,
        stdout: 'pipe',
      });

      const output = await new Response(proc.stdout).text();
      return output.trim();
    } catch (error) {
      console.error('Error getting commit hash:', error);
      return 'unknown';
    }
  }

  /**
   * Get the current git branch name
   * @param projectRoot Project root directory
   * @returns Branch name
   */
  async getCurrentBranch(projectRoot: string): Promise<string> {
    try {
      const proc = Bun.spawn(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: projectRoot,
        stdout: 'pipe',
      });

      const output = await new Response(proc.stdout).text();
      return output.trim();
    } catch (error) {
      console.error('Error getting current branch:', error);
      return 'main';
    }
  }

  /**
   * Write graph.json to .codegraph directory
   * @param projectRoot Project root directory
   * @param graphData Graph data as JSON string
   */
  writeGraph(projectRoot: string, graphData: string): void {
    try {
      // Create .codegraph directory if it doesn't exist
      const graphDir = path.join(projectRoot, this.GRAPH_DIR);
      if (!fs.existsSync(graphDir)) {
        fs.mkdirSync(graphDir, { recursive: true });
      }

      // Write graph.json
      const graphPath = path.join(graphDir, this.GRAPH_FILE);
      fs.writeFileSync(graphPath, graphData);

      console.log(`✓ Written graph to ${path.join(this.GRAPH_DIR, this.GRAPH_FILE)}`);
    } catch (error) {
      console.error('Error writing graph:', error);
      throw error;
    }
  }

  /**
   * Get the graph file path
   * @param projectRoot Project root directory
   * @returns Full path to graph.json
   */
  getGraphPath(projectRoot: string): string {
    return path.join(projectRoot, this.GRAPH_DIR, this.GRAPH_FILE);
  }

  /**
   * Get list of changed files in working directory compared to a base commit
   * @param projectRoot Project root directory
   * @param baseCommit Base commit to compare against (default: HEAD)
   * @returns Array of changed file paths (relative to project root)
   */
  async getChangedFiles(
    projectRoot: string,
    baseCommit: string = 'HEAD'
  ): Promise<string[]> {
    try {
      // Get both staged and unstaged changes
      const proc = Bun.spawn(
        ['git', 'diff', '--name-only', baseCommit],
        {
          cwd: projectRoot,
          stdout: 'pipe',
        }
      );

      const output = await new Response(proc.stdout).text();
      const files = output
        .trim()
        .split('\n')
        .filter((f) => f.length > 0)
        .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));

      return files;
    } catch (error) {
      console.error('Error getting changed files:', error);
      return [];
    }
  }

  /**
   * Get unstaged changes (working directory vs index)
   * @param projectRoot Project root directory
   * @returns Array of unstaged file paths
   */
  async getUnstagedChanges(projectRoot: string): Promise<string[]> {
    try {
      const proc = Bun.spawn(['git', 'diff', '--name-only'], {
        cwd: projectRoot,
        stdout: 'pipe',
      });

      const output = await new Response(proc.stdout).text();
      const files = output
        .trim()
        .split('\n')
        .filter((f) => f.length > 0)
        .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));

      return files;
    } catch (error) {
      console.error('Error getting unstaged changes:', error);
      return [];
    }
  }

  /**
   * Check if working directory is clean (no changes)
   * @param projectRoot Project root directory
   * @returns True if working directory is clean
   */
  async isWorkingDirectoryClean(projectRoot: string): Promise<boolean> {
    try {
      const proc = Bun.spawn(['git', 'status', '--porcelain'], {
        cwd: projectRoot,
        stdout: 'pipe',
      });

      const output = await new Response(proc.stdout).text();
      return output.trim().length === 0;
    } catch (error) {
      console.error('Error checking working directory status:', error);
      return false;
    }
  }

  /**
   * Validate that a commit hash exists
   * @param projectRoot Project root directory
   * @param commitHash Commit hash to validate
   * @returns True if commit exists
   */
  async commitExists(
    projectRoot: string,
    commitHash: string
  ): Promise<boolean> {
    try {
      const proc = Bun.spawn(
        ['git', 'cat-file', '-e', `${commitHash}^{commit}`],
        {
          cwd: projectRoot,
        }
      );

      const exitCode = await proc.exited;
      return exitCode === 0;
    } catch (error) {
      return false;
    }
  }
}
