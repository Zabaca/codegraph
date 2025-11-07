import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { FileScannerService } from '../services/file-scanner.service';
import { GraphReaderService } from '../services/graph-reader.service';
import { GraphDiffService } from '../services/graph-diff.service';
import { GitService } from '../services/git.service';
import { formatDiffReport } from '../utils/output-formatter.util';

interface DiffCommandOptions {
  summary?: boolean;
  nodesOnly?: boolean;
  edgesOnly?: boolean;
  format?: 'json' | 'report';
}

@Injectable()
@Command({
  name: 'diff',
  description: 'Compare graphs between two commits',
  arguments: '<commit1> <commit2>',
  argsDescription: {
    commit1: 'First commit hash (older)',
    commit2: 'Second commit hash (newer)',
  },
})
export class DiffCommand extends CommandRunner {
  constructor(
    private readonly fileScannerService: FileScannerService,
    private readonly graphReaderService: GraphReaderService,
    private readonly graphDiffService: GraphDiffService,
    private readonly gitService: GitService
  ) {
    super();
  }

  async run(inputs: string[], options: DiffCommandOptions): Promise<void> {
    const commit1 = inputs[0];
    const commit2 = inputs[1];

    if (!commit1 || !commit2) {
      console.error('Error: Two commit hashes are required');
      console.error('Usage: codegraph diff <commit1> <commit2> [options]');
      process.exit(1);
    }

    try {
      // Get project root
      const projectRoot = this.fileScannerService.getProjectRoot();

      // Validate commits exist
      console.log('🔍 Validating commits...');
      const commit1Exists = await this.gitService.commitExists(
        projectRoot,
        commit1
      );
      const commit2Exists = await this.gitService.commitExists(
        projectRoot,
        commit2
      );

      if (!commit1Exists) {
        throw new Error(`Commit '${commit1}' not found`);
      }

      if (!commit2Exists) {
        throw new Error(`Commit '${commit2}' not found`);
      }

      // Load graphs from both commits
      console.log(`📊 Loading graph from ${commit1}...`);
      const graph1 = await this.graphReaderService.loadGraphFromCommit(
        projectRoot,
        commit1
      );

      console.log(`📊 Loading graph from ${commit2}...`);
      const graph2 = await this.graphReaderService.loadGraphFromCommit(
        projectRoot,
        commit2
      );

      // Compare graphs
      console.log('🔬 Comparing graphs...');
      const diff = this.graphDiffService.compareGraphs(graph1, graph2);

      // Check if graphs are identical
      if (this.graphDiffService.areGraphsIdentical(graph1, graph2)) {
        console.log('\n✓ Graphs are identical. No changes detected.');
        return;
      }

      // Apply filters if specified
      if (options.nodesOnly) {
        diff.addedEdges = [];
        diff.removedEdges = [];
        diff.summary.totalEdgesAdded = 0;
        diff.summary.totalEdgesRemoved = 0;
      }

      if (options.edgesOnly) {
        diff.addedNodes = [];
        diff.removedNodes = [];
        diff.modifiedNodes = [];
        diff.summary.totalNodesAdded = 0;
        diff.summary.totalNodesRemoved = 0;
        diff.summary.totalNodesModified = 0;
      }

      // Format and display output
      const format = options.format || 'report';
      const summaryOnly = options.summary || false;

      if (format === 'json') {
        console.log(JSON.stringify(diff, null, 2));
      } else {
        console.log(formatDiffReport(diff, summaryOnly));
      }
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      process.exit(1);
    }
  }

  @Option({
    flags: '--summary',
    description: 'Show only summary statistics',
  })
  parseSummary(): boolean {
    return true;
  }

  @Option({
    flags: '--nodes-only',
    description: 'Show only node changes (exclude edges)',
  })
  parseNodesOnly(): boolean {
    return true;
  }

  @Option({
    flags: '--edges-only',
    description: 'Show only edge changes (exclude nodes)',
  })
  parseEdgesOnly(): boolean {
    return true;
  }

  @Option({
    flags: '--format <format>',
    description: 'Output format: json or report (default: report)',
  })
  parseFormat(val: string): 'json' | 'report' {
    if (val !== 'json' && val !== 'report') {
      throw new Error(`Invalid format: ${val}. Must be json or report`);
    }
    return val;
  }
}
