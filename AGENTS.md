# AGENTS.md

This document provides guidance for agentic coding assistants working on the localport repository.

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
# Coming soon: Biome config mentioned in TODO.md
# After Biome setup, expected commands:
bun run lint             # Run linter
bun run format           # Format code
bun run typecheck        # Run TypeScript type checking
tsc --noEmit             # Manual type check without emitting files
```

### Testing
```bash
# No test framework configured yet
# Consider adding bun test or vitest
```

## Code Style Guidelines

### Imports
- Use ES modules with `.ts` extensions: `import { x } from "./file.ts"`
- Group imports: standard library first, then third-party, then local modules
- Local imports use relative paths: `./utils.ts`, `../constants.ts`
- Import from `node:` protocol for Node.js built-ins: `import { homedir } from "node:os"`

### Formatting
- Use **tabs** for indentation (confirmed in cli.ts, start.ts, stop.ts)
- No trailing whitespace
- Use template literals with Bun's `$` for shell commands
- Trimming multi-line strings with `.trim()` for clean output

### TypeScript
- Strict mode enabled in tsconfig.json
- Use explicit `as` type assertions only when necessary: `return "darwin" as PlatformId`
- Define types with `as const` for readonly arrays: `const PLATFORMS = [...] as const`
- Use `Record<PlatformId, string>` for mapped types
- Enable `verbatimModuleSyntax` - no automatic `.js` extension removal

### Naming Conventions
- **Functions/Variables**: camelCase - `getPlatformId()`, `dnsmasqSpinner`
- **Types/Interfaces**: PascalCase - `PlatformId`, `InstallOptions`
- **Constants**: UPPER_SNAKE_CASE - `DNSMASQ_PORT`, `CADDY_CONFIG`
- **Files**: lowercase with underscores for multi-word - `dnsmasq.conf`, `caddy.pid`
- **CLI Commands**: lowercase kebab-case - `localport start`, `localport stop`

### Error Handling
- Use `throw new Error()` for unrecoverable errors with descriptive messages
- Use `.catch()` for promise rejections with console.error logging
- Use `|| true` pattern to ignore shell command failures gracefully
- Check file existence before operations: `await file(path).exists()`
- Validate platform support before proceeding with installation

### File Organization
```
src/
  ├── cli.ts              # Entry point for CLI commands
  ├── index.ts            # Main exports (for library usage)
  ├── utils.ts            # Shared utility functions
  ├── constants.ts        # Platform-specific constants and configs
  └── sdk/
      ├── start.ts        # Start service logic
      └── stop.ts         # Stop service logic
```

### Async Patterns
- Prefer async/await over promise chaining
- Use Bun.spawn() for detached processes
- Use Bun.file() for file operations
- Use ora spinners for long-running async operations

### Logging & User Output
- Use `console.log()` for informational messages
- Use `console.error()` for error messages
- Use ora for loading spinners with descriptive messages
- Format multi-line config strings with `.trim()`

### Platform-Specific Code
- Detect platform using `process.platform`
- Use Record<PlatformId, string> for platform-specific mappings
- Validate platform support before accessing platform-specific configs
- Handle unsupported platforms with clear error messages

### State Management
- Store PIDs in `.pid` files under state directory
- Use XDG-compliant directories: `$XDG_CONFIG_HOME` and `$XDG_STATE_HOME`
- Create directories with `mkdir -p` before use

### Security Considerations
- Shell commands use template literals: `$`command``
- User-supplied commands should be validated before execution
- Use `|| true` to suppress errors in cleanup operations
- Always check file existence before reading/writing

### Comments
- NO COMMENTS unless explicitly requested
- Let code be self-documenting
- Use descriptive function and variable names instead of comments

### External Dependencies
- Use `commander` for CLI structure
- Use `ora` for terminal spinners
- Use Bun APIs ($, file, spawn) for system operations
- Follow Bun conventions over Node.js when available
