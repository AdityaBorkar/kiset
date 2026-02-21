# TODO

## Features

1. Make it work. Test if installation works of caddy and dnsmasq. If not, ask the user to install. Give them command.
2. Versioning Script
      - Write Documentation for the `sdk`
      - Changelog
      - Readme File + Contributing File. Write ARCHITECTURE in CONTRIBUTING.md
      - Versioning
3. GitHub Actions for CI/CD.
      - .github checks
      - Always Audit (bun audit) before release.
      - .releaserc.json
      - Sync jsr.json with package.json  / Auto-update jsr.json based on package.json
      - versioning.ts and generate version
      - Tsup, Publish to JSR
      - Release
4. Setup GitHub Repository Script
5. Comprehensive Audit
      - Security Implications and Security Audit of this repository
      - Resolve lint errors and ts errors
6. sudo portless trust
7. Support { post_assignment: allow, deny } in global config
8. Start the reverse proxy and dnsmasq in a docker instance (and make sure it is fast!)
9. Husky - link markdown files

routes.json Maps hostnames to ports
routes.lock Prevents concurrent writes
proxy.pid PID of the running proxy
proxy.port Port the proxy is listening on
proxy.log Proxy daemon log output

## Marketing

1. Write a Personal Blog Post about the project
2. Spread the word on Twitter
3. AI Based Checklist for the project launch
