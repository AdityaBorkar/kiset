# AGENTS.md

This document provides guidance for agentic coding assistants working on the kiset repository.

## Build / Lint / Test Commands

### Dependencies

```bash
bun install              # Install dependencies
```

### Development

```bash
bun run dev              # Run the CLI in development mode (src/cli.ts)
bun src/cli.ts           # Run the CLI directly
bun src/sdk/start.ts     # Run start function directly
bun src/sdk/stop.ts      # Run stop function directly
```

### Linting & Type Checking

```bash
bun run lint             # Run Biome linter with auto-fix
bun run typecheck        # Run TypeScript type checking
tsc --noEmit             # Manual type check without emitting files
```

### Testing

```bash
bun test                 # Run all tests (Bun test framework)
bun test <test-file>     # Run a specific test file
bun test --watch         # Run tests in watch mode
```

## Code Style Guidelines

### Imports

- Use ES modules with `.ts` extensions: `import { x } from "./file.ts"`
- Group imports by type: URL imports, Node.js/Bun built-ins, packages, then local modules
- Use `node:` protocol for Node.js built-ins: `import { homedir } from "node:os"`
- Biome auto-organizes imports on save

### Formatting

- **Tabs** for indentation (enforced by Biome)
- **80 chars** max line width (enforced by Biome)
- **Semicolons**: as-needed (enforced by Biome)
- **Trailing commas**: none (enforced by Biome)
- Use template literals with Bun's `$` for shell commands: `$`command``
- Use `.trim()` on multi-line strings for clean output

### TypeScript

- **Strict mode** enabled - all strict compiler flags on
- Use explicit `as` type assertions only when necessary: `return "darwin" as PlatformId`
- Define types with `as const` for readonly arrays: `const PLATFORMS = [...] as const`
- Use `Record<PlatformId, string>` for platform-specific mappings
- Schema validation with **arktype**: `const Schema = type({...})`
- Type inference: `type SchemaType = typeof Schema.infer`

### Naming Conventions

- **Functions/Variables**: camelCase - `getPlatformId()`, `waitForService()`
- **Types/Interfaces**: PascalCase - `PlatformId`, `ServiceStatus`
- **Constants**: UPPER_SNAKE_CASE - `DNSMASQ_PORT`, `CADDY_PORT`
- **Files**: lowercase with underscores for multi-word - `dnsmasq.conf`, `caddy.pid`
- **CLI Commands**: lowercase kebab-case - `kiset start`, `kiset stop`

### Error Handling

- Custom error classes extend `Error`: `export class ServiceStartError extends Error`
- Use descriptive error messages with context
- Use `|| true` pattern to ignore shell command failures gracefully
- Check file existence before operations: `await file(path).exists()`
- Validate inputs with arktype schemas before processing
- Exit codes: ERROR(1), SUCCESS(0), USAGE(2)

### File Organization

```
src/
  ├── cli.ts              # CLI entry point, commander config
  ├── config.ts           # Arktype schemas and validation
  ├── constants.ts        # Platform-specific configs
  ├── index.ts            # Public API exports
  ├── sdk/
  │   ├── start.ts        # Service startup logic
  │   ├── stop.ts         # Service shutdown logic
  │   ├── status.ts       # Health checking
  │   └── ...             # Other SDK modules
  └── utils/
      ├── index.ts        # Core utilities, platform detection
      ├── errors.ts       # Custom error classes
      ├── logger.ts       # Consola logging setup
      └── merge.ts        # Deep merge utilities
```

### Async Patterns

- Prefer async/await over promise chaining
- Use `Bun.spawn()` for detached processes with `{ detached: true }`
- Use `Bun.file()` for file operations: `await file(path).write(content)`
- Use `ora` spinners for long-running async operations with descriptive messages
- Use `retryWithBackoff()` for flaky operations (e.g., network checks)

### Logging & User Output

- Use `consola` logger: `logger.info()`, `logger.error()`, `logger.warn()`
- Log levels: debug, info, warn, error, silent (set via `--log-level`)
- JSON output mode: set `--json` flag for machine-readable output
- Log health check failures with context and suggestions

### Platform-Specific Code

- Detect platform via `getPlatformId()` from `src/utils/index.ts`
- Platform IDs: darwin, ubuntu, debian, fedora, rhel, centos, arch, manjaro
- Use `Record<PlatformId, string>` for platform-specific commands/paths
- Validate platform support before accessing platform-specific configs
- Handle unsupported platforms with clear error messages

### State Management

- **XDG-compliant directories**:
  - Config: `$XDG_CONFIG_HOME/kiset/` (~/.config/kiset/)
  - State: `$XDG_STATE_HOME/kiset/` (~/.local/state/kiset/)
  - Logs: `$XDG_STATE_HOME/kiset/logs/`
- Store PIDs in `.pid` files: `caddy.pid`, `dnsmasq.pid`
- Use lock files with `createLockFile().withLock()` for critical sections
- Create directories with `mkdir -p` before use: `$`mkdir -p ${dir}``

### Security Considerations

- Validate all user inputs with arktype schemas
- Shell commands use template literals: `$`command``
- Use `|| true` to suppress errors in cleanup operations
- Check file existence before reading/writing: `await file(path).exists()`
- Sanitize paths and avoid command injection

### Process Management

- Spawn processes: `Bun.spawn([...args], { detached, stdout, stderr })`
- Check if process running: `await isProcessRunning(pid)`
- Wait for service ready: `await waitForService(pid, port, timeout)`
- Graceful shutdown on SIGTERM/SIGINT with cleanup handlers
- Log process exit codes with context: 143 (SIGTERM), 130 (SIGINT), 137 (SIGKILL)

### Comments

- **NO COMMENTS** unless explicitly requested
- Let code be self-documenting
- Use descriptive function and variable names

### External Dependencies

- **commander** - CLI framework
- **consola** - Logging (imported as `logger`)
- **ora** - Terminal spinners
- **arktype** - Schema validation
- **Bun APIs** - `$`, `file`, `spawn` for system operations
- **Node.js** - Use `node:` protocol for built-ins when Bun alternative unavailable
