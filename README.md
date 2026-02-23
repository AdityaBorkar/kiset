# kiset

CLI tool for managing local DNS and HTTP services with custom `.local` domains. kiset sets up dnsmasq for DNS resolution and Caddy for serving local content, perfect for development environments and local testing.

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
bun install -g kiset
```

### Install from Source

```bash
git clone <repository-url>
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

## Usage

### Start Services

Start dnsmasq (DNS) and Caddy (HTTP) in detached mode:

```bash
kiset start
```

Start in foreground mode (useful for debugging):

```bash
kiset start --no-detached
```

**Default Ports:**

- DNS (dnsmasq): `127.0.0.1:5353`
- HTTP (Caddy): `127.0.0.1:8443`

### Stop Services

Stop all running services:

```bash
kiset stop
```

### Check Status

View service status and health:

```bash
kiset status
```

Output example:

```
dnsmasq  ✓ running (PID: 12345, Port: 5353) - healthy
caddy    ✓ running (PID: 12346, Port: 8443) - healthy
```

### How to trust Caddy

- If running in WSL instance, import the certificate in Windows using the command `certutil -addstore -f ROOT "$env:USERPROFILE\OneDrive\Desktop\root.crt"`
- For Firefox, follow the below steps:
   1. Settings → Privacy & Security → Certificates → View Certificates → Authorities
   2. Import `root.crt` → Check "Trust this CA to identify websites" → OK
- You need to manually remove these steps when you want to untrust the certificate

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
   - Config: `$XDG_CONFIG_HOME/kiset/` (default: `~/.config/kiset/`)
   - State: `$XDG_STATE_HOME/kiset/` (default: `~/.local/state/kiset/`)
   - Logs: `$XDG_STATE_HOME/kiset/logs/`

## Configuration

After starting kiset, configure your system DNS to use the local DNS server:

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
kiset/
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

You can also use kiset as a library in your TypeScript/JavaScript projects:

```typescript
import { start, stop, status } from "kiset"

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
   tail -f ~/.local/state/kiset/logs/dnsmasq.log
   tail -f ~/.local/state/kiset/logs/caddy.log
   ```

### DNS Not Resolving

1. Verify dnsmasq is running: `kiset status`
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
