# Kiset

CLI tool for managing local development environments with custom domains and HTTPS support. Kiset sets up Caddy as an HTTP server with automatic certificate generation, perfect for development and testing of web applications with secure connections.

## Features

- **Custom Domains with HTTPS**: Map local services to custom domains with automatic SSL certificates
- **Caddy Service Management**: Start, stop, and monitor Caddy HTTP server with ease
- **Port Assignment System**: Dynamically assign and manage ports for multiple local services
- **Certificate Trust Management**: Trust and revoke local development certificates
- **Autostart Configuration**: Enable services to start automatically on boot (systemd)
- **Project-Based Configuration**: Define ports and subdomains per project via `kiset.config.ts`
- **JSON Output Mode**: Machine-readable JSON output for automation and scripting
- **Lock File Protection**: Prevents concurrent operations for safe service management
- **XDG-Compliant**: Follows XDG Base Directory specification for config and state
- **Cross-Platform**: Supports macOS (Darwin) and major Linux distributions

## Installation

### Prerequisites

- **Bun**: Runtime environment (>= 1.0.0)
- **Node.js**: Peer dependency (>= 22.0.0) for type definitions
- **System Requirements**:
  - Root/sudo access for installing Caddy and managing system services
  - Network access for fetching dependencies

### Install from NPM

```bash
bun install -g kiset
```

### Install from Source

```bash
git clone https://github.com/AdityaBorkar/kiset.git
cd kiset
bun install
bun link
```

## Supported Platforms

| Platform | Support Status |
|----------|----------------|
| macOS (Darwin) | ✅ |
| Arch Linux | ✅ |
| Manjaro | ✅ |
| Ubuntu | ✅ |
| Debian | ✅ |
| Fedora | ✅ |
| RHEL | ✅ |
| CentOS | ✅ |

## Quick Start

### 1. Create Project Configuration

Create a `kiset.config.ts` file in your project root:

```typescript
import { defineProjectConfig } from "kiset"

export default defineProjectConfig({
  environment: "development",
  infisical: {
    siteUrl: "https://app.infisical.com"
  },
  ports: {
    VITE_SERVER_PORT: { subdomain: "myapp" },
    API_PORT: { subdomain: "api.myapp" }
  },
  projectId: "my-project"
})
```

### 2. Start the Service

```bash
kiset service start
```

Start in foreground mode (useful for debugging):

```bash
kiset service start --foreground
```

**Default Configuration:**

- Admin Server: `localhost:2020`
- HTTPS Server: `localhost:443`
- Port Assignment Range: `4000-4999`

### 3. Trust the Certificate

For HTTPS to work without warnings, trust the local Caddy certificate:

```bash
kiset trust
```

**Platform-Specific Instructions:**

- **macOS**: Import certificate via Keychain Access
- **Windows (WSL)**: `certutil -addstore -f ROOT "$env:USERPROFILE\.local\share\caddy\pki\authorities\local\root.crt"`
- **Firefox**: Settings → Privacy & Security → Certificates → View Certificates → Authorities → Import `root.crt` → Check "Trust this CA to identify websites" → OK

### 4. View Service Status

```bash
kiset service status
```

Output example:

```
caddy  ✓ running (PID: 12345, Port: 443) - healthy
```

### 5. View Logs

```bash
kiset service logs caddy

# Stream logs in real-time
kiset service logs caddy --follow

# Show last 100 lines
kiset service logs caddy --limit 100
```

## Commands

### Service Management

#### Start Services

```bash
kiset service start [--foreground]
```

Start the Caddy HTTP server. Use `--foreground` to run in the foreground for debugging.

#### Stop Services

```bash
kiset service stop
```

Stop all running Caddy services.

#### Check Status

```bash
kiset service status
```

Display service status and health information.

#### View Logs

```bash
kiset service logs [service] [--follow] [--limit <n>]
```

View service logs. Options:
- `service`: Service name (e.g., `caddy`)
- `--follow`: Stream logs in real-time
- `--limit`: Number of log lines to show (default: 50)

### Certificate Management

#### Trust Certificate

```bash
kiset trust
```

Trust the local Caddy certificate for HTTPS.

#### Revoke Trust

```bash
kiset revoke-trust
```

Remove trust for the local Caddy certificate.

### Autostart Management

#### Enable Autostart

```bash
kiset autostart
```

Enable Kiset to start automatically on system boot (requires systemd).

#### Disable Autostart

```bash
kiset revoke-autostart
```

Disable automatic startup.

### Port Management

#### List Port Assignments

```bash
kiset list [program]
```

List all port assignments or assignments for a specific program.

### Utility Commands

#### Execute Command

```bash
kiset run <command> [args...]
```

Execute a command after validating configuration and checking service status.

#### Force Unlock

```bash
kiset unlock
```

Forcefully release the service lock if a previous operation left it in a locked state.

## Configuration

### Global Configuration

Global configuration is stored in `$XDG_CONFIG_HOME/kiset/kiset.config.json` (default: `~/.config/kiset/kiset.config.json`).

```json
{
  "port_assignment": {
    "deny": [],
    "range": {
      "end": 4999,
      "start": 4000
    }
  },
  "server": {
    "hostname": "localhost",
    "https": true,
    "port": 443
  },
  "server_admin": {
    "hostname": "localhost",
    "port": 2020
  }
}
```

### Project Configuration

Project-specific configuration is defined in `kiset.config.ts`:

```typescript
import { defineProjectConfig } from "kiset"

export default defineProjectConfig({
  environment: "development",
  infisical: {
    siteUrl: "https://app.infisical.com"
  },
  port_assignment: {
    deny: [8080, 8081],
    range: {
      end: 4999,
      start: 4000
    }
  },
  ports: {
    PORT_NAME_1: { subdomain: "subdomain1" },
    PORT_NAME_2: { subdomain: "subdomain2" }
  },
  projectId: "your-project-id"
})
```

### Environment Variables

Kiset respects XDG Base Directory specification:

- `XDG_CONFIG_HOME`: Config directory (default: `~/.config`)
- `XDG_STATE_HOME`: State directory (default: `~/.local/state`)

## File Organization

```
~/.config/kiset/              # Config directory
  ├── Caddyfile               # Caddy configuration
  └── kiset.config.json       # Global configuration

~/.local/state/kiset/         # State directory
  ├── assignments.json        # Port assignments
  ├── caddy.json              # Caddy service state
  ├── kiset.lock              # Service lock file
  └── logs/                   # Log files
      ├── caddy.log
```

## Programmatic Usage

You can also use Kiset as a library:

```typescript
import {
  autostart,
  list,
  revoke_autostart,
  revoke_trust,
  run,
  start,
  status,
  stop,
  trust,
  defineProjectConfig
} from "kiset"

// Start services
await start({ detached: true }, { verbose: true })

// Check status
const serviceStatus = await status(null, { verbose: true })

// List port assignments
const assignments = await list({ name: "my-service" }, { verbose: true })

// Stop services
await stop(null, { verbose: true })
```

## Development

### Available Scripts

```bash
# Install dependencies
bun install

# Build the project
bun run build

# Run CLI in development mode
bun run dev

# Run TypeScript type checking
bun run typecheck

# Run linter
bun run lint

# Fix linting issues
bun run lint:fix
```

### Project Structure

```
kiset/
├── src/
│   ├── cli.ts                    # CLI entry point and command definitions
│   ├── constants.ts              # Platform-specific constants and defaults
│   ├── index.ts                  # Public API exports
│   ├── services/
│   │   ├── caddy.ts              # Caddy service integration
│   │   ├── cf-tunnel.ts          # Cloudflare Tunnel integration
│   │   ├── dnsmasq.ts            # dnsmasq DNS server integration
│   │   └── infisical.ts          # Infisical integration
│   ├── sdk/
│   │   ├── autostart.ts          # Autostart management
│   │   ├── revoke-autostart.ts   # Disable autostart
│   │   ├── revoke-trust.ts       # Revoke certificate trust
│   │   ├── service.logs.ts       # Log viewing
│   │   ├── service.start.ts      # Service startup logic
│   │   ├── service.status.ts     # Health checking
│   │   ├── service.stop.ts       # Service shutdown
│   │   ├── trust.ts              # Certificate trust management
│   │   ├── list.ts               # Port assignment listing
│   │   ├── run.ts                # Command execution
│   │   └── unlock.ts             # Lock file management
│   └── utils/
│       ├── config.ts             # Schema validation and config loading
│       ├── deep-merge.ts         # Deep merge utilities
│       ├── errors.ts             # Custom error classes
│       ├── index.ts              # Core utilities
│       ├── logger.ts             # Consola logging setup
│       ├── lockfile.ts           # Lock file management
│       ├── paths.ts              # XDG-compliant path resolution
│       ├── port-assignment.ts    # Port assignment logic
│       ├── try-catch.ts          # Error wrapper utilities
│       ├── types.ts               # TypeScript type definitions
│       ├── utils.ts              # Process and platform utilities
│       └── validation.ts         # Input validation
├── package.json
├── tsconfig.json
├── biome.json
├── AGENTS.md                     # Agent development guidelines
└── README.md
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error |
| 2 | Usage (invalid command or arguments) |

## Troubleshooting

### Services Won't Start

1. **Check port availability**:

   ```bash
   lsof -i :443   # Caddy HTTPS
   lsof -i :2020  # Caddy admin
   ```

2. **View logs**:

   ```bash
   kiset service logs caddy --follow
   ```

3. **Check if Caddy is installed**:

   ```bash
   which caddy
   caddy version
   ```

4. **Force release lock** if operations are stuck:

   ```bash
   kiset unlock
   ```

### HTTPS Certificate Issues

1. **Trust the certificate**:

   ```bash
   kiset trust
   ```

2. **Verify certificate is trusted** in your browser or system certificate store

3. **Revoke and re-trust** if needed:

   ```bash
   kiset revoke-trust
   kiset trust
   ```

### Permission Errors

- Ensure you have sudo/root access for installing system dependencies (Caddy)
- Check file permissions in `~/.config/kiset/` and `~/.local/state/kiset/`

### Port Conflicts

- Check `kiset.config.ts` for port assignment ranges
- Modify global config if the default range (4000-4999) conflicts with your services
- View all assignments: `kiset list`

## License

MIT License - Copyright (c) 2026 Aditya Borkar

## Contributing

Contributions are welcome! Please read [AGENTS.md](./AGENTS.md) and [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines before submitting pull requests.

## Support

For issues, questions, or feature requests, please open an issue on the [GitHub repository](https://github.com/AdityaBorkar/kiset/issues).
