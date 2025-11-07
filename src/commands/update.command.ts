import { Injectable } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';
import { FileScannerService } from '../services/file-scanner.service';
import { ParserService } from '../services/parser.service';
import { GraphBuilderService } from '../services/graph-builder.service';
import { GitService } from '../services/git.service';
import { normalizePath } from '../utils/path.util';
import type { ParsedFile, GraphData } from '../interfaces/graph.interface';

@Injectable()
@Command({
  name: 'update',
  description: 'Build/update graph from current code',
})
export class UpdateCommand extends CommandRunner {
  constructor(
    private readonly fileScannerService: FileScannerService,
    private readonly parserService: ParserService,
    private readonly graphBuilderService: GraphBuilderService,
    private readonly gitService: GitService
  ) {
    super();
  }

  async run(): Promise<void> {
    console.log('📊 CodeGraph - Generating dependency graph...\n');

    try {
      await this.generateGraph({ verbose: true });
      console.log(`\n💡 View graph: cat .codegraph/graph.json`);
    } catch (error) {
      console.error('\n❌ Error generating graph:', error);
      throw error;
    }
  }

  /**
   * Generate dependency graph (can be called by other commands)
   * @param options Configuration options
   * @returns Generated graph data
   */
  async generateGraph(options: { verbose?: boolean } = {}): Promise<GraphData> {
    const verbose = options.verbose ?? false;

    try {
      // Step 1: Get project root
      const projectRoot = this.fileScannerService.getProjectRoot();
      if (verbose) console.log(`📁 Project root: ${projectRoot}`);

      // Step 2: Get current commit hash and branch
      const currentBranch = await this.gitService.getCurrentBranch(projectRoot);
      const commitHash = await this.gitService.getCurrentCommitHash(projectRoot);
      if (verbose) {
        console.log(`🔖 Current branch: ${currentBranch}`);
        console.log(`📌 Current commit: ${commitHash}\n`);
      }

      // Step 3: Scan for TypeScript files
      if (verbose) console.log('🔍 Scanning for TypeScript files...');
      const files = await this.fileScannerService.scanDirectory(projectRoot);
      if (verbose) console.log(`✓ Found ${files.length} TypeScript files\n`);

      if (files.length === 0) {
        if (verbose) console.log('⚠️  No TypeScript files found');
        throw new Error('No TypeScript files found');
      }

      // Step 4: Parse each file
      if (verbose) console.log('🔬 Parsing TypeScript files...');
      const parsedFiles: ParsedFile[] = [];

      for (const file of files) {
        const relativePath = normalizePath(file, projectRoot);
        try {
          const parsed = this.parserService.parseFile(file, relativePath);
          parsedFiles.push(parsed);
          if (verbose) process.stdout.write('.');
        } catch (error) {
          console.error(`\n⚠️  Error parsing ${relativePath}:`, error);
        }
      }

      if (verbose) console.log(` ✓ Parsed ${parsedFiles.length} files\n`);

      // Step 5: Build graph
      if (verbose) console.log('🏗️  Building dependency graph...');
      const graphData = this.graphBuilderService.buildGraph(
        parsedFiles,
        commitHash,
        projectRoot
      );

      const nodeCount = Object.keys(graphData.nodes).length;
      const edgeCount = graphData.edges.length;
      if (verbose) console.log(`✓ Graph built: ${nodeCount} nodes, ${edgeCount} edges\n`);

      // Step 6: Write graph to .codegraph/graph.json
      if (verbose) console.log('💾 Writing graph file...');
      const graphJson = JSON.stringify(graphData, null, 2);
      this.gitService.writeGraph(projectRoot, graphJson);
      if (verbose) console.log('✓ Written graph to .codegraph/graph.json');

      // Success
      if (verbose) {
        console.log('\n✅ Graph successfully generated!');
        console.log(`\n📈 Summary:`);
        console.log(`   • Files analyzed: ${files.length}`);
        console.log(`   • Nodes: ${nodeCount}`);
        console.log(`   • Edges: ${edgeCount}`);
        console.log(`   • Commit: ${commitHash}`);
      }

      return graphData;
    } catch (error) {
      if (verbose) console.error('\n❌ Error generating graph:', error);
      throw error;
    }
  }
}
