import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { loadTsConfig, matchPathAlias, type TsConfigPaths } from './tsconfig.util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('TsConfig Utility', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraph-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadTsConfig', () => {
    it('should load and parse basic tsconfig.json', () => {
      const tsconfig = {
        compilerOptions: {
          baseUrl: './src',
          paths: {
            '@api/*': ['core/api/*'],
            '@services/*': ['services/*'],
          },
        },
      };

      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const result = loadTsConfig(tempDir);

      expect(result).toBeDefined();
      expect(result?.baseUrl).toBe('./src');
      expect(result?.paths).toEqual({
        '@api/*': ['core/api/*'],
        '@services/*': ['services/*'],
      });
    });

    it('should return null when tsconfig.json does not exist', () => {
      const result = loadTsConfig(tempDir);
      expect(result).toBeNull();
    });

    it('should return null when tsconfig.json has no paths', () => {
      const tsconfig = {
        compilerOptions: {
          target: 'ES2020',
        },
      };

      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const result = loadTsConfig(tempDir);
      expect(result).toBeNull();
    });

    it('should handle tsconfig with only baseUrl', () => {
      const tsconfig = {
        compilerOptions: {
          baseUrl: './src',
        },
      };

      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const result = loadTsConfig(tempDir);
      expect(result).toBeDefined();
      expect(result?.baseUrl).toBe('./src');
      expect(result?.paths).toEqual({});
    });

    it('should handle tsconfig with only paths', () => {
      const tsconfig = {
        compilerOptions: {
          paths: {
            '@/*': ['./*'],
          },
        },
      };

      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const result = loadTsConfig(tempDir);
      expect(result).toBeDefined();
      expect(result?.baseUrl).toBeUndefined();
      expect(result?.paths).toEqual({
        '@/*': ['./*'],
      });
    });

    it('should handle invalid JSON gracefully', () => {
      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        '{ invalid json }'
      );

      const result = loadTsConfig(tempDir);
      expect(result).toBeNull();
    });

    it('should cache loaded tsconfig for same project root', () => {
      const tsconfig = {
        compilerOptions: {
          baseUrl: './src',
          paths: { '@/*': ['./*'] },
        },
      };

      fs.writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const result1 = loadTsConfig(tempDir);
      const result2 = loadTsConfig(tempDir);

      // Should return same reference (cached)
      expect(result1).toBe(result2);
    });
  });

  describe('matchPathAlias', () => {
    const pathsConfig: TsConfigPaths = {
      baseUrl: './src',
      paths: {
        '@api/*': ['core/api/*'],
        '@services/*': ['services/*', 'shared/services/*'],
        '@utils': ['utils/index'],
        '@/*': ['./*'],
      },
    };

    it('should match simple wildcard pattern', () => {
      const candidates = matchPathAlias('@api/users', pathsConfig, tempDir);

      expect(candidates).toContain(path.join(tempDir, 'src/core/api/users'));
    });

    it('should match pattern and return multiple candidates', () => {
      const candidates = matchPathAlias('@services/auth', pathsConfig, tempDir);

      expect(candidates).toHaveLength(2);
      expect(candidates).toContain(path.join(tempDir, 'src/services/auth'));
      expect(candidates).toContain(path.join(tempDir, 'src/shared/services/auth'));
    });

    it('should match exact path without wildcard', () => {
      const candidates = matchPathAlias('@utils', pathsConfig, tempDir);

      expect(candidates).toHaveLength(1);
      expect(candidates).toContain(path.join(tempDir, 'src/utils/index'));
    });

    it('should match catch-all pattern', () => {
      const candidates = matchPathAlias('@/components/button', pathsConfig, tempDir);

      expect(candidates).toContain(path.join(tempDir, 'src/components/button'));
    });

    it('should return empty array for non-matching import', () => {
      const candidates = matchPathAlias('lodash', pathsConfig, tempDir);

      expect(candidates).toHaveLength(0);
    });

    it('should return empty array for relative import', () => {
      const candidates = matchPathAlias('./utils', pathsConfig, tempDir);

      expect(candidates).toHaveLength(0);
    });

    it('should handle paths config without baseUrl', () => {
      const config: TsConfigPaths = {
        paths: {
          '@api/*': ['src/core/api/*'],
        },
      };

      const candidates = matchPathAlias('@api/users', config, tempDir);

      expect(candidates).toContain(path.join(tempDir, 'src/core/api/users'));
    });

    it('should prefer more specific pattern over catch-all', () => {
      const candidates = matchPathAlias('@api/users', pathsConfig, tempDir);

      // Should match @api/* before @/*
      expect(candidates[0]).toContain('core/api/users');
    });

    it('should handle empty paths object', () => {
      const config: TsConfigPaths = {
        baseUrl: './src',
        paths: {},
      };

      const candidates = matchPathAlias('@api/users', config, tempDir);

      expect(candidates).toHaveLength(0);
    });
  });
});
