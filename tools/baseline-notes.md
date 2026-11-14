# Baseline Verification Notes & Justifications

**Baseline Stamp:** 2026-11-14  
**Rule Pack Version:** OWASP Top 10:2021-v1.4, DPDP-Rules-2026-Draft  
**Scanner Version Target:** SecureScan v1.0  
**Baseline Quality Gate:** 0 Findings at Low severity or above; 0 DPDP non-compliance findings  

---

## 1. Allowed Informational-Only Findings & Justifications

| ID | Informational Finding | Justification |
| :--- | :--- | :--- |
| INFO-01 | Unauthenticated public `/health` endpoint | Intentionally public for container orchestrator readiness and liveness probes; contains no sensitive metadata or environment dump. (Refer to `hard-negatives/HN-08_public_healthcheck.js`). |
| INFO-02 | Non-TLS HTTP protocol on internal Docker network | Inter-container communication between backend and internal mock services occurs over an isolated Docker bridge network not accessible on external network interfaces. (Refer to `hard-negatives/HN-09_internal_container_http.js`). |
| INFO-03 | Synthetic non-cryptographic `Math.random` in UI styling | Used exclusively for non-cryptographic stagger jitter in frontend UI animation delays. Cryptographically secure `crypto.randomBytes` / `crypto.randomInt` is strictly utilized for OTPs, tokens, and session identifiers. (Refer to `hard-negatives/HN-06_non_crypto_random.js`). |

---

## 2. Pinned Rule Baseline
- OWASP Top 10:2021 (A01 to A10)
- CWE Top 25 (2025/2026 Edition)
- India Digital Personal Data Protection Act (DPDP Act, 2023) Sections 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16.
