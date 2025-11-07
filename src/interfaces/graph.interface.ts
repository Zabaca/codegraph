export type NodeType = 'file' | 'class' | 'method' | 'function' | 'interface';

export type RelationshipType = 'imports' | 'extends' | 'implements' | 'calls';

export interface Node {
  type: NodeType;
  file?: string;      // File path (for non-file nodes)
  line?: number;      // Starting line number
  endLine?: number;   // Ending line number (optional)
}

export interface Edge {
  source: string;           // Entity ID
  relationship: RelationshipType;
  target: string;           // Entity ID
}

export interface GraphData {
  version: string;              // Graph format version
  commitHash: string;           // Current git commit hash
  timestamp: string;            // ISO 8601 timestamp
  nodes: Record<string, Node>;  // Entity ID -> Node metadata
  edges: Edge[];                // Relationships
}

export interface ParsedFile {
  filePath: string;
  classes: ParsedClass[];
  functions: ParsedFunction[];
  imports: ParsedImport[];
}

export interface ParsedClass {
  name: string;
  line: number;
  endLine: number;
  methods: ParsedMethod[];
  extends?: string;
  implements?: string[];
}

export interface ParsedMethod {
  name: string;
  line: number;
  endLine: number;
  calls: string[];
}

export interface ParsedFunction {
  name: string;
  line: number;
  endLine: number;
  calls: string[];
}

export interface ParsedImport {
  from: string;           // Module being imported
  isTypeOnly: boolean;    // Type-only import
}
