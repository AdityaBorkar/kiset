# TODO

1. Make it work
2. .github checks
3. .husky checks
4. scripts/ checks
5. Root Dir File Checks

---

1. Write a SECURITY.md & CONTRIBUTING.md & CHANGELOG.md-Versioning & README.md file for the project.
2. Biome Config, Tsup, Publish to NPM and JSR
3. GitHub Actions for CI/CD. Always Audit (bun audit) before release.
4. Write a Personal Blog Post about the project
5. Spread the word on Twitter
6. AI Based Checklist for the project launch

- Changelog
- Readme File + Contributing File
- Versioning
- Always Audit (bun audit) before release.
- Release
- Security Implications and Security Audit of this repository
- Test if installation works

**No Custom Error Types**

- Using generic `Error` class everywhere
- No domain-specific error types for better error handling
- No error codes or categorization

**No Logging Library**

- Using `console.log` and `console.error` directly
- No structured logging (JSON, levels, timestamps)
- No log rotation configuration
- No configurable log levels for debugging

**Inconsistent Error Handling**

- Some errors thrown, others logged and continued
- No standardized error handling pattern
- Mix of synchronous and asynchronous error handling approaches

**No Graceful Shutdown**

- No SIGTERM/SIGINT handlers in CLI
- Services may not stop cleanly on interrupt
- PID files may be left orphaned

**No Exit Code Standards**

- No explicit exit codes for different failure scenarios
- All exits use default code 0 or 1
- Makes script automation and monitoring difficult

**No Restart Logic**

- Services do not auto-restart on crash
- No watchdog mechanism
- No failure recovery strategies
