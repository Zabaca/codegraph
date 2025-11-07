import { Module } from '@nestjs/common';
import { UpdateCommand } from './commands/update.command';

@Module({
  providers: [UpdateCommand],
})
export class AppModule {}
