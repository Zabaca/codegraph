import { Module } from '@nestjs/common';
import { UpdateCommand } from './commands/update.command';
import { FileScannerService } from './services/file-scanner.service';
import { ParserService } from './services/parser.service';
import { GraphBuilderService } from './services/graph-builder.service';
import { GitService } from './services/git.service';

@Module({
  providers: [
    UpdateCommand,
    FileScannerService,
    ParserService,
    GraphBuilderService,
    GitService,
  ],
})
export class AppModule {}
