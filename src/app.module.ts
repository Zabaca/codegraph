import { Module } from '@nestjs/common';
import { UpdateCommand } from './commands/update.command';
import { QueryCommand } from './commands/query.command';
import { ImpactCommand } from './commands/impact.command';
import { DiffCommand } from './commands/diff.command';
import { FileScannerService } from './services/file-scanner.service';
import { ParserService } from './services/parser.service';
import { GraphBuilderService } from './services/graph-builder.service';
import { GitService } from './services/git.service';
import { GraphReaderService } from './services/graph-reader.service';
import { GraphQueryService } from './services/graph-query.service';
import { ImpactAnalysisService } from './services/impact-analysis.service';
import { GraphDiffService } from './services/graph-diff.service';

@Module({
  providers: [
    // Commands
    UpdateCommand,
    QueryCommand,
    ImpactCommand,
    DiffCommand,
    // Services
    FileScannerService,
    ParserService,
    GraphBuilderService,
    GitService,
    GraphReaderService,
    GraphQueryService,
    ImpactAnalysisService,
    GraphDiffService,
  ],
})
export class AppModule {}
