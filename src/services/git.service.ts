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
}
