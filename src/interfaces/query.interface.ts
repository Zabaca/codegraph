import { Node } from './graph.interface';

export type QueryDirection = 'dependencies' | 'dependents';
export type OutputFormat = 'json' | 'tree' | 'list';

export interface QueryOptions {
  direction: QueryDirection;
  transitive: boolean;
  format: OutputFormat;
}

export interface QueryResult {
  entityId: string;
  type: string;
  file?: string;
  line?: number;
  entities: EntityWithMetadata[];
  totalCount: number;
  fileCount: number;
}

export interface EntityWithMetadata {
  entityId: string;
  node: Node;
  depth: number;
  path: string[];
  relationship?: string;
}
