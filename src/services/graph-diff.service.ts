import { Injectable } from '@nestjs/common';
import type { GraphData, Node, Edge } from '../interfaces/graph.interface';
import type {
  GraphDiff,
  ModifiedNode,
  NodeChange,
  DiffSummary,
} from '../interfaces/diff.interface';

@Injectable()
export class GraphDiffService {
  /**
   * Compare two graphs and identify differences
   * @param graph1 First graph (older)
   * @param graph2 Second graph (newer)
   * @returns Graph diff with added, removed, and modified nodes/edges
   */
  compareGraphs(graph1: GraphData, graph2: GraphData): GraphDiff {
    const nodes1 = new Set(Object.keys(graph1.nodes));
    const nodes2 = new Set(Object.keys(graph2.nodes));

    // Find added and removed nodes
    const addedNodes = Array.from(nodes2).filter((n) => !nodes1.has(n));
    const removedNodes = Array.from(nodes1).filter((n) => !nodes2.has(n));

    // Find modified nodes (nodes that exist in both but have changes)
    const commonNodes = Array.from(nodes1).filter((n) => nodes2.has(n));
    const modifiedNodes = this.findModifiedNodes(
      graph1,
      graph2,
      commonNodes
    );

    // Find added and removed edges
    const { addedEdges, removedEdges } = this.compareEdges(
      graph1.edges,
      graph2.edges
    );

    // Calculate summary
    const summary: DiffSummary = {
      totalNodesAdded: addedNodes.length,
      totalNodesRemoved: removedNodes.length,
      totalNodesModified: modifiedNodes.length,
      totalEdgesAdded: addedEdges.length,
      totalEdgesRemoved: removedEdges.length,
    };

    return {
      commit1: graph1.commitHash,
      commit2: graph2.commitHash,
      addedNodes,
      removedNodes,
      modifiedNodes,
      addedEdges,
      removedEdges,
      summary,
    };
  }

  /**
   * Find nodes that have been modified between two graphs
   * @param graph1 First graph
   * @param graph2 Second graph
   * @param commonNodes Nodes that exist in both graphs
   * @returns Array of modified nodes with change details
   */
  private findModifiedNodes(
    graph1: GraphData,
    graph2: GraphData,
    commonNodes: string[]
  ): ModifiedNode[] {
    const modifiedNodes: ModifiedNode[] = [];

    for (const nodeId of commonNodes) {
      const node1 = graph1.nodes[nodeId];
      const node2 = graph2.nodes[nodeId];

      const changes = this.detectNodeChanges(node1, node2);

      if (changes.length > 0) {
        modifiedNodes.push({
          entityId: nodeId,
          before: node1,
          after: node2,
          changes,
        });
      }
    }

    return modifiedNodes;
  }

  /**
   * Detect specific changes between two node versions
   * @param node1 Old node
   * @param node2 New node
   * @returns Array of change types
   */
  private detectNodeChanges(node1: Node, node2: Node): NodeChange[] {
    const changes: NodeChange[] = [];

    if (node1.line !== node2.line) {
      changes.push('line');
    }

    if (node1.endLine !== node2.endLine) {
      changes.push('endLine');
    }

    if (node1.type !== node2.type) {
      changes.push('type');
    }

    if (node1.file !== node2.file) {
      changes.push('file');
    }

    return changes;
  }

  /**
   * Compare edges between two graphs
   * @param edges1 Edges from first graph
   * @param edges2 Edges from second graph
   * @returns Added and removed edges
   */
  private compareEdges(
    edges1: Edge[],
    edges2: Edge[]
  ): { addedEdges: Edge[]; removedEdges: Edge[] } {
    // Convert edges to string keys for comparison
    const edges1Set = new Set(edges1.map(this.edgeToString));
    const edges2Set = new Set(edges2.map(this.edgeToString));

    // Find added edges
    const addedEdges = edges2.filter((edge) => {
      const edgeStr = this.edgeToString(edge);
      return !edges1Set.has(edgeStr);
    });

    // Find removed edges
    const removedEdges = edges1.filter((edge) => {
      const edgeStr = this.edgeToString(edge);
      return !edges2Set.has(edgeStr);
    });

    return { addedEdges, removedEdges };
  }

  /**
   * Convert edge to string for comparison
   * @param edge Edge object
   * @returns String representation
   */
  private edgeToString(edge: Edge): string {
    return `${edge.source}::${edge.relationship}::${edge.target}`;
  }

  /**
   * Get statistics about the diff
   * @param diff Graph diff
   * @returns Human-readable statistics
   */
  getStats(diff: GraphDiff): string {
    const { summary } = diff;

    return `
Nodes:  +${summary.totalNodesAdded} / -${summary.totalNodesRemoved} / ~${summary.totalNodesModified}
Edges:  +${summary.totalEdgesAdded} / -${summary.totalEdgesRemoved}
`.trim();
  }

  /**
   * Check if two graphs are identical
   * @param graph1 First graph
   * @param graph2 Second graph
   * @returns True if graphs are identical
   */
  areGraphsIdentical(graph1: GraphData, graph2: GraphData): boolean {
    const diff = this.compareGraphs(graph1, graph2);

    return (
      diff.summary.totalNodesAdded === 0 &&
      diff.summary.totalNodesRemoved === 0 &&
      diff.summary.totalNodesModified === 0 &&
      diff.summary.totalEdgesAdded === 0 &&
      diff.summary.totalEdgesRemoved === 0
    );
  }
}
