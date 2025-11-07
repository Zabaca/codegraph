import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { FileScannerService } from '../services/file-scanner.service';
import { GraphReaderService } from '../services/graph-reader.service';
import { GraphQueryService } from '../services/graph-query.service';
import type { OutputFormat, QueryDirection } from '../interfaces/query.interface';
import {
  formatQueryAsTree,
  formatQueryAsList,
} from '../utils/output-formatter.util';

interface QueryCommandOptions {
  dependents?: boolean;
  transitive?: boolean;
  format?: OutputFormat;
}

@Injectable()
@Command({
  name: 'query',
  description: 'Query entity dependencies',
  arguments: '<entity-id>',
  argsDescription: {
    'entity-id': 'Entity ID to query (e.g., "file.ts::ClassName::methodName")',
  },
})
export class QueryCommand extends CommandRunner {
  constructor(
    private readonly fileScannerService: FileScannerService,
    private readonly graphReaderService: GraphReaderService,
    private readonly graphQueryService: GraphQueryService
  ) {
    super();
  }

  async run(inputs: string[], options: QueryCommandOptions): Promise<void> {
    const entityId = inputs[0];

    if (!entityId) {
      console.error('Error: Entity ID is required');
      console.error('Usage: codegraph query <entity-id> [options]');
      process.exit(1);
    }

    try {
      // Get project root
      const projectRoot = this.fileScannerService.getProjectRoot();

      // Load current graph
      console.log('📊 Loading graph...');
      const graph = this.graphReaderService.loadCurrentGraph(projectRoot);

      // Determine query parameters
      const direction: QueryDirection = options.dependents
        ? 'dependents'
        : 'dependencies';
      const transitive = options.transitive || false;
      const format = options.format || 'tree';

      // Perform query
      const result = this.graphQueryService.query(
        graph,
        entityId,
        direction,
        transitive
      );

      // Format and display output
      if (format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else if (format === 'list') {
        console.log(formatQueryAsList(result));
      } else {
        // tree format (default)
        console.log(formatQueryAsTree(result, direction));
      }
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      process.exit(1);
    }
  }

  @Option({
    flags: '--dependents',
    description: 'Show entities that depend on this entity (default: show dependencies)',
  })
  parseDependents(): boolean {
    return true;
  }

  @Option({
    flags: '--transitive',
    description: 'Include transitive dependencies/dependents',
  })
  parseTransitive(): boolean {
    return true;
  }

  @Option({
    flags: '--format <format>',
    description: 'Output format: json, tree, or list (default: tree)',
  })
  parseFormat(val: string): OutputFormat {
    if (val !== 'json' && val !== 'tree' && val !== 'list') {
      throw new Error(`Invalid format: ${val}. Must be json, tree, or list`);
    }
    return val;
  }
}
