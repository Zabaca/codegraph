import type { GraphData, Edge } from '../interfaces/graph.interface';

export type TraversalDirection = 'forward' | 'reverse';

export interface TraversalResult {
  entityId: string;
  depth: number;
  path: string[];
}

/**
 * Traverse graph using Breadth-First Search
 * @param graph Graph data
 * @param startEntityId Starting entity ID
 * @param direction 'forward' for dependencies, 'reverse' for dependents
 * @param transitive Include all reachable nodes (transitive closure)
 * @returns Array of traversal results with depth and path information
 */
export function traverseBFS(
  graph: GraphData,
  startEntityId: string,
  direction: TraversalDirection = 'forward',
  transitive: boolean = false
): TraversalResult[] {
  // Validate start entity exists
  if (!graph.nodes[startEntityId]) {
    throw new Error(`Entity '${startEntityId}' not found in graph`);
  }

  const visited = new Set<string>();
  const results: TraversalResult[] = [];
  const queue: Array<{ entityId: string; depth: number; path: string[] }> = [
    { entityId: startEntityId, depth: 0, path: [startEntityId] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Skip if already visited
    if (visited.has(current.entityId)) {
      continue;
    }

    visited.add(current.entityId);

    // Don't include the start node in results
    if (current.entityId !== startEntityId) {
      results.push({
        entityId: current.entityId,
        depth: current.depth,
        path: current.path,
      });
    }

    // If not transitive, only process immediate neighbors (depth 0)
    if (!transitive && current.depth > 0) {
      continue;
    }

    // Find neighbors based on direction
    const neighbors = getNeighbors(graph.edges, current.entityId, direction);

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push({
          entityId: neighbor,
          depth: current.depth + 1,
          path: [...current.path, neighbor],
        });
      }
    }
  }

  return results;
}

/**
 * Traverse graph using Depth-First Search
 * @param graph Graph data
 * @param startEntityId Starting entity ID
 * @param direction 'forward' for dependencies, 'reverse' for dependents
 * @param transitive Include all reachable nodes (transitive closure)
 * @returns Array of traversal results with depth and path information
 */
export function traverseDFS(
  graph: GraphData,
  startEntityId: string,
  direction: TraversalDirection = 'forward',
  transitive: boolean = false
): TraversalResult[] {
  // Validate start entity exists
  if (!graph.nodes[startEntityId]) {
    throw new Error(`Entity '${startEntityId}' not found in graph`);
  }

  const visited = new Set<string>();
  const results: TraversalResult[] = [];

  function dfs(
    entityId: string,
    depth: number,
    path: string[]
  ): void {
    // Skip if already visited
    if (visited.has(entityId)) {
      return;
    }

    visited.add(entityId);

    // Don't include the start node in results
    if (entityId !== startEntityId) {
      results.push({
        entityId,
        depth,
        path: [...path],
      });
    }

    // If not transitive, only process immediate neighbors (depth 0)
    if (!transitive && depth > 0) {
      return;
    }

    // Find neighbors based on direction
    const neighbors = getNeighbors(graph.edges, entityId, direction);

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, depth + 1, [...path, neighbor]);
      }
    }
  }

  dfs(startEntityId, 0, [startEntityId]);

  return results;
}

/**
 * Get neighboring entities based on edge direction
 * @param edges Graph edges
 * @param entityId Current entity ID
 * @param direction 'forward' for dependencies (this → target), 'reverse' for dependents (target → this)
 * @returns Array of neighbor entity IDs
 */
function getNeighbors(
  edges: Edge[],
  entityId: string,
  direction: TraversalDirection
): string[] {
  if (direction === 'forward') {
    // Find edges where this entity is the source (dependencies)
    return edges
      .filter((edge) => edge.source === entityId)
      .map((edge) => edge.target);
  } else {
    // Find edges where this entity is the target (dependents)
    return edges
      .filter((edge) => edge.target === entityId)
      .map((edge) => edge.source);
  }
}

/**
 * Build a reverse index for faster dependent lookups
 * @param edges Graph edges
 * @returns Map of entity ID to entities that depend on it
 */
export function buildReverseIndex(
  edges: Edge[]
): Map<string, Set<string>> {
  const reverseIndex = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (!reverseIndex.has(edge.target)) {
      reverseIndex.set(edge.target, new Set());
    }
    reverseIndex.get(edge.target)!.add(edge.source);
  }

  return reverseIndex;
}

/**
 * Build a forward index for faster dependency lookups
 * @param edges Graph edges
 * @returns Map of entity ID to entities it depends on
 */
export function buildForwardIndex(
  edges: Edge[]
): Map<string, Set<string>> {
  const forwardIndex = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (!forwardIndex.has(edge.source)) {
      forwardIndex.set(edge.source, new Set());
    }
    forwardIndex.get(edge.source)!.add(edge.target);
  }

  return forwardIndex;
}

/**
 * Detect if there are circular dependencies in the graph
 * @param graph Graph data
 * @returns Array of cycles found (each cycle is an array of entity IDs)
 */
export function detectCycles(graph: GraphData): string[][] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(entityId: string, path: string[]): void {
    visited.add(entityId);
    recursionStack.add(entityId);

    const neighbors = getNeighbors(graph.edges, entityId, 'forward');

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path, neighbor]);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycles.push(cycle);
      }
    }

    recursionStack.delete(entityId);
  }

  // Check all nodes (graph might be disconnected)
  for (const entityId of Object.keys(graph.nodes)) {
    if (!visited.has(entityId)) {
      dfs(entityId, [entityId]);
    }
  }

  return cycles;
}
