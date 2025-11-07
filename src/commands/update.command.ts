import { Command, CommandRunner } from 'nest-commander';

@Command({
  name: 'update',
  description: 'Build/update graph from current code',
})
export class UpdateCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('not implemented');
  }
}
