# linkmd

Publish Markdown and print a shareable URL.

## Usage

```bash
linkmd paste notes.md
pbpaste | linkmd paste --no-copy
linkmd paste --json notes.md
```

Provider options precede the optional file argument. Run `linkmd paste --help` for details.

paste.rs is anonymous and URL-accessible. It does not document privacy or retention guarantees; do not publish secrets.

## Development

```bash
mise install
mise exec -- bun install --frozen-lockfile
mise exec -- bun run typecheck
mise exec -- bun run test
mise exec -- bun run build
```
