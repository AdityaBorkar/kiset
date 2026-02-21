---
description: Comprehensive code audit of the repository
agent: build
---
# Prompt

You are an expert software engineer and code auditor. Perform a comprehensive audit of this repository.

Your objectives:

1. **Bug Detection**

   * Identify logical bugs, edge-case failures, race conditions, incorrect assumptions, and broken flows.
   * Highlight unsafe patterns, undefined behavior, and potential runtime errors.
   * Point out incorrect error handling or missing validation.

2. **Code Quality Improvements**

   * Identify code smells, anti-patterns, duplication, poor abstractions, and violations of SOLID principles.
   * Suggest refactoring opportunities with clear reasoning.
   * Recommend improvements in readability, maintainability, and modularity.

3. **Performance Optimizations**

   * Detect inefficient algorithms, unnecessary I/O, blocking operations, memory waste, excessive allocations, or redundant computations.
   * Suggest concrete optimizations and explain expected impact.

4. **Architecture & Design**

   * Evaluate overall architecture, separation of concerns, dependency structure, and scalability.
   * Suggest structural improvements and better patterns where applicable.

5. **Security Issues**

   * Identify vulnerabilities such as injection risks, insecure defaults, improper secrets handling, unsafe file or network operations, and privilege issues.

6. **Reliability & Robustness**

   * Identify missing retries, timeouts, fallbacks, defensive programming, and resilience mechanisms.

7. **Best Practices Compliance**

   * Check adherence to language and ecosystem best practices.
   * Suggest improvements aligned with modern standards.

8. **Developer Experience Improvements**

   * Suggest improvements in:

     * project structure
     * naming
     * configuration management
     * logging
     * debugging capability
     * testability

9. **Actionable Output Format**

For each finding, provide:

* Severity: Critical / High / Medium / Low
* Category: Bug / Performance / Security / Architecture / Maintainability / DX
* File and location
* Description of the issue
* Why it is a problem
