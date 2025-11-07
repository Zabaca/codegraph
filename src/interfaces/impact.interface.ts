import { Node, NodeType } from './graph.interface';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ImpactReport {
  changedFiles: string[];
  affectedEntities: AffectedEntity[];
  metrics: ImpactMetrics;
  riskLevel: RiskLevel;
}

export interface AffectedEntity {
  entityId: string;
  node: Node;
  reason: string;
  depth: number;
  changedBy: string; // Which changed file caused this impact
}

export interface ImpactMetrics {
  changedFilesCount: number;
  affectedEntitiesCount: number;
  affectedFilesCount: number;
  affectedByType: Record<NodeType, number>;
  maxDepth: number;
}

export interface ImpactOptions {
  baseCommit?: string;
  format: 'json' | 'report';
  threshold?: RiskLevel;
}
