import { Injectable } from '@nestjs/common';
import type { GraphData, NodeType } from '../interfaces/graph.interface';
import type {
  ImpactReport,
  ImpactMetrics,
  AffectedEntity,
  RiskLevel,
} from '../interfaces/impact.interface';
import { GraphQueryService } from './graph-query.service';

@Injectable()
export class ImpactAnalysisService {
  constructor(private readonly graphQueryService: GraphQueryService) {}

  /**
   * Analyze the impact of changed files
   * @param graph Current graph data
   * @param changedFiles Array of changed file paths
   * @returns Impact report with affected entities and metrics
   */
  analyzeImpact(graph: GraphData, changedFiles: string[]): ImpactReport {
    if (changedFiles.length === 0) {
      return this.createEmptyReport();
    }

    const affectedEntities: AffectedEntity[] = [];
    const affectedFiles = new Set<string>();
    const affectedByType: Record<NodeType, number> = {
      file: 0,
      class: 0,
      method: 0,
      function: 0,
      interface: 0,
    };

    let maxDepth = 0;

    // For each changed file, find all entities and their dependents
    for (const changedFile of changedFiles) {
      // Find all entities in the changed file
      const entitiesInFile = this.graphQueryService.findEntitiesByFile(
        graph,
        changedFile
      );

      for (const entityId of entitiesInFile) {
        // Get all dependents (entities that depend on this one)
        const dependents = this.graphQueryService.getDependents(
          graph,
          entityId,
          true // transitive
        );

        for (const dependent of dependents) {
          // Track affected entity
          affectedEntities.push({
            entityId: dependent.entityId,
            node: dependent.node,
            reason: `Depends on ${entityId} in ${changedFile}`,
            depth: dependent.depth,
            changedBy: changedFile,
          });

          // Track affected file
          if (dependent.node.file) {
            affectedFiles.add(dependent.node.file);
          }

          // Track by type
          if (dependent.node.type in affectedByType) {
            affectedByType[dependent.node.type as NodeType]++;
          }

          // Track max depth
          if (dependent.depth > maxDepth) {
            maxDepth = dependent.depth;
          }
        }
      }
    }

    // Calculate metrics
    const metrics: ImpactMetrics = {
      changedFilesCount: changedFiles.length,
      affectedEntitiesCount: affectedEntities.length,
      affectedFilesCount: affectedFiles.size,
      affectedByType,
      maxDepth,
    };

    // Calculate risk level
    const riskLevel = this.calculateRiskLevel(metrics);

    return {
      changedFiles,
      affectedEntities,
      metrics,
      riskLevel,
    };
  }

  /**
   * Calculate risk level based on impact metrics
   * @param metrics Impact metrics
   * @returns Risk level (LOW, MEDIUM, HIGH, CRITICAL)
   */
  private calculateRiskLevel(metrics: ImpactMetrics): RiskLevel {
    // Calculate risk score
    const fileScore = metrics.affectedFilesCount * 10;
    const entityScore = metrics.affectedEntitiesCount * 2;
    const depthScore = metrics.maxDepth * 5;

    const totalScore = fileScore + entityScore + depthScore;

    // Determine risk level
    if (totalScore < 20) {
      return 'LOW';
    } else if (totalScore < 50) {
      return 'MEDIUM';
    } else if (totalScore < 100) {
      return 'HIGH';
    } else {
      return 'CRITICAL';
    }
  }

  /**
   * Create an empty impact report (no changes)
   * @returns Empty impact report
   */
  private createEmptyReport(): ImpactReport {
    return {
      changedFiles: [],
      affectedEntities: [],
      metrics: {
        changedFilesCount: 0,
        affectedEntitiesCount: 0,
        affectedFilesCount: 0,
        affectedByType: {
          file: 0,
          class: 0,
          method: 0,
          function: 0,
          interface: 0,
        },
        maxDepth: 0,
      },
      riskLevel: 'LOW',
    };
  }

  /**
   * Filter entities by risk threshold
   * @param report Impact report
   * @param threshold Minimum risk level to include
   * @returns Filtered report
   */
  filterByThreshold(report: ImpactReport, threshold: RiskLevel): ImpactReport {
    const thresholdLevels: Record<RiskLevel, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
    };

    const reportLevel = thresholdLevels[report.riskLevel];
    const minLevel = thresholdLevels[threshold];

    // If report risk is below threshold, return empty report
    if (reportLevel < minLevel) {
      return this.createEmptyReport();
    }

    return report;
  }
}
