import type { QueryResult, EntityWithMetadata } from '../interfaces/query.interface';
import type { ImpactReport, AffectedEntity, RiskLevel } from '../interfaces/impact.interface';
import type { GraphDiff, ModifiedNode } from '../interfaces/diff.interface';

/**
 * Format query result as a tree structure
 */
export function formatQueryAsTree(result: QueryResult, direction: string): string {
  let output = `\nQuery: ${result.entityId}\n`;
  output += `Type: ${result.type}`;

  if (result.file) {
    output += ` (${result.file}:${result.line})`;
  }

  output += `\n\n${direction === 'dependencies' ? 'Dependencies' : 'Dependents'}:\n`;

  if (result.entities.length === 0) {
    output += `  (none)\n`;
  } else {
    // Group entities by depth for tree structure
    const byDepth = groupByDepth(result.entities);
    const maxDepth = Math.max(...Object.keys(byDepth).map(Number));

    for (let depth = 1; depth <= maxDepth; depth++) {
      const entities = byDepth[depth] || [];
      entities.forEach((entity, index) => {
        const isLast = index === entities.length - 1 && depth === maxDepth;
        const prefix = buildTreePrefix(depth, isLast);
        const location = entity.node && entity.node.file
          ? ` (${entity.node.file}:${entity.node.line})`
          : '';
        const rel = entity.relationship ? ` [${entity.relationship}]` : '';
        output += `${prefix}${entity.entityId}${rel}${location}\n`;
      });
    }

    output += `\nTotal: ${result.totalCount} ${direction} across ${result.fileCount} file(s)\n`;
  }

  return output;
}

/**
 * Format query result as a simple list
 */
export function formatQueryAsList(result: QueryResult): string {
  let output = `\nEntity: ${result.entityId}\n`;
  output += `Type: ${result.type}\n`;

  if (result.file) {
    output += `Location: ${result.file}:${result.line}\n`;
  }

  output += `\nResults:\n`;

  if (result.entities.length === 0) {
    output += `  (none)\n`;
  } else {
    result.entities.forEach((entity, index) => {
      const location = entity.node.file
        ? ` - ${entity.node.file}:${entity.node.line}`
        : '';
      const rel = entity.relationship ? ` [${entity.relationship}]` : '';
      output += `  ${index + 1}. ${entity.entityId}${rel}${location}\n`;
    });

    output += `\nTotal: ${result.totalCount}\n`;
  }

  return output;
}

/**
 * Format impact report
 */
export function formatImpactReport(report: ImpactReport): string {
  let output = '\n=== Impact Analysis ===\n\n';

  // Risk level with color indicators
  output += `Risk Level: ${formatRiskLevel(report.riskLevel)}\n\n`;

  // Changed files
  output += `Changed Files (${report.changedFiles.length}):\n`;
  if (report.changedFiles.length === 0) {
    output += `  (none)\n`;
  } else {
    report.changedFiles.forEach((file) => {
      output += `  • ${file}\n`;
    });
  }

  output += `\n`;

  // Impact metrics
  output += `Potentially Affected:\n`;
  output += `  • Entities: ${report.metrics.affectedEntitiesCount}\n`;
  output += `  • Files: ${report.metrics.affectedFilesCount}\n`;
  output += `  • Max Depth: ${report.metrics.maxDepth}\n`;

  // Breakdown by type
  if (Object.keys(report.metrics.affectedByType).length > 0) {
    output += `\nBreakdown by Type:\n`;
    for (const [type, count] of Object.entries(report.metrics.affectedByType)) {
      output += `  • ${type}: ${count}\n`;
    }
  }

  // Affected entities (top 10)
  if (report.affectedEntities.length > 0) {
    output += `\nTop Affected Entities:\n`;
    const top10 = report.affectedEntities.slice(0, 10);
    top10.forEach((entity) => {
      const location = entity.node.file
        ? ` (${entity.node.file}:${entity.node.line})`
        : '';
      output += `  • ${entity.entityId}${location}\n`;
      output += `    Reason: ${entity.reason} (depth: ${entity.depth})\n`;
    });

    if (report.affectedEntities.length > 10) {
      output += `  ... and ${report.affectedEntities.length - 10} more\n`;
    }
  }

  // Recommendation
  output += `\n${getRiskRecommendation(report.riskLevel)}\n`;

  return output;
}

/**
 * Format graph diff report
 */
export function formatDiffReport(diff: GraphDiff, summaryOnly: boolean = false): string {
  let output = `\n=== Graph Diff ===\n`;
  output += `Comparing: ${diff.commit1} → ${diff.commit2}\n\n`;

  // Summary
  output += `Summary:\n`;
  output += `  Nodes:  +${diff.summary.totalNodesAdded} / -${diff.summary.totalNodesRemoved} / ~${diff.summary.totalNodesModified}\n`;
  output += `  Edges:  +${diff.summary.totalEdgesAdded} / -${diff.summary.totalEdgesRemoved}\n`;

  if (summaryOnly) {
    return output;
  }

  // Added nodes
  if (diff.addedNodes.length > 0) {
    output += `\nAdded Nodes (${diff.addedNodes.length}):\n`;
    diff.addedNodes.forEach((nodeId) => {
      output += `  + ${nodeId}\n`;
    });
  }

  // Removed nodes
  if (diff.removedNodes.length > 0) {
    output += `\nRemoved Nodes (${diff.removedNodes.length}):\n`;
    diff.removedNodes.forEach((nodeId) => {
      output += `  - ${nodeId}\n`;
    });
  }

  // Modified nodes
  if (diff.modifiedNodes.length > 0) {
    output += `\nModified Nodes (${diff.modifiedNodes.length}):\n`;
    diff.modifiedNodes.forEach((mod) => {
      output += `  ~ ${mod.entityId}\n`;
      output += `    Changes: ${mod.changes.join(', ')}\n`;
      if (mod.changes.includes('line')) {
        output += `    Lines: ${mod.before.line}-${mod.before.endLine} → ${mod.after.line}-${mod.after.endLine}\n`;
      }
    });
  }

  // Added edges
  if (diff.addedEdges.length > 0) {
    output += `\nAdded Edges (${diff.addedEdges.length}):\n`;
    diff.addedEdges.slice(0, 10).forEach((edge) => {
      output += `  + ${edge.source} ${edge.relationship} ${edge.target}\n`;
    });
    if (diff.addedEdges.length > 10) {
      output += `  ... and ${diff.addedEdges.length - 10} more\n`;
    }
  }

  // Removed edges
  if (diff.removedEdges.length > 0) {
    output += `\nRemoved Edges (${diff.removedEdges.length}):\n`;
    diff.removedEdges.slice(0, 10).forEach((edge) => {
      output += `  - ${edge.source} ${edge.relationship} ${edge.target}\n`;
    });
    if (diff.removedEdges.length > 10) {
      output += `  ... and ${diff.removedEdges.length - 10} more\n`;
    }
  }

  return output;
}

/**
 * Helper: Group entities by depth
 */
function groupByDepth(entities: EntityWithMetadata[]): Record<number, EntityWithMetadata[]> {
  const grouped: Record<number, EntityWithMetadata[]> = {};

  entities.forEach((entity) => {
    if (!grouped[entity.depth]) {
      grouped[entity.depth] = [];
    }
    grouped[entity.depth].push(entity);
  });

  return grouped;
}

/**
 * Helper: Build tree prefix for visual hierarchy
 */
function buildTreePrefix(depth: number, isLast: boolean): string {
  const indent = '  '.repeat(depth - 1);
  const connector = isLast ? '└─' : '├─';
  return `${indent}${connector} `;
}

/**
 * Helper: Format risk level with indicators
 */
function formatRiskLevel(level: RiskLevel): string {
  const indicators = {
    LOW: '🟢 LOW',
    MEDIUM: '🟡 MEDIUM',
    HIGH: '🟠 HIGH',
    CRITICAL: '🔴 CRITICAL',
  };
  return indicators[level] || level;
}

/**
 * Helper: Get recommendation based on risk level
 */
function getRiskRecommendation(level: RiskLevel): string {
  const recommendations = {
    LOW: '✓ Low impact. Safe to proceed.',
    MEDIUM: '⚠ Moderate impact. Review affected entities before committing.',
    HIGH: '⚠ High impact! Carefully review all affected entities and consider breaking changes.',
    CRITICAL: '⛔ Critical impact! This change affects a large portion of the codebase. Proceed with extreme caution.',
  };
  return recommendations[level] || '';
}
