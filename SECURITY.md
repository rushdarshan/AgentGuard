# Security Policy

## Reporting a Vulnerability

AgentGuard is a security research tool designed to test and improve LLM safety.
If you discover a vulnerability in AgentGuard itself (not in a target agent being tested),
please report it privately.

**Do not file a public GitHub issue** for security vulnerabilities.

Send details to: rushdarshan2004@gmail.com

We will acknowledge receipt within 48 hours and provide an estimated timeline for a fix.

## Scope

- Bugs in AgentGuard's proxy, judging engine, or CLI that could compromise the host system.
- Authentication bypass in the dashboard or API.
- Remote code execution vectors introduced by AgentGuard code.

Out of scope: vulnerabilities in target agents discovered *using* AgentGuard
(those should be reported to the agent maintainer).
