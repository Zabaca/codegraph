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
