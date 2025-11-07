import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { GraphData } from '../interfaces/graph.interface';

@Injectable()
export class GraphReaderService {
  private readonly GRAPH_DIR = '.codegraph';
  private readonly GRAPH_FILE = 'graph.json';

  /**
   * Load the current graph from .codegraph/graph.json
   * @param projectRoot Project root directory
   * @returns Parsed graph data
   */
  loadCurrentGraph(projectRoot: string): GraphData {
    const graphPath = this.getGraphPath(projectRoot);

    if (!this.graphExists(projectRoot)) {
      throw new Error(
        `Graph file not found at ${graphPath}. Run 'codegraph update' first.`
      );
    }

    try {
      const graphContent = fs.readFileSync(graphPath, 'utf-8');
      return JSON.parse(graphContent) as GraphData;
    } catch (error) {
      throw new Error(`Failed to load graph: ${error.message}`);
    }
  }

  /**
   * Load a graph from a specific git commit
   * @param projectRoot Project root directory
   * @param commitHash Git commit hash
   * @returns Parsed graph data
   */
  async loadGraphFromCommit(
    projectRoot: string,
    commitHash: string
  ): Promise<GraphData> {
    const graphRelativePath = path.join(this.GRAPH_DIR, this.GRAPH_FILE);

    try {
      // Use git show to read file from commit
      const proc = Bun.spawn(
        ['git', 'show', `${commitHash}:${graphRelativePath}`],
        {
          cwd: projectRoot,
          stdout: 'pipe',
          stderr: 'pipe',
        }
      );

      const output = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        const error = await new Response(proc.stderr).text();
        throw new Error(
          `Graph not found in commit ${commitHash}. Error: ${error.trim()}`
        );
      }

      return JSON.parse(output) as GraphData;
    } catch (error) {
      throw new Error(
        `Failed to load graph from commit ${commitHash}: ${error.message}`
      );
    }
  }

  /**
   * Check if graph file exists
   * @param projectRoot Project root directory
   * @param commitHash Optional commit hash to check in git history
   * @returns True if graph exists
   */
  graphExists(projectRoot: string, commitHash?: string): boolean {
    if (commitHash) {
      // Check if file exists in git commit
      const graphRelativePath = path.join(this.GRAPH_DIR, this.GRAPH_FILE);
      try {
        const proc = Bun.spawnSync(
          ['git', 'cat-file', '-e', `${commitHash}:${graphRelativePath}`],
          { cwd: projectRoot }
        );
        return proc.exitCode === 0;
      } catch {
        return false;
      }
    }

    // Check current filesystem
    const graphPath = this.getGraphPath(projectRoot);
    return fs.existsSync(graphPath);
  }

  /**
   * Get the full path to the graph file
   * @param projectRoot Project root directory
   * @returns Full path to graph.json
   */
  getGraphPath(projectRoot: string): string {
    return path.join(projectRoot, this.GRAPH_DIR, this.GRAPH_FILE);
  }

  /**
   * Get graph metadata without loading full content
   * @param projectRoot Project root directory
   * @returns Graph version, commit hash, and timestamp
   */
  getGraphMetadata(projectRoot: string): {
    version: string;
    commitHash: string;
    timestamp: string;
  } {
    const graph = this.loadCurrentGraph(projectRoot);
    return {
      version: graph.version,
      commitHash: graph.commitHash,
      timestamp: graph.timestamp,
    };
  }
}
