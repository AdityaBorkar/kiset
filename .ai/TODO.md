# TODO

## Features

1. Collect TODOs again and work on them
2. Support { post_assignment: allow, deny } in global config
3. Improve logging, JSON outputs, etc.
4. Cross Platform Support for: `autostart`, `trust`, `revoke_trust`, `revoke_autostart`
5. Infisical
6. Versioning Script
      - Write Documentation for the `sdk`
      - Changelog
      - Readme File + Contributing File. Write ARCHITECTURE in CONTRIBUTING.md
      - Versioning
7. GitHub Actions for CI/CD.
      - .github checks
      - Always Audit (bun audit) before release.
      - .releaserc.json
      - Sync jsr.json with package.json  / Auto-update jsr.json based on package.json
      - versioning.ts and generate version
      - Tsup, Publish to JSR
      - Release
8. Setup GitHub Repository Script
9. Comprehensive Audit
      - Security Implications and Security Audit of this repository
      - Resolve lint errors and ts errors
10. Husky - link markdown files

routes.json Maps hostnames to ports
routes.lock Prevents concurrent writes
proxy.pid PID of the running proxy
proxy.port Port the proxy is listening on
proxy.log Proxy daemon log output

## Marketing

1. Write a Personal Blog Post about the project
2. Spread the word on Twitter
3. AI Based Checklist for the project launch

## Future Features

- Custom Hostname using dnsmasq (example: adityaborkar.local)
      - This will be linked with mDNS to support these domains on the same network
      - HTTPS certificates remain valid across the local network.
- Tunnels
      - Webhooks support
- Web UI
- ABCloud
