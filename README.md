# CodeGraph - TypeScript Dependency Graph

TypeScript dependency graph analyzer for visualizing code relationships and analyzing impact of changes.

## Goals

1. Visualize code relationships (files, classes, methods, functions)
2. Analyze impact of changes
3. Provide dependency context for LLM code modifications

## Commands

```bash
# Build/update graph from current code
codegraph update

# Query entity dependencies
codegraph query <entity-id>

# Analyze impact of changes
codegraph impact

# Compare two commits
codegraph diff <commit-A> <commit-B>
```

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

Single `graph.json` in git branch, updated per commit.

```
repo/.git/refs/heads/
  ├─ main/              # code
  └─ graph-data/        # graph.json
```

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
