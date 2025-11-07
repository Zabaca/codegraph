import { Injectable } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';
import { FileScannerService } from '../services/file-scanner.service';
import { ParserService } from '../services/parser.service';
import { GraphBuilderService } from '../services/graph-builder.service';
import { GitService } from '../services/git.service';
import { normalizePath } from '../utils/path.util';
import { ParsedFile } from '../interfaces/graph.interface';

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
      // Step 1: Get project root
      const projectRoot = this.fileScannerService.getProjectRoot();
      console.log(`📁 Project root: ${projectRoot}`);

      // Step 2: Get current commit hash and branch
      const currentBranch = await this.gitService.getCurrentBranch(projectRoot);
      const commitHash = await this.gitService.getCurrentCommitHash(projectRoot);
      console.log(`🔖 Current branch: ${currentBranch}`);
      console.log(`📌 Current commit: ${commitHash}\n`);

      // Step 3: Scan for TypeScript files
      console.log('🔍 Scanning for TypeScript files...');
      const files = await this.fileScannerService.scanDirectory(projectRoot);
      console.log(`✓ Found ${files.length} TypeScript files\n`);

      if (files.length === 0) {
        console.log('⚠️  No TypeScript files found');
        return;
      }

      // Step 4: Parse each file
      console.log('🔬 Parsing TypeScript files...');
      const parsedFiles: ParsedFile[] = [];

      for (const file of files) {
        const relativePath = normalizePath(file, projectRoot);
        try {
          const parsed = this.parserService.parseFile(file, relativePath);
          parsedFiles.push(parsed);
          process.stdout.write('.');
        } catch (error) {
          console.error(`\n⚠️  Error parsing ${relativePath}:`, error);
        }
      }

      console.log(` ✓ Parsed ${parsedFiles.length} files\n`);

      // Step 5: Build graph
      console.log('🏗️  Building dependency graph...');
      const graphData = this.graphBuilderService.buildGraph(
        parsedFiles,
        commitHash,
        projectRoot
      );

      const nodeCount = Object.keys(graphData.nodes).length;
      const edgeCount = graphData.edges.length;
      console.log(`✓ Graph built: ${nodeCount} nodes, ${edgeCount} edges\n`);

      // Step 6: Write graph to .codegraph/graph.json
      console.log('💾 Writing graph file...');
      const graphJson = JSON.stringify(graphData, null, 2);
      this.gitService.writeGraph(projectRoot, graphJson);

      // Success
      console.log('\n✅ Graph successfully generated!');
      console.log(`\n📈 Summary:`);
      console.log(`   • Files analyzed: ${files.length}`);
      console.log(`   • Nodes: ${nodeCount}`);
      console.log(`   • Edges: ${edgeCount}`);
      console.log(`   • Commit: ${commitHash}`);
      console.log(`\n💡 View graph: cat .codegraph/graph.json`);
    } catch (error) {
      console.error('\n❌ Error generating graph:', error);
      throw error;
    }
  }
}
