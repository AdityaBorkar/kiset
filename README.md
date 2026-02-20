# localport

CLI tool for managing local DNS and HTTP services with custom `.local` domains. Localport sets up dnsmasq for DNS resolution and Caddy for serving local content, perfect for development environments and local testing.

## Features

- **Custom `.local` Domains**: Map any `.local` domain to `127.0.0.1` for local development
- **Automatic Dependency Installation**: Installs dnsmasq and Caddy based on your platform
- **Service Management**: Start, stop, and check status of services with a single command
- **Health Checks**: Verifies DNS and HTTP services are running correctly
- **Cross-Platform**: Supports macOS (Darwin) and major Linux distributions (Arch, CentOS, Debian, Fedora, Manjaro, RHEL, Ubuntu)
- **XDG-Compliant**: Uses standard directories for configuration and state management
- **Lock File Protection**: Prevents concurrent operations for safe service management

## Installation

### Prerequisites

- **Bun**: Runtime environment (>= 1.0.0)
- **Node.js**: Peer dependency (>= 22.0.0) for type definitions
- **System Requirements**:
  - Root/sudo access for installing dnsmasq and Caddy
  - Network access for fetching dependencies

### Install from NPM

```bash
bun install -g localport
```

### Install from Source

```bash
git clone <repository-url>
cd localport
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

## Usage

### Start Services

Start dnsmasq (DNS) and Caddy (HTTP) in detached mode:

```bash
localport start
```

Start in foreground mode (useful for debugging):

```bash
localport start --no-detached
```

**Default Ports:**

- DNS (dnsmasq): `127.0.0.1:5353`
- HTTP (Caddy): `127.0.0.1:8443`

### Stop Services

Stop all running services:

```bash
localport stop
```

### Check Status

View service status and health:

```bash
localport status
```

Output example:

```
dnsmasq  ✓ running (PID: 12345, Port: 5353) - healthy
caddy    ✓ running (PID: 12346, Port: 8443) - healthy
```

## Exit Codes

The CLI uses the following exit codes:

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error |
| 2 | Usage (invalid command or arguments) |

When an error occurs, the CLI will exit with code `1` and print an error message to stderr.

## How It Works

1. **DNS Resolution (dnsmasq)**:
   - Runs on `127.0.0.1:5353`
   - Resolves all `.local` domains to `127.0.0.1`
   - Caches queries for performance
   - Uses upstream DNS servers (1.1.1.1, 8.8.8.8)

2. **HTTP Server (Caddy)**:
   - Runs on `127.0.0.1:8443`
   - Responds with status message on default endpoint
   - Can be configured for custom domain routing

3. **File Organization**:
   - Config: `$XDG_CONFIG_HOME/localport/` (default: `~/.config/localport/`)
   - State: `$XDG_STATE_HOME/localport/` (default: `~/.local/state/localport/`)
   - Logs: `$XDG_STATE_HOME/localport/logs/`

## Configuration

After starting localport, configure your system DNS to use the local DNS server:

### macOS

```bash
sudo networksetup -setdnsservers Wi-Fi 127.0.0.1 5353
```

### Linux (NetworkManager)

```bash
nmcli connection modify <connection-name> ipv4.dns "127.0.0.1 5353"
```

### Testing DNS Resolution

```bash
dig @127.0.0.1 -p 5353 test.local +short
```

Expected output: `127.0.0.1`

## Development

### Available Scripts

```bash
# Install dependencies
bun install

# Run CLI in development mode
bun run dev

# Run TypeScript type checking
bun run typecheck

# Run linter
bun run lint

# Run tests
bun test
```

### Project Structure

```
localport/
├── src/
│   ├── cli.ts           # CLI entry point and command definitions
│   ├── constants.ts     # Platform-specific constants and configs
│   ├── utils.ts         # Utility functions and helpers
│   ├── index.ts         # Main exports (for library usage)
│   └── sdk/
│       ├── start.ts     # Service start logic
│       ├── stop.ts      # Service stop logic
│       └── status.ts   # Service status checking
├── package.json
├── tsconfig.json
└── AGENTS.md            # Agent development guidelines
```

## API

### Programmatic Usage

You can also use localport as a library in your TypeScript/JavaScript projects:

```typescript
import { start, stop, status } from "localport"

// Start services
await start(true, false)

// Check status
const serviceStatus = await status(true)

// Stop services
await stop(true)
```

## Troubleshooting

### Services Won't Start

1. Check if ports are already in use:

   ```bash
   lsof -i :5353  # dnsmasq
   lsof -i :8443  # caddy
   ```

2. View logs:

   ```bash
   tail -f ~/.local/state/localport/logs/dnsmasq.log
   tail -f ~/.local/state/localport/logs/caddy.log
   ```

### DNS Not Resolving

1. Verify dnsmasq is running: `localport status`
2. Check DNS configuration: `dig @127.0.0.1 -p 5353 test.local`
3. Ensure system DNS is pointing to `127.0.0.1:5353`

### Permission Errors

Ensure you have sudo/root access for installing system dependencies (dnsmasq and Caddy).

## License

[Your License Here]

## Contributing

Contributions are welcome! Please read [AGENTS.md](./AGENTS.md) for development guidelines before submitting pull requests.

## Support

For issues, questions, or feature requests, please open an issue on the [GitHub repository](<repository-url>).
