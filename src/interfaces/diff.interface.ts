import { Node, Edge } from './graph.interface';

export interface GraphDiff {
  commit1: string;
  commit2: string;
  addedNodes: string[];
  removedNodes: string[];
  modifiedNodes: ModifiedNode[];
  addedEdges: Edge[];
  removedEdges: Edge[];
  summary: DiffSummary;
}

export interface ModifiedNode {
  entityId: string;
  before: Node;
  after: Node;
  changes: NodeChange[];
}

export type NodeChange = 'line' | 'endLine' | 'type' | 'file';

export interface DiffSummary {
  totalNodesAdded: number;
  totalNodesRemoved: number;
  totalNodesModified: number;
  totalEdgesAdded: number;
  totalEdgesRemoved: number;
}

export interface DiffOptions {
  summary: boolean;
  nodesOnly: boolean;
  edgesOnly: boolean;
  format: 'json' | 'report';
}
