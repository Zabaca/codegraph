# CodeGraph - TypeScript Dependency Graph

TypeScript dependency graph analyzer for visualizing code relationships and analyzing impact of changes.

## Goals

1. Visualize code relationships (files, classes, methods, functions)
2. Analyze impact of changes
3. Provide dependency context for LLM code modifications

## Commands

### `codegraph update`

Build or update the dependency graph from your current code.

```bash
codegraph update
```

This command:
- Scans all TypeScript files in your project
- Parses classes, methods, functions, and their relationships
- Generates `.codegraph/graph.json` with the dependency graph

### `codegraph query <entity-id>`

Query dependencies or dependents for a specific entity.

```bash
# Show what an entity depends on
codegraph query "src/services/parser.service.ts::ParserService::parseFile"

# Show what depends on an entity
codegraph query "src/utils/path.util.ts::normalizePath" --dependents

# Include transitive dependencies (full dependency tree)
codegraph query "src/app.module.ts::AppModule" --transitive

# Output as JSON for scripting
codegraph query "src/cli.ts::bootstrap" --format json

# Output as simple list
codegraph query "src/services/git.service.ts" --format list
```

Options:
- `--dependents` - Show what depends on this entity (default: show dependencies)
- `--transitive` - Include transitive dependencies/dependents
- `--format <json|tree|list>` - Output format (default: tree)

### `codegraph impact`

Analyze the impact of changes in your working directory.

```bash
# Analyze current changes
codegraph impact

# Compare against a specific commit
codegraph impact --base e0c5693

# Only show high-risk changes
codegraph impact --threshold HIGH

# Output as JSON
codegraph impact --format json
```

Options:
- `--base <commit>` - Base commit to compare against (default: HEAD)
- `--format <json|report>` - Output format (default: report)
- `--threshold <LOW|MEDIUM|HIGH|CRITICAL>` - Only show impacts above this level

The command calculates a risk level based on:
- Number of affected files
- Number of affected entities
- Depth of dependency chains

### `codegraph diff <commit1> <commit2>`

Compare dependency graphs between two commits.

```bash
# Compare two commits
codegraph diff e0c5693 cd7bf13

# Show only summary
codegraph diff main feature-branch --summary

# Show only node changes (exclude edges)
codegraph diff HEAD~5 HEAD --nodes-only

# Show only edge changes (exclude nodes)
codegraph diff v1.0.0 v2.0.0 --edges-only

# Output as JSON
codegraph diff abc123 def456 --format json
```

Options:
- `--summary` - Show only summary statistics
- `--nodes-only` - Show only node changes (exclude edges)
- `--edges-only` - Show only edge changes (exclude nodes)
- `--format <json|report>` - Output format (default: report)

## Entity ID Format

```
file.ts                           # file
file.ts::ClassName                # class
file.ts::ClassName::methodName    # method
file.ts::functionName             # function
```

## Edge Types

- `imports` - file → file
- `extends` - class → class
- `implements` - class → interface
- `calls` - function/method → function/method

## Storage

Graph data is stored in `.codegraph/graph.json` in your repository root.

```
your-project/
  ├─ src/              # your code
  ├─ .codegraph/
  │  └─ graph.json     # generated dependency graph
  └─ package.json
```

You can choose to:
- **Commit it**: Track graph changes alongside code
- **Ignore it**: Add `.codegraph/` to `.gitignore` to keep it local-only

## Installation

```bash
bun install -g codegraph
```

## Development

```bash
bun install
bun run build
bun run dev
```

## License

MIT
