import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { FileScannerService } from '../services/file-scanner.service';
import { GraphReaderService } from '../services/graph-reader.service';
import { ImpactAnalysisService } from '../services/impact-analysis.service';
import { GitService } from '../services/git.service';
import type { RiskLevel } from '../interfaces/impact.interface';
import { formatImpactReport } from '../utils/output-formatter.util';

interface ImpactCommandOptions {
  base?: string;
  format?: 'json' | 'report';
  threshold?: RiskLevel;
}

@Injectable()
@Command({
  name: 'impact',
  description: 'Analyze impact of changes in working directory',
})
export class ImpactCommand extends CommandRunner {
  constructor(
    private readonly fileScannerService: FileScannerService,
    private readonly graphReaderService: GraphReaderService,
    private readonly impactAnalysisService: ImpactAnalysisService,
    private readonly gitService: GitService
  ) {
    super();
  }

  async run(_inputs: string[], options: ImpactCommandOptions): Promise<void> {
    try {
      // Get project root
      const projectRoot = this.fileScannerService.getProjectRoot();

      // Load current graph
      console.log('📊 Loading graph...');
      const graph = this.graphReaderService.loadCurrentGraph(projectRoot);

      // Get changed files
      const baseCommit = options.base || 'HEAD';
      console.log(`🔍 Analyzing changes compared to ${baseCommit}...`);

      const changedFiles = await this.gitService.getChangedFiles(
        projectRoot,
        baseCommit
      );

      if (changedFiles.length === 0) {
        console.log('\n✓ No TypeScript files changed. Working directory is clean.');
        return;
      }

      // Analyze impact
      console.log(`📈 Calculating impact for ${changedFiles.length} changed file(s)...`);
      let report = this.impactAnalysisService.analyzeImpact(graph, changedFiles);

      // Apply threshold filter if specified
      if (options.threshold) {
        report = this.impactAnalysisService.filterByThreshold(
          report,
          options.threshold
        );

        if (report.changedFiles.length === 0) {
          console.log(`\n✓ No changes meet the ${options.threshold} risk threshold.`);
          return;
        }
      }

      // Format and display output
      const format = options.format || 'report';

      if (format === 'json') {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(formatImpactReport(report));
      }
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      process.exit(1);
    }
  }

  @Option({
    flags: '--base <commit>',
    description: 'Base commit to compare against (default: HEAD)',
  })
  parseBase(val: string): string {
    return val;
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

  @Option({
    flags: '--threshold <level>',
    description: 'Only show impacts above this level: LOW, MEDIUM, HIGH, or CRITICAL',
  })
  parseThreshold(val: string): RiskLevel {
    const upper = val.toUpperCase() as RiskLevel;
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(upper)) {
      throw new Error(
        `Invalid threshold: ${val}. Must be LOW, MEDIUM, HIGH, or CRITICAL`
      );
    }
    return upper;
  }
}
