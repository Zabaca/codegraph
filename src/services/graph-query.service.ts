import { Injectable } from '@nestjs/common';
import type { GraphData, Node, Edge } from '../interfaces/graph.interface';
import type { QueryResult, EntityWithMetadata, QueryDirection } from '../interfaces/query.interface';
import { traverseBFS } from '../utils/graph-traversal.util';
import type { TraversalDirection } from '../utils/graph-traversal.util';

@Injectable()
export class GraphQueryService {
  /**
   * Get entity metadata by ID
   * @param graph Graph data
   * @param entityId Entity ID to look up
   * @returns Node or null if not found
   */
  getEntity(graph: GraphData, entityId: string): Node | null {
    return graph.nodes[entityId] || null;
  }

  /**
   * Get all entities (classes, methods, functions) in a specific file
   * @param graph Graph data
   * @param filePath File path to search
   * @returns Array of entity IDs in the file
   */
  findEntitiesByFile(graph: GraphData, filePath: string): string[] {
    const entities: string[] = [];

    for (const [entityId, node] of Object.entries(graph.nodes)) {
      // Match file entities exactly, or match entities belonging to the file
      if (entityId === filePath || node.file === filePath) {
        entities.push(entityId);
      }
    }

    return entities;
  }

  /**
   * Get dependencies for an entity (what this entity depends on)
   * @param graph Graph data
   * @param entityId Starting entity ID
   * @param transitive Include transitive dependencies
   * @returns Array of entity IDs this entity depends on
   */
  getDependencies(
    graph: GraphData,
    entityId: string,
    transitive: boolean = false
  ): EntityWithMetadata[] {
    const results = traverseBFS(graph, entityId, 'forward', transitive);

    return results
      .filter((result) => graph.nodes[result.entityId]) // Filter out entities without nodes
      .map((result) => ({
        entityId: result.entityId,
        node: graph.nodes[result.entityId],
        depth: result.depth,
        path: result.path,
        relationship: this.getRelationship(graph, entityId, result.entityId),
      }));
  }

  /**
   * Get dependents for an entity (what depends on this entity)
   * @param graph Graph data
   * @param entityId Starting entity ID
   * @param transitive Include transitive dependents
   * @returns Array of entity IDs that depend on this entity
   */
  getDependents(
    graph: GraphData,
    entityId: string,
    transitive: boolean = false
  ): EntityWithMetadata[] {
    const results = traverseBFS(graph, entityId, 'reverse', transitive);

    return results
      .filter((result) => graph.nodes[result.entityId]) // Filter out entities without nodes
      .map((result) => ({
        entityId: result.entityId,
        node: graph.nodes[result.entityId],
        depth: result.depth,
        path: result.path,
        relationship: this.getRelationship(graph, result.entityId, entityId),
      }));
  }

  /**
   * Perform a full query with formatted results
   * @param graph Graph data
   * @param entityId Entity ID to query
   * @param direction Query direction (dependencies or dependents)
   * @param transitive Include transitive relationships
   * @returns Formatted query result
   */
  query(
    graph: GraphData,
    entityId: string,
    direction: QueryDirection,
    transitive: boolean
  ): QueryResult {
    const entity = this.getEntity(graph, entityId);

    if (!entity) {
      throw new Error(`Entity '${entityId}' not found in graph`);
    }

    const entities =
      direction === 'dependencies'
        ? this.getDependencies(graph, entityId, transitive)
        : this.getDependents(graph, entityId, transitive);

    // Count unique files
    const uniqueFiles = new Set<string>();
    entities.forEach((e) => {
      if (e.node.file) {
        uniqueFiles.add(e.node.file);
      }
    });

    return {
      entityId,
      type: entity.type,
      file: entity.file,
      line: entity.line,
      entities,
      totalCount: entities.length,
      fileCount: uniqueFiles.size,
    };
  }

  /**
   * Get the relationship type between two entities
   * @param graph Graph data
   * @param sourceId Source entity ID
   * @param targetId Target entity ID
   * @returns Relationship type or undefined if no direct edge
   */
  private getRelationship(
    graph: GraphData,
    sourceId: string,
    targetId: string
  ): string | undefined {
    const edge = graph.edges.find(
      (e) => e.source === sourceId && e.target === targetId
    );
    return edge?.relationship;
  }

  /**
   * Get all edges involving an entity (as source or target)
   * @param graph Graph data
   * @param entityId Entity ID
   * @returns Array of edges
   */
  getEdgesForEntity(graph: GraphData, entityId: string): Edge[] {
    return graph.edges.filter(
      (edge) => edge.source === entityId || edge.target === entityId
    );
  }

  /**
   * Check if entity exists in graph
   * @param graph Graph data
   * @param entityId Entity ID to check
   * @returns True if entity exists
   */
  entityExists(graph: GraphData, entityId: string): boolean {
    return entityId in graph.nodes;
  }

  /**
   * Get all entities of a specific type
   * @param graph Graph data
   * @param type Node type (file, class, method, function, interface)
   * @returns Array of entity IDs
   */
  getEntitiesByType(graph: GraphData, type: string): string[] {
    return Object.entries(graph.nodes)
      .filter(([, node]) => node.type === type)
      .map(([entityId]) => entityId);
  }
}
