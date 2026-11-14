# Security Policy

## Supported Versions

Only the latest release of KiranaKart Secure receives regular dependency refreshes and baseline rule updates.

| Version | Supported | Baseline Date |
| :--- | :--- | :--- |
| 1.0.x | Yes | November 2026 |

---

## Security Target & Quality Gate
This repository acts as the **negative control reference application** for SecureScan.
- Target: **Zero findings at or above Low severity** against the versioned OWASP Top 10:2021 and CWE Top 25 baseline.
- Target: **Zero DPDP non-compliance findings** against the Digital Personal Data Protection Act, 2023.

---

## Reporting a Vulnerability
If you discover an unexpected security vulnerability or unintended compliance regression on `main`:
1. Do not open a public GitHub issue.
2. Submit a report directly to the Security Team at `security@kiranakart.local` or to the Data Protection Officer at `dpo@kiranakart.local`.
3. Include the affected file, CWE/DPDP classification, and reproduction steps.
4. We aim to acknowledge receipt within 24 hours and address verified defects in accordance with our 72-hour turnaround commitment.
