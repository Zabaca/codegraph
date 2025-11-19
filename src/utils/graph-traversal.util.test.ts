import { describe, it, expect } from 'bun:test';
import { traverseBFS, traverseDFS } from './graph-traversal.util';
import type { GraphData } from '../interfaces/graph.interface';

describe('Graph Traversal - Transitive Dependents', () => {
  // Create a test graph:
  // A -> B -> C -> D
  //   -> E -> F
  //
  // Dependencies (what A depends on):
  // - Direct: B, E
  // - Transitive: B, E, C, F, D
  //
  // Dependents (what depends on D):
  // - Direct: C
  // - Transitive: C, B, A
  const testGraph: GraphData = {
    version: '1.0.0',
    commitHash: 'test',
    timestamp: new Date().toISOString(),
    nodes: {
      'A': { type: 'file', file: 'A.ts' },
      'B': { type: 'file', file: 'B.ts' },
      'C': { type: 'file', file: 'C.ts' },
      'D': { type: 'file', file: 'D.ts' },
      'E': { type: 'file', file: 'E.ts' },
      'F': { type: 'file', file: 'F.ts' },
    },
    edges: [
      { source: 'A', relationship: 'imports', target: 'B' },
      { source: 'A', relationship: 'imports', target: 'E' },
      { source: 'B', relationship: 'imports', target: 'C' },
      { source: 'C', relationship: 'imports', target: 'D' },
      { source: 'E', relationship: 'imports', target: 'F' },
    ],
  };

  describe('BFS - Dependents (reverse traversal)', () => {
    it('should return only direct dependents when transitive=false', () => {
      const results = traverseBFS(testGraph, 'D', 'reverse', false);

      expect(results).toHaveLength(1);
      expect(results[0].entityId).toBe('C');
      expect(results[0].depth).toBe(1);
    });

    it('should return all transitive dependents when transitive=true', () => {
      const results = traverseBFS(testGraph, 'D', 'reverse', true);

      expect(results).toHaveLength(3);

      const entityIds = results.map(r => r.entityId);
      expect(entityIds).toContain('C'); // depth 1
      expect(entityIds).toContain('B'); // depth 2
      expect(entityIds).toContain('A'); // depth 3

      // Verify depth tracking
      const depthMap = new Map(results.map(r => [r.entityId, r.depth]));
      expect(depthMap.get('C')).toBe(1);
      expect(depthMap.get('B')).toBe(2);
      expect(depthMap.get('A')).toBe(3);
    });

    it('should include path information for transitive dependents', () => {
      const results = traverseBFS(testGraph, 'D', 'reverse', true);

      const resultA = results.find(r => r.entityId === 'A');
      expect(resultA?.path).toEqual(['D', 'C', 'B', 'A']);

      const resultB = results.find(r => r.entityId === 'B');
      expect(resultB?.path).toEqual(['D', 'C', 'B']);

      const resultC = results.find(r => r.entityId === 'C');
      expect(resultC?.path).toEqual(['D', 'C']);
    });

    it('should return empty array for entity with no dependents', () => {
      const results = traverseBFS(testGraph, 'A', 'reverse', true);
      expect(results).toHaveLength(0);
    });

    it('should handle intermediate nodes correctly', () => {
      const results = traverseBFS(testGraph, 'B', 'reverse', true);

      expect(results).toHaveLength(1);
      expect(results[0].entityId).toBe('A');
      expect(results[0].depth).toBe(1);
    });
  });

  describe('BFS - Dependencies (forward traversal)', () => {
    it('should return only direct dependencies when transitive=false', () => {
      const results = traverseBFS(testGraph, 'A', 'forward', false);

      expect(results).toHaveLength(2);

      const entityIds = results.map(r => r.entityId);
      expect(entityIds).toContain('B');
      expect(entityIds).toContain('E');

      results.forEach(r => expect(r.depth).toBe(1));
    });

    it('should return all transitive dependencies when transitive=true', () => {
      const results = traverseBFS(testGraph, 'A', 'forward', true);

      expect(results).toHaveLength(5);

      const entityIds = results.map(r => r.entityId);
      expect(entityIds).toContain('B'); // depth 1
      expect(entityIds).toContain('E'); // depth 1
      expect(entityIds).toContain('C'); // depth 2
      expect(entityIds).toContain('F'); // depth 2
      expect(entityIds).toContain('D'); // depth 3

      // Verify depth tracking
      const depthMap = new Map(results.map(r => [r.entityId, r.depth]));
      expect(depthMap.get('B')).toBe(1);
      expect(depthMap.get('E')).toBe(1);
      expect(depthMap.get('C')).toBe(2);
      expect(depthMap.get('F')).toBe(2);
      expect(depthMap.get('D')).toBe(3);
    });

    it('should include path information for transitive dependencies', () => {
      const results = traverseBFS(testGraph, 'A', 'forward', true);

      const resultD = results.find(r => r.entityId === 'D');
      expect(resultD?.path).toEqual(['A', 'B', 'C', 'D']);

      const resultF = results.find(r => r.entityId === 'F');
      expect(resultF?.path).toEqual(['A', 'E', 'F']);
    });
  });

  describe('DFS - Transitive traversal', () => {
    it('should produce same results as BFS for dependents', () => {
      const bfsResults = traverseBFS(testGraph, 'D', 'reverse', true);
      const dfsResults = traverseDFS(testGraph, 'D', 'reverse', true);

      expect(dfsResults).toHaveLength(bfsResults.length);

      const bfsIds = new Set(bfsResults.map(r => r.entityId));
      const dfsIds = new Set(dfsResults.map(r => r.entityId));

      expect(bfsIds).toEqual(dfsIds);
    });

    it('should produce same results as BFS for dependencies', () => {
      const bfsResults = traverseBFS(testGraph, 'A', 'forward', true);
      const dfsResults = traverseDFS(testGraph, 'A', 'forward', true);

      expect(dfsResults).toHaveLength(bfsResults.length);

      const bfsIds = new Set(bfsResults.map(r => r.entityId));
      const dfsIds = new Set(dfsResults.map(r => r.entityId));

      expect(bfsIds).toEqual(dfsIds);
    });
  });

  describe('Cycle handling', () => {
    it('should handle circular dependencies without infinite loop', () => {
      const cyclicGraph: GraphData = {
        version: '1.0.0',
        commitHash: 'test',
        timestamp: new Date().toISOString(),
        nodes: {
          'A': { type: 'file', file: 'A.ts' },
          'B': { type: 'file', file: 'B.ts' },
          'C': { type: 'file', file: 'C.ts' },
        },
        edges: [
          { source: 'A', relationship: 'imports', target: 'B' },
          { source: 'B', relationship: 'imports', target: 'C' },
          { source: 'C', relationship: 'imports', target: 'A' }, // Cycle!
        ],
      };

      const results = traverseBFS(cyclicGraph, 'A', 'forward', true);

      // Should visit each node only once despite the cycle
      expect(results).toHaveLength(2);

      const entityIds = results.map(r => r.entityId);
      expect(entityIds).toContain('B');
      expect(entityIds).toContain('C');
    });

    it('should handle self-referencing entities', () => {
      const selfRefGraph: GraphData = {
        version: '1.0.0',
        commitHash: 'test',
        timestamp: new Date().toISOString(),
        nodes: {
          'A': { type: 'file', file: 'A.ts' },
          'B': { type: 'file', file: 'B.ts' },
        },
        edges: [
          { source: 'A', relationship: 'imports', target: 'B' },
          { source: 'A', relationship: 'imports', target: 'A' }, // Self-reference
        ],
      };

      const results = traverseBFS(selfRefGraph, 'A', 'forward', true);

      expect(results).toHaveLength(1);
      expect(results[0].entityId).toBe('B');
    });
  });

  describe('Edge cases', () => {
    it('should throw error for non-existent entity', () => {
      expect(() => {
        traverseBFS(testGraph, 'NonExistent', 'forward', false);
      }).toThrow("Entity 'NonExistent' not found in graph");
    });

    it('should handle empty graph edges', () => {
      const emptyGraph: GraphData = {
        version: '1.0.0',
        commitHash: 'test',
        timestamp: new Date().toISOString(),
        nodes: {
          'A': { type: 'file', file: 'A.ts' },
        },
        edges: [],
      };

      const results = traverseBFS(emptyGraph, 'A', 'forward', true);
      expect(results).toHaveLength(0);
    });

    it('should handle disconnected graph components', () => {
      const disconnectedGraph: GraphData = {
        version: '1.0.0',
        commitHash: 'test',
        timestamp: new Date().toISOString(),
        nodes: {
          'A': { type: 'file', file: 'A.ts' },
          'B': { type: 'file', file: 'B.ts' },
          'C': { type: 'file', file: 'C.ts' }, // Disconnected
        },
        edges: [
          { source: 'A', relationship: 'imports', target: 'B' },
          // C is not connected to anything
        ],
      };

      const results = traverseBFS(disconnectedGraph, 'A', 'forward', true);

      expect(results).toHaveLength(1);
      expect(results[0].entityId).toBe('B');
    });
  });

  describe('Real-world scenario: Multi-level dependent chain', () => {
    it('should correctly identify all files affected by a util change', () => {
      // Simulates: utils.ts <- service.ts <- controller.ts <- module.ts <- app.ts
      const realWorldGraph: GraphData = {
        version: '1.0.0',
        commitHash: 'test',
        timestamp: new Date().toISOString(),
        nodes: {
          'src/utils/helpers.ts': { type: 'file', file: 'src/utils/helpers.ts' },
          'src/services/user.service.ts': { type: 'file', file: 'src/services/user.service.ts' },
          'src/services/auth.service.ts': { type: 'file', file: 'src/services/auth.service.ts' },
          'src/controllers/user.controller.ts': { type: 'file', file: 'src/controllers/user.controller.ts' },
          'src/modules/user.module.ts': { type: 'file', file: 'src/modules/user.module.ts' },
          'src/app.ts': { type: 'file', file: 'src/app.ts' },
        },
        edges: [
          { source: 'src/services/user.service.ts', relationship: 'imports', target: 'src/utils/helpers.ts' },
          { source: 'src/services/auth.service.ts', relationship: 'imports', target: 'src/utils/helpers.ts' },
          { source: 'src/controllers/user.controller.ts', relationship: 'imports', target: 'src/services/user.service.ts' },
          { source: 'src/modules/user.module.ts', relationship: 'imports', target: 'src/controllers/user.controller.ts' },
          { source: 'src/modules/user.module.ts', relationship: 'imports', target: 'src/services/auth.service.ts' },
          { source: 'src/app.ts', relationship: 'imports', target: 'src/modules/user.module.ts' },
        ],
      };

      // Query: What would be affected if I change helpers.ts?
      const directDependents = traverseBFS(realWorldGraph, 'src/utils/helpers.ts', 'reverse', false);
      const allDependents = traverseBFS(realWorldGraph, 'src/utils/helpers.ts', 'reverse', true);

      // Direct dependents: just the services that import it
      expect(directDependents).toHaveLength(2);
      expect(directDependents.map(r => r.entityId)).toContain('src/services/user.service.ts');
      expect(directDependents.map(r => r.entityId)).toContain('src/services/auth.service.ts');

      // Transitive dependents: all the way up to app.ts
      expect(allDependents).toHaveLength(5);
      expect(allDependents.map(r => r.entityId)).toContain('src/services/user.service.ts');
      expect(allDependents.map(r => r.entityId)).toContain('src/services/auth.service.ts');
      expect(allDependents.map(r => r.entityId)).toContain('src/controllers/user.controller.ts');
      expect(allDependents.map(r => r.entityId)).toContain('src/modules/user.module.ts');
      expect(allDependents.map(r => r.entityId)).toContain('src/app.ts');

      // Verify depth information for impact analysis
      // Note: BFS finds shortest path, so module is reached via auth.service (depth 2)
      // rather than via user.service -> controller (depth 3)
      const depthMap = new Map(allDependents.map(r => [r.entityId, r.depth]));
      expect(depthMap.get('src/services/user.service.ts')).toBe(1);
      expect(depthMap.get('src/services/auth.service.ts')).toBe(1);
      expect(depthMap.get('src/controllers/user.controller.ts')).toBe(2);
      expect(depthMap.get('src/modules/user.module.ts')).toBe(2); // Shortest path via auth.service
      expect(depthMap.get('src/app.ts')).toBe(3);
    });
  });
});
