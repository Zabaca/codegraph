import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { resolveImportPath } from './path.util';
import type { TsConfigPaths } from './tsconfig.util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Path Utility - Alias Resolution', () => {
  let tempDir: string;
  let existsSyncSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraph-path-test-'));

    // Mock fs.existsSync to control which files "exist"
    existsSyncSpy = spyOn(fs, 'existsSync');
  });

  afterEach(() => {
    // Restore mock
    existsSyncSpy?.mockRestore();

    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('resolveImportPath - relative imports (existing behavior)', () => {
    it('should resolve relative import with .ts extension', () => {
      const fromFile = 'src/services/user.service.ts';
      const importPath = './auth.service';

      existsSyncSpy.mockImplementation((p: string) =>
        p === path.join(tempDir, 'src/services/auth.service.ts')
      );

      const result = resolveImportPath(importPath, fromFile, tempDir);

      expect(result).toBe('src/services/auth.service.ts');
    });

    it('should resolve relative import with index.ts', () => {
      const fromFile = 'src/main.ts';
      const importPath = './services';

      existsSyncSpy.mockImplementation((p: string) =>
        p === path.join(tempDir, 'src/services/index.ts')
      );

      const result = resolveImportPath(importPath, fromFile, tempDir);

      expect(result).toBe('src/services/index.ts');
    });

    it('should return null for non-existent relative import', () => {
      const fromFile = 'src/main.ts';
      const importPath = './missing';

      existsSyncSpy.mockImplementation(() => false);

      const result = resolveImportPath(importPath, fromFile, tempDir);

      expect(result).toBeNull();
    });
  });

  describe('resolveImportPath - path alias support', () => {
    const tsConfig: TsConfigPaths = {
      baseUrl: './src',
      paths: {
        '@api/*': ['core/api/*'],
        '@services/*': ['services/*', 'shared/services/*'],
        '@utils': ['utils/index'],
        '@/*': ['./*'],
      },
    };

    it('should resolve simple path alias', () => {
      const fromFile = 'src/main.ts';
      const importPath = '@api/users';

      existsSyncSpy.mockImplementation((p: string) =>
        p === path.join(tempDir, 'src/core/api/users.ts')
      );

      const result = resolveImportPath(importPath, fromFile, tempDir, tsConfig);

      expect(result).toBe('src/core/api/users.ts');
    });

    it('should try multiple file extensions for alias', () => {
      const fromFile = 'src/main.ts';
      const importPath = '@api/users';

      existsSyncSpy.mockImplementation((p: string) =>
        p === path.join(tempDir, 'src/core/api/users.tsx')
      );

      const result = resolveImportPath(importPath, fromFile, tempDir, tsConfig);

      expect(result).toBe('src/core/api/users.tsx');
    });

    it('should try index.ts for alias', () => {
      const fromFile = 'src/main.ts';
      const importPath = '@api/users';

      existsSyncSpy.mockImplementation((p: string) =>
        p === path.join(tempDir, 'src/core/api/users/index.ts')
      );

      const result = resolveImportPath(importPath, fromFile, tempDir, tsConfig);

      expect(result).toBe('src/core/api/users/index.ts');
    });

    it('should try multiple path mappings in order', () => {
      const fromFile = 'src/main.ts';
      const importPath = '@services/auth';

      // First mapping (services/*) doesn't exist, second (shared/services/*) does
      existsSyncSpy.mockImplementation((p: string) =>
        p === path.join(tempDir, 'src/shared/services/auth.ts')
      );

      const result = resolveImportPath(importPath, fromFile, tempDir, tsConfig);

      expect(result).toBe('src/shared/services/auth.ts');
    });

    it('should resolve exact alias without wildcard', () => {
      const fromFile = 'src/main.ts';
      const importPath = '@utils';

      existsSyncSpy.mockImplementation((p: string) =>
        p === path.join(tempDir, 'src/utils/index.ts')
      );

      const result = resolveImportPath(importPath, fromFile, tempDir, tsConfig);

      expect(result).toBe('src/utils/index.ts');
    });

    it('should resolve catch-all pattern', () => {
      const fromFile = 'src/main.ts';
      const importPath = '@/components/button';

      existsSyncSpy.mockImplementation((p: string) =>
        p === path.join(tempDir, 'src/components/button.tsx')
      );

      const result = resolveImportPath(importPath, fromFile, tempDir, tsConfig);

      expect(result).toBe('src/components/button.tsx');
    });

    it('should return null for alias with no matching files', () => {
      const fromFile = 'src/main.ts';
      const importPath = '@api/missing';

      existsSyncSpy.mockImplementation(() => false);

      const result = resolveImportPath(importPath, fromFile, tempDir, tsConfig);

      expect(result).toBeNull();
    });

    it('should still return null for node_modules imports', () => {
      const fromFile = 'src/main.ts';
      const importPath = 'lodash';

      existsSyncSpy.mockImplementation(() => false);

      const result = resolveImportPath(importPath, fromFile, tempDir, tsConfig);

      expect(result).toBeNull();
    });

    it('should still return null for scoped package imports', () => {
      const fromFile = 'src/main.ts';
      const importPath = '@nestjs/common';

      existsSyncSpy.mockImplementation(() => false);

      const result = resolveImportPath(importPath, fromFile, tempDir, tsConfig);

      expect(result).toBeNull();
    });
  });

  describe('resolveImportPath - without tsconfig', () => {
    it('should work for relative imports without tsconfig', () => {
      const fromFile = 'src/main.ts';
      const importPath = './utils';

      existsSyncSpy.mockImplementation((p: string) =>
        p === path.join(tempDir, 'src/utils.ts')
      );

      const result = resolveImportPath(importPath, fromFile, tempDir);

      expect(result).toBe('src/utils.ts');
    });

    it('should return null for alias imports without tsconfig', () => {
      const fromFile = 'src/main.ts';
      const importPath = '@api/users';

      existsSyncSpy.mockImplementation(() => false);

      const result = resolveImportPath(importPath, fromFile, tempDir);

      expect(result).toBeNull();
    });
  });

  describe('resolveImportPath - tsconfig without baseUrl', () => {
    it('should resolve alias with paths but no baseUrl', () => {
      const tsConfig: TsConfigPaths = {
        paths: {
          '@api/*': ['src/core/api/*'],
        },
      };

      const fromFile = 'src/main.ts';
      const importPath = '@api/users';

      existsSyncSpy.mockImplementation((p: string) =>
        p === path.join(tempDir, 'src/core/api/users.ts')
      );

      const result = resolveImportPath(importPath, fromFile, tempDir, tsConfig);

      expect(result).toBe('src/core/api/users.ts');
    });
  });
});
