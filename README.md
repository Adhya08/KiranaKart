# KiranaKart Secure: Hardened, DPDP-Compliant Reference App for SecureScan

[![Security Baseline](https://img.shields.io/badge/OWASP%20Top%2010-0%20Findings-brightgreen.svg)]()
[![DPDP Act 2023](https://img.shields.io/badge/DPDP%20Act%202023-Compliant%20Baseline-blue.svg)]()
[![Baseline Gate](https://img.shields.io/badge/Negative%20Control%20Precision-100%25-success.svg)]()

> **Note on the claim "no flaws":** No real application can be proven flawless. In this project, "secure and compliant" is a **testable, defined target**: zero findings (above an agreed informational level) against a fixed, versioned rule baseline (OWASP Top 10:2021, selected CWE Top 25, secrets, dependency, IaC, and DPDP rule packs). The baseline version is recorded in the repository and re-verified on every release. DPDP interpretation should be confirmed by qualified legal counsel.

---

## 1. Purpose and Overview
SecureScan scans application repositories for security vulnerabilities and evaluates compliance against India's **Digital Personal Data Protection (DPDP) Act, 2023** and notified Rules.

While the companion project **KiranaKart (vulnerable)** provides known-bad code to measure scanner *recall*, **KiranaKart Secure** provides the **known-good negative control** to measure scanner *precision*:
- **Target App:** Hyperlocal 10-minute grocery ordering web app, store owner portal, and admin center.
- **Domain:** Grocery catalog, cart, coupons, orders, invoices, reviews, customer profile, and comprehensive privacy center.
- **Goal:** Zero SecureScan findings at or above Low severity, and zero DPDP non-compliance flags on `main`.

---

## 2. Key Architectural Security & Privacy Controls

### OWASP Top 10:2021 Controls
- **A01: Broken Access Control (C-A01-01 to C-A01-05):** Strict object lookup scoping (IDOR defense); RBAC middleware on `/api/admin/*`; request allow-list schema preventing mass assignment of roles; opaque attachment IDs; SameSite cookies & anti-CSRF token verification.
- **A02: Cryptographic Failures (C-A02-01 to C-A02-05):** Bcrypt/Argon2id password hashing with work factor 12; zero hardcoded credentials; AES-256-GCM field-level encryption for sensitive PII columns; TLS/HSTS headers; cryptographically secure CSPRNG tokens & OTPs.
- **A03: Injection (C-A03-01 to C-A03-05):** Parameterised SQL queries across all repositories; context-aware output encoding and allow-list HTML sanitization for user reviews; zero shell subprocess execution in invoice generation; numeric type coercion.
- **A04: Insecure Design (C-A04-01 to C-A04-03):** Progressive rate limiting on authentication routes; high-entropy, hashed, single-use password reset tokens; server-side price computation and atomic coupon verification.
- **A05: Security Misconfiguration (C-A05-01 to C-A05-07):** Strict CORS allowlist without wildcard credentials; generic error responses with correlation IDs; debug mode disabled by default; non-root container user; disabled directory listing; Helmet security headers (CSP, X-Frame-Options); XML parser with disabled external entities (XXE defense).
- **A06: Vulnerable Components (C-A06-01 to C-A06-03):** Patch-pinned dependencies with committed lockfile; minimal pinned base container image; self-hosted frontend assets with Subresource Integrity (SRI) hashes.
- **A07: Identification & Auth (C-A07-01 to C-A07-05):** Password complexity policy; short-lived JWTs with refresh rotation and server-side revocation list; pinned HS256 algorithm verification; timing-safe comparisons.
- **A08: Software & Data Integrity (C-A08-01 to C-A08-04):** Strict JSON schema validation; uploads verified by type, magic bytes, and size cap; stored outside web root with random UUID filenames.
- **A09: Logging & Monitoring (C-A09-01 to C-A09-03):** Structured JSON logging with automated redaction of passwords, tokens, and PII; audit logging of security events; neutralization of CRLF control characters.
- **A10: SSRF Defense (C-A10-01):** Outbound URL fetching restricted to an approved host allowlist, with strict blocking of private/loopback IP ranges and cloud metadata endpoints.
- **Additional Classes (C-X-01 to C-X-08):** Open redirect prevention; ReDoS linear regex; prototype pollution protection; atomic database transaction locks; isolated container network.

### DPDP Act 2023 Controls (DC-01 to DC-24)
- **Notice & Granular Consent (S4 - S6):** Clear standalone notice in English and 5 Eighth Schedule languages (Hindi, Kannada, Tamil, Telugu, Bengali); unticked, separate checkboxes for non-essential purposes; unbundled from Terms; immutable append-only consent ledger; frictionless withdrawal toggle.
- **Children's Data (S9):** Automated age-gate; verifiable parental consent flow for minors under 18; strict server-side and client-side lockout of behavioural tracking, profiling, and targeted ads.
- **Data Principal Rights (S11 - S14):** Right to Access ("Download My Data" comprehensive JSON export); Right to Erasure (true cryptographic erasure); Right to Correction; Right of Nomination (Section 14).
- **Fiduciary Safeguards (S8, S10, S16):** Data Protection Officer published contact (`dpo@kiranakart.local`); 72-hour grievance redressal SLA with direct escalation link to the Data Protection Board of India; breach notification runbook; automated data retention purge job; Significant Data Fiduciary (SDF) governance readiness; India-region storage localization.

---

## 3. Quickstart & Local Setup

### Prerequisites
- Node.js (v18+)
- Python 3.8+ (for scoring and verification scripts)

### Installation & Run
```bash
# 1. Install dependencies
npm install

# 2. Start the application
npm start
```

The application will be running at `http://localhost:4000` with seeded synthetic data.

### Quick Persona Logins (All passwords: `Password123!`)
- **Customer:** `aarav@example.com`
- **Store Owner:** `ramesh@example.com`
- **Admin:** `admin@example.com`
- **Minor (<18):** `ananya.minor@example.com`

---

## 4. Verification & Testing Tools

### 1. Verify Clean Baseline
```bash
# Run baseline scoring and ground-truth validation
python tools/score.py
```

### 2. Real-Time Flaw Injection
To measure SecureScan's detection recall on demand, inject single named vulnerabilities or compliance regressions:
```bash
# List available injectable flaws
node tools/inject.js --list

# Inject IDOR vulnerability (V-A01-01)
node tools/inject.js --flaw V-A01-01

# Revert back to clean baseline
node tools/inject.js --revert
```

---

## 5. Repository Structure
```
kiranakart-secure/
  README.md                  # Purpose, baseline claim wording, setup
  SECURITY.md                # Vulnerability disclosure & supported versions
  Dockerfile                 # Hardened multi-stage non-root container
  docker-compose.yml         # Segmented internal network compose
  .github/workflows/ci.yml   # Pinned SHA Actions CI pipeline
  backend/src/               # Express app, routes, controllers, services, repositories
  frontend/public/           # Single-page UI, styles, multilingual notice
  db/                        # schema.sql (encrypted columns), seed.sql (synthetic)
  privacy/                   # Multilingual notice, policy, RoPA, breach runbook, SOP, DPIA
  hard-negatives/            # 10 safe look-alike patterns (HN-01 to HN-10)
  groundtruth/               # controls.json, dpdp-controls.json, pairs.json
  tools/                     # verify-baseline.sh, inject.js, score.py, reset.sh
```

---

## 6. License & Disclaimer
This software is provided for test benchmarking purposes only and does not constitute formal legal advice or statutory compliance certification under the DPDP Act, 2023.

