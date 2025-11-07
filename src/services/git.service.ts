import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GitService {
  private readonly GRAPH_BRANCH = 'graph-data';

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
   * Check if graph-data branch exists
   * @param projectRoot Project root directory
   * @returns True if branch exists
   */
  async graphBranchExists(projectRoot: string): Promise<boolean> {
    try {
      const proc = Bun.spawn(['git', 'rev-parse', '--verify', this.GRAPH_BRANCH], {
        cwd: projectRoot,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      await proc.exited;
      return proc.exitCode === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create orphan graph-data branch
   * @param projectRoot Project root directory
   */
  async createGraphBranch(projectRoot: string): Promise<void> {
    try {
      // Create orphan branch
      await this.runGitCommand(projectRoot, ['checkout', '--orphan', this.GRAPH_BRANCH]);

      // Remove all files
      await this.runGitCommand(projectRoot, ['rm', '-rf', '.']);

      // Create initial graph.json
      const initialGraph = JSON.stringify({ version: '1.0.0', nodes: {}, edges: [] }, null, 2);
      const graphPath = path.join(projectRoot, 'graph.json');
      fs.writeFileSync(graphPath, initialGraph);

      // Commit initial version
      await this.runGitCommand(projectRoot, ['add', 'graph.json']);
      await this.runGitCommand(projectRoot, [
        'commit',
        '-m',
        'Initialize graph-data branch',
      ]);

      console.log('Created graph-data branch');
    } catch (error) {
      console.error('Error creating graph branch:', error);
      throw error;
    }
  }

  /**
   * Switch to a git branch
   * @param projectRoot Project root directory
   * @param branch Branch name
   */
  async checkoutBranch(projectRoot: string, branch: string): Promise<void> {
    try {
      await this.runGitCommand(projectRoot, ['checkout', branch]);
    } catch (error) {
      console.error(`Error checking out branch ${branch}:`, error);
      throw error;
    }
  }

  /**
   * Write graph.json and commit to graph-data branch
   * @param projectRoot Project root directory
   * @param graphData Graph data as JSON string
   * @param commitHash Commit hash from main branch
   */
  async commitGraph(
    projectRoot: string,
    graphData: string,
    commitHash: string
  ): Promise<void> {
    try {
      // Write graph.json
      const graphPath = path.join(projectRoot, 'graph.json');
      fs.writeFileSync(graphPath, graphData);

      // Add and commit
      await this.runGitCommand(projectRoot, ['add', 'graph.json']);
      await this.runGitCommand(projectRoot, [
        'commit',
        '-m',
        `Update graph for commit ${commitHash}`,
      ]);

      console.log(`Committed graph for commit ${commitHash}`);
    } catch (error) {
      console.error('Error committing graph:', error);
      throw error;
    }
  }

  /**
   * Run a git command
   * @param cwd Working directory
   * @param args Git command arguments
   */
  private async runGitCommand(cwd: string, args: string[]): Promise<string> {
    const proc = Bun.spawn(['git', ...args], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(proc.stdout).text();
    await proc.exited;

    if (proc.exitCode !== 0) {
      const error = await new Response(proc.stderr).text();
      throw new Error(`Git command failed: ${error}`);
    }

    return output.trim();
  }

  /**
   * Check if the working directory is clean
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
      return false;
    }
  }
}
