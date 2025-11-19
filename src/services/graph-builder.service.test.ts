import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { GraphBuilderService } from './graph-builder.service';
import type { ParsedFile } from '../interfaces/graph.interface';
import * as fs from 'fs';

describe('GraphBuilderService - Orphaned Edge Detection', () => {
  let service: GraphBuilderService;
  let existsSyncSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    service = new GraphBuilderService();

    // Mock fs.existsSync to return true for test file paths
    // This simulates all test files existing on disk
    existsSyncSpy = spyOn(fs, 'existsSync').mockImplementation((path: string) => {
      // Return true for any .ts or .tsx file path used in tests
      return typeof path === 'string' && (path.endsWith('.ts') || path.endsWith('.tsx'));
    });
  });

  afterEach(() => {
    // Restore the fs.existsSync mock after each test
    existsSyncSpy?.mockRestore();
  });

  describe('buildGraph - normal case', () => {
    it('should create edges when both source and target files are parsed', () => {
      const parsedFiles: ParsedFile[] = [
        {
          filePath: 'src/file-a.ts',
          classes: [],
          functions: [],
          imports: [{ from: './file-b', isTypeOnly: false }],
        },
        {
          filePath: 'src/file-b.ts',
          classes: [],
          functions: [],
          imports: [],
        },
      ];

      const graph = service.buildGraph(parsedFiles, 'abc123', '/project');

      // Both files should be nodes
      expect(graph.nodes['src/file-a.ts']).toBeDefined();
      expect(graph.nodes['src/file-b.ts']).toBeDefined();

      // Edge should exist from A to B
      const edge = graph.edges.find(
        e => e.source === 'src/file-a.ts' && e.target === 'src/file-b.ts'
      );
      expect(edge).toBeDefined();
      expect(edge?.relationship).toBe('imports');
    });
  });

  describe('buildGraph - orphaned edge prevention', () => {
    it('should NOT create edge when target file is not parsed', () => {
      const parsedFiles: ParsedFile[] = [
        {
          filePath: 'src/file-a.ts',
          classes: [],
          functions: [],
          imports: [
            { from: './file-b', isTypeOnly: false }, // file-b is imported but not parsed
          ],
        },
      ];

      // Mock console.warn to capture the warning
      const warnSpy = spyOn(console, 'warn');

      const graph = service.buildGraph(parsedFiles, 'abc123', '/project');

      // file-a should be a node
      expect(graph.nodes['src/file-a.ts']).toBeDefined();

      // file-b should NOT be a node (wasn't parsed)
      expect(graph.nodes['src/file-b.ts']).toBeUndefined();

      // Edge should NOT exist
      const edge = graph.edges.find(
        e => e.source === 'src/file-a.ts' && e.target === 'src/file-b.ts'
      );
      expect(edge).toBeUndefined();

      // Warning should have been logged
      expect(warnSpy).toHaveBeenCalled();
      const warnCalls = warnSpy.mock.calls.map(call => call[0]);
      const hasSkippedEdgeWarning = warnCalls.some(msg =>
        msg.includes('Skipped') && msg.includes('edges')
      );
      expect(hasSkippedEdgeWarning).toBe(true);

      warnSpy.mockRestore();
    });

    it('should report multiple skipped edges to the same target', () => {
      const parsedFiles: ParsedFile[] = [
        {
          filePath: 'src/file-a.ts',
          classes: [],
          functions: [],
          imports: [{ from: './missing', isTypeOnly: false }],
        },
        {
          filePath: 'src/file-b.ts',
          classes: [],
          functions: [],
          imports: [{ from: './missing', isTypeOnly: false }],
        },
      ];

      const warnSpy = spyOn(console, 'warn');

      const graph = service.buildGraph(parsedFiles, 'abc123', '/project');

      // No edges should be created to missing file
      const edgesToMissing = graph.edges.filter(e => e.target === 'src/missing.ts');
      expect(edgesToMissing).toHaveLength(0);

      // Warning should mention both source files
      expect(warnSpy).toHaveBeenCalled();
      const warnCalls = warnSpy.mock.calls.map(call => call[0]).join('\n');
      expect(warnCalls).toContain('src/missing.ts');
      expect(warnCalls).toContain('src/file-a.ts');
      expect(warnCalls).toContain('src/file-b.ts');

      warnSpy.mockRestore();
    });

    it('should skip type-only imports regardless of whether target exists', () => {
      const parsedFiles: ParsedFile[] = [
        {
          filePath: 'src/file-a.ts',
          classes: [],
          functions: [],
          imports: [
            { from: './types', isTypeOnly: true }, // Type-only import
          ],
        },
      ];

      const warnSpy = spyOn(console, 'warn');

      const graph = service.buildGraph(parsedFiles, 'abc123', '/project');

      // No edges should be created for type-only imports
      expect(graph.edges).toHaveLength(0);

      // No warning should be logged (type-only imports are intentionally skipped)
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('buildGraph - mixed scenarios', () => {
    it('should create some edges and skip others based on node existence', () => {
      const parsedFiles: ParsedFile[] = [
        {
          filePath: 'src/main.ts',
          classes: [],
          functions: [],
          imports: [
            { from: './utils', isTypeOnly: false },     // exists
            { from: './missing', isTypeOnly: false },   // doesn't exist
            { from: './types', isTypeOnly: true },      // type-only (always skipped)
          ],
        },
        {
          filePath: 'src/utils.ts',
          classes: [],
          functions: [],
          imports: [],
        },
      ];

      const warnSpy = spyOn(console, 'warn');

      const graph = service.buildGraph(parsedFiles, 'abc123', '/project');

      // Should have 2 nodes
      expect(Object.keys(graph.nodes)).toHaveLength(2);

      // Should have 1 edge (main -> utils)
      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0]).toEqual({
        source: 'src/main.ts',
        relationship: 'imports',
        target: 'src/utils.ts',
      });

      // Warning should be logged for the missing file
      expect(warnSpy).toHaveBeenCalled();
      const warnCalls = warnSpy.mock.calls.map(call => call[0]).join('\n');
      expect(warnCalls).toContain('src/missing.ts');

      warnSpy.mockRestore();
    });
  });

  describe('buildGraph - complex dependency chains', () => {
    it('should handle nested imports correctly', () => {
      const parsedFiles: ParsedFile[] = [
        {
          filePath: 'src/a.ts',
          classes: [],
          functions: [],
          imports: [{ from: './b', isTypeOnly: false }],
        },
        {
          filePath: 'src/b.ts',
          classes: [],
          functions: [],
          imports: [{ from: './c', isTypeOnly: false }],
        },
        {
          filePath: 'src/c.ts',
          classes: [],
          functions: [],
          imports: [],
        },
      ];

      const graph = service.buildGraph(parsedFiles, 'abc123', '/project');

      // All nodes should exist
      expect(Object.keys(graph.nodes)).toHaveLength(3);

      // All edges should exist (a->b, b->c)
      expect(graph.edges).toHaveLength(2);

      const edgeAB = graph.edges.find(
        e => e.source === 'src/a.ts' && e.target === 'src/b.ts'
      );
      const edgeBC = graph.edges.find(
        e => e.source === 'src/b.ts' && e.target === 'src/c.ts'
      );

      expect(edgeAB).toBeDefined();
      expect(edgeBC).toBeDefined();
    });

    it('should handle broken chain where middle file is missing', () => {
      const parsedFiles: ParsedFile[] = [
        {
          filePath: 'src/a.ts',
          classes: [],
          functions: [],
          imports: [{ from: './b', isTypeOnly: false }], // b is missing
        },
        {
          filePath: 'src/c.ts',
          classes: [],
          functions: [],
          imports: [],
        },
      ];

      const warnSpy = spyOn(console, 'warn');

      const graph = service.buildGraph(parsedFiles, 'abc123', '/project');

      // Only a and c should be nodes
      expect(Object.keys(graph.nodes)).toHaveLength(2);
      expect(graph.nodes['src/a.ts']).toBeDefined();
      expect(graph.nodes['src/c.ts']).toBeDefined();
      expect(graph.nodes['src/b.ts']).toBeUndefined();

      // No edges should exist
      expect(graph.edges).toHaveLength(0);

      // Warning should be logged
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('buildGraph - warning message format', () => {
    it('should format warning with file path and referencing sources', () => {
      const parsedFiles: ParsedFile[] = [
        {
          filePath: 'src/file-a.ts',
          classes: [],
          functions: [],
          imports: [{ from: './missing', isTypeOnly: false }],
        },
      ];

      const warnSpy = spyOn(console, 'warn');

      service.buildGraph(parsedFiles, 'abc123', '/project');

      const warnCalls = warnSpy.mock.calls.map(call => call[0]);

      // Check warning structure
      expect(warnCalls.some(msg => msg.includes('Skipped'))).toBe(true);
      expect(warnCalls.some(msg => msg.includes('src/missing.ts'))).toBe(true);
      expect(warnCalls.some(msg => msg.includes('Referenced by'))).toBe(true);
      expect(warnCalls.some(msg => msg.includes('src/file-a.ts'))).toBe(true);
      expect(warnCalls.some(msg => msg.includes('Tip:'))).toBe(true);

      warnSpy.mockRestore();
    });
  });
});
