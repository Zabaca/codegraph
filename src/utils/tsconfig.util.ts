import * as fs from 'fs';
import * as path from 'path';

/**
 * Parsed TypeScript path configuration
 */
export interface TsConfigPaths {
  baseUrl?: string;
  paths: Record<string, string[]>;
}

/**
 * Cache for loaded tsconfig files
 */
const tsconfigCache = new Map<string, TsConfigPaths | null>();

/**
 * Load and parse tsconfig.json from a project root
 * @param projectRoot Project root directory
 * @returns Parsed path configuration or null if not found/invalid
 */
export function loadTsConfig(projectRoot: string): TsConfigPaths | null {
  // Check cache first
  if (tsconfigCache.has(projectRoot)) {
    return tsconfigCache.get(projectRoot) ?? null;
  }

  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');

  // Check if tsconfig.json exists
  if (!fs.existsSync(tsconfigPath)) {
    tsconfigCache.set(projectRoot, null);
    return null;
  }

  try {
    // Read and parse tsconfig.json
    const content = fs.readFileSync(tsconfigPath, 'utf-8');

    // Strip comments from JSON (preserving strings)
    // This is a simple approach that works for most tsconfig.json files
    const lines = content.split('\n');
    const cleanedLines = lines.map(line => {
      // Find first non-string // or /* comment
      let inString = false;
      let stringChar = '';
      let cleaned = '';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        // Track string state
        if ((char === '"' || char === "'") && (i === 0 || line[i - 1] !== '\\')) {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
            stringChar = '';
          }
        }

        // Check for comments outside strings
        if (!inString) {
          if (char === '/' && nextChar === '/') {
            // Rest of line is a comment
            break;
          }
          if (char === '/' && nextChar === '*') {
            // Multi-line comment start (simplified: just skip this line)
            break;
          }
        }

        cleaned += char;
      }

      return cleaned;
    });

    let contentWithoutComments = cleanedLines.join('\n');

    // Remove trailing commas before } or ]
    contentWithoutComments = contentWithoutComments.replace(/,(\s*[}\]])/g, '$1');

    const tsconfig = JSON.parse(contentWithoutComments);

    // Extract compiler options
    const compilerOptions = tsconfig.compilerOptions;

    if (!compilerOptions) {
      tsconfigCache.set(projectRoot, null);
      return null;
    }

    // Extract baseUrl and paths
    const baseUrl = compilerOptions.baseUrl;
    const paths = compilerOptions.paths || {};

    // Only return config if we have at least baseUrl or paths
    if (!baseUrl && Object.keys(paths).length === 0) {
      tsconfigCache.set(projectRoot, null);
      return null;
    }

    const config: TsConfigPaths = {
      baseUrl,
      paths,
    };

    tsconfigCache.set(projectRoot, config);
    return config;
  } catch (error) {
    // Invalid JSON or read error - silently return null
    tsconfigCache.set(projectRoot, null);
    return null;
  }
}

/**
 * Match an import path against tsconfig path aliases
 * @param importPath The import string (e.g., "@api/users")
 * @param config Parsed tsconfig paths configuration
 * @param projectRoot Project root directory
 * @returns Array of possible file path candidates (absolute paths)
 */
export function matchPathAlias(
  importPath: string,
  config: TsConfigPaths,
  projectRoot: string
): string[] {
  // Skip relative imports
  if (importPath.startsWith('.')) {
    return [];
  }

  const candidates: string[] = [];
  const { baseUrl, paths } = config;

  // If no paths configured, return empty
  if (!paths || Object.keys(paths).length === 0) {
    return [];
  }

  // Sort patterns by specificity (longer patterns first, catch-all last)
  const sortedPatterns = Object.keys(paths).sort((a, b) => {
    // Count non-wildcard characters for specificity
    const aSpecificity = a.replace(/\*/g, '').length;
    const bSpecificity = b.replace(/\*/g, '').length;
    return bSpecificity - aSpecificity;
  });

  // Try to match against each pattern
  for (const pattern of sortedPatterns) {
    const match = matchPattern(importPath, pattern);

    if (match !== null) {
      const mappedPaths = paths[pattern];

      // For each mapped path, replace wildcard with matched part
      for (const mappedPath of mappedPaths) {
        const resolvedPath = mappedPath.replace('*', match);

        // Resolve relative to baseUrl or project root
        const basePath = baseUrl
          ? path.join(projectRoot, baseUrl)
          : projectRoot;

        const fullPath = path.join(basePath, resolvedPath);
        candidates.push(fullPath);
      }

      // Return first matching pattern (most specific)
      break;
    }
  }

  return candidates;
}

/**
 * Match an import path against a pattern
 * @param importPath The import string
 * @param pattern The pattern from tsconfig paths (e.g., "@api/*")
 * @returns The matched wildcard part, or null if no match
 */
function matchPattern(importPath: string, pattern: string): string | null {
  // Exact match (no wildcard)
  if (!pattern.includes('*')) {
    return importPath === pattern ? '' : null;
  }

  // Wildcard match
  const [prefix, suffix] = pattern.split('*');

  if (importPath.startsWith(prefix) && importPath.endsWith(suffix || '')) {
    // Extract the wildcard part
    let wildcardPart = importPath.slice(prefix.length);
    if (suffix) {
      wildcardPart = wildcardPart.slice(0, -suffix.length);
    }
    return wildcardPart;
  }

  return null;
}

/**
 * Clear the tsconfig cache (useful for testing)
 */
export function clearTsConfigCache(): void {
  tsconfigCache.clear();
}
