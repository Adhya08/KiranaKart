# KiranaKart Secure: Hardened, DPDP-Compliant Reference App for SecureScan

**Document type:** Product Requirements Document (PRD) + Functional Requirements Document (FRD) **Product under test:** SecureScan (repository security and DPDP compliance scanner) **Target app (this project):** KiranaKart Secure, the secure and compliant twin of the intentionally vulnerable KiranaKart **Version:** 1.0 (Draft) | **Date:** 14 November 2026

> **Note on the claim "no flaws":** No real application can be proven flawless. In this project, "secure and compliant" is a **testable, defined target**: zero findings (above an agreed informational level) against a fixed, versioned rule baseline (OWASP Top 10:2021, selected CWE Top 25, secrets, dependency, IaC and DPDP rule packs). The baseline version is recorded in the repo and re-verified on every release. DPDP interpretation should be confirmed by qualified counsel.
.
---

# PART A: PRODUCT REQUIREMENTS DOCUMENT (PRD)

## 1. Purpose and Background

SecureScan scans application repositories for security weaknesses and checks compliance with India's **Digital Personal Data Protection (DPDP) Act, 2023** and its Rules. The companion project, **KiranaKart (vulnerable)**, supplies known-bad code to measure *recall* (does SecureScan find real problems?). This project supplies the opposite: a **known-good negative control** to measure *precision* (does SecureScan stay quiet when the code is correct?).

Both projects share the same business domain, features, data model and API shape. Every flaw in the vulnerable app has a documented, fixed counterpart here, so the pair works as a before and after benchmark.

## 2. Problem Statement

- A scanner that reports everything looks good on recall but is useless in practice if it floods developers with false positives.
- Without a clean reference app, SecureScan's false-positive rate on genuinely secure and compliant code cannot be measured.
- Compliance engines must be shown to **pass** a compliant app, not only to fail a non-compliant one (for example, recognising a proper consent record, erasure flow, parental consent and breach process).
- Real-time scanning needs a stable baseline so that regressions (a new flaw introduced in a commit) are clearly distinguishable from background noise.

## 3. Goals

| ID | Goal |
| --- | --- |
| G1 | Deliver a fully working app with **zero SecureScan findings** at or above Low severity on the defined rule baseline. |
| G2 | Implement a documented secure control for **every vulnerability class** in the vulnerable twin (1:1 mapping). |
| G3 | Implement a documented DPDP-compliant control for **every DPDP scenario** in the vulnerable twin (1:1 mapping). |
| G4 | Provide a machine-readable **control manifest** stating what is protected and where, so "expected result: no finding" is explicit and auditable. |
| G5 | Provide "tricky-but-safe" patterns (hard negatives) that commonly trigger false positives. |
| G6 | Serve as the baseline for real-time testing: a clean `main` branch to which single flaws can be injected and detected. |
| G7 | Run with one command and be reproducible. |

## 4. Non-Goals

- Not a claim of absolute, provable security or of legal certification under the DPDP Act.
- Not a template for production without review; it is a reference implementation for testing a scanner.
- Not a penetration test report, and not a replacement for human code review or a formal DPIA.
- No real personal data; all data is synthetic.

## 5. Stakeholders and Users

| Stakeholder | Interest |
| --- | --- |
| SecureScan developers | Measure false positives and verify "pass" logic |
| SecureScan QA | Stable clean baseline for regression and CI gating |
| Compliance reviewers | Evidence that the DPDP engine recognises compliant implementations |
| Sales and demo teams | Show a "green" scan next to the "red" scan of the vulnerable twin |
| Customers and trainees | Reference for secure and privacy-respecting implementation |

## 6. Product Overview: KiranaKart Secure

A hyperlocal grocery ordering app (customer web app, store-owner portal, admin panel, REST API) handling names, phone numbers, addresses, location, order data, payment references and date of birth (including minors). Functionality is **identical** to the vulnerable twin, so the same scanner configuration can be used against both.

## 7. Scope

**In scope**

- Web app and REST API with secure implementations of all features.
- Dependency manifests with current, patched, pinned and locked dependencies.
- Hardened infrastructure files (Dockerfile, compose, CI workflows, sample env files).
- Complete privacy artefacts: notice, consent UI, policy, retention schedule, data inventory, breach runbook, grievance process.
- Control manifest, hard-negative code and baseline verification tooling.

**Out of scope**

- Mobile apps, real payment gateways, real SMS or email delivery (mocked).
- Production deployment guidance.

## 8. Success Metrics

| Metric | Target |
| --- | --- |
| SecureScan findings at Low severity or above on `main` | 0 |
| SecureScan DPDP non-compliance findings on `main` | 0 |
| False-positive rate across hard-negative patterns | at most 5% of patterns flagged (target 0) |
| Informational-only findings | Allowed, but each must be listed and justified in `baseline-notes.md` |
| Single injected flaw detected in real-time scan | 100% for the sampled flaw set |
| Scan time (push to result) | under 3 minutes |
| Setup time on a fresh machine | under 10 minutes |

## 9. Assumptions, Constraints, Risks

- **Assumption:** SecureScan accepts a Git repo (and optionally a running URL) and emits JSON or SARIF.
- **Constraint:** Everything runs locally and offline-capable; no real cloud accounts.
- **Risk:** New CVEs appear in dependencies after release, making the clean baseline "dirty". *Mitigation:* scheduled weekly dependency refresh, a lockfile, and a dated baseline stamp. A new CVE counts as a legitimate finding, and the baseline is re-pinned.
- **Risk:** Scanner rule updates produce new findings. *Mitigation:* version-pin the rule baseline and review each rule update against this repo before adopting it.
- **Risk:** DPDP Rules are phased and may be amended. *Mitigation:* versioned DPDP rule pack; section-level references (stable) are separate from rule-level references (updatable). Verify current commencement and Rule text each release.
- **Risk:** Over-claiming compliance. *Mitigation:* README and manifest use "meets the defined baseline" wording, never "certified compliant".

## 10. Release Plan

| Milestone | Deliverable |
| --- | --- |
| M1 | Core app, Docker setup, synthetic seed data (same features as vulnerable twin) |
| M2 | Security controls for A01 to A10 and additional classes, control manifest v1 |
| M3 | DPDP controls and privacy artefacts |
| M4 | Hard negatives, injection toggles for real-time testing, baseline verification script |
| M5 | Paired comparison report (vulnerable vs secure), v1.0 tag |

---

# PART B: FUNCTIONAL REQUIREMENTS DOCUMENT (FRD)

## 1. System Architecture

| Layer | Choice | Notes |
| --- | --- | --- |
| Frontend | React (or server-rendered templates with auto-escaping) | Same screens as vulnerable twin |
| Backend | Node.js + Express (same stack as the twin) | Layered: routes, controllers, services, repositories |
| Database | PostgreSQL + Redis | Parameterised access, field-level encryption for sensitive columns |
| Storage | Local mock object store, outside web root | Files served only through authorised handlers |
| Infra | Docker, docker-compose, GitHub Actions | Hardened, least privilege |
| Mocks | Fake payment, SMS, email, analytics | In-India mock endpoints; no foreign transfer |

## 2. Repository Layout

```
kiranakart-secure/
  README.md                  (purpose, claim wording, setup)
  SECURITY.md                (reporting, supported versions)
  docker-compose.yml
  .github/workflows/         (hardened CI)
  backend/src/               routes/ controllers/ services/ middleware/ models/ utils/
  frontend/
  db/                        schema.sql (encrypted columns), seed.sql (synthetic)
  privacy/                   notice, consent texts (multi-language), policy,
                             retention schedule, data inventory (RoPA),
                             breach runbook, grievance SOP, DPIA summary
  hard-negatives/            safe look-alike patterns
  groundtruth/
    controls.json            (security control manifest)
    dpdp-controls.json       (DPDP control manifest)
    pairs.json               (vulnerable ID -> fixed control ID)
  tools/
    verify-baseline.sh, inject.js, score.py, reset.sh
```

## 3. Functional Requirements: Application Features

Features match the vulnerable twin one for one, so both apps can be scanned with the same configuration.

| Module | Requirements |
| --- | --- |
| **Auth (FR-AUTH)** | Register (name, phone, email, password, DOB, address); login by email or phone; password reset with expiring single-use token or OTP; roles customer, store owner, admin; secure session cookie. |
| **Profile (FR-PROF)** | View and edit own profile; upload photo and optional ID proof; multiple addresses and location; full "download my data" export. |
| **Catalogue (FR-CAT)** | Browse by category; keyword search; product reviews displayed to other users. |
| **Orders (FR-ORD)** | Cart, coupon, place order; order history and detail; mock payment; invoice generation; order tracking. |
| **Store portal (FR-STORE)** | Inventory and price management; view orders for own store; bulk product import (CSV or XML). |
| **Admin (FR-ADMIN)** | List, search, edit users; view logs; app settings and feature flags. |
| **Support and integrations (FR-INT)** | Support tickets with attachments; promotional messages (consent-gated); analytics (consent-gated, India-hosted mock); import from URL (restricted). |
| **Privacy (FR-PRIV)** | Layered notice; granular consent banner; policy page; consent withdrawal; account erasure; grievance form; nominee management. |

## 4. Security Control Catalogue (Fixes Paired to Each Flaw)

Each row corresponds to a vulnerability ID in the vulnerable twin. The "Expected SecureScan result" is always **no finding**. Controls are listed in `groundtruth/controls.json` and each is paired in `pairs.json`.

### 4.1 A01: Broken Access Control

| Control ID | Fixes | Implementation requirement |
| --- | --- | --- |
| C-A01-01 | V-A01-01 (IDOR) | Every object lookup is scoped to the authenticated owner or an authorised role via a central authorisation layer; unauthorised access returns 404 or 403. |
| C-A01-02 | V-A01-02 | Role-based access middleware on all `/api/admin/*` routes, deny by default. |
| C-A01-03 | V-A01-03 | Request bodies validated against an explicit allow-list schema; `role` and other privileged fields can never be set by the client. |
| C-A01-04 | V-A01-04 | Files referenced by opaque ID, not path; resolved paths are normalised and verified to stay under a fixed base directory. |
| C-A01-05 | V-A01-05 | CSRF protection (synchronizer or double-submit token) plus `SameSite` cookies on all state-changing requests. |

### 4.2 A02: Cryptographic Failures

| Control ID | Fixes | Implementation requirement |
| --- | --- | --- |
| C-A02-01 | V-A02-01 | Passwords hashed with Argon2id (or bcrypt with an adequate cost factor), unique salt per user. |
| C-A02-02 | V-A02-02 | No secrets in code; secrets loaded from environment or a secret store; sample env file contains placeholders only. |
| C-A02-03 | V-A02-03 | Sensitive columns (ID number, DOB, payment reference) encrypted with AES-256-GCM using keys outside the repo; card numbers are never stored (tokenised reference only). |
| C-A02-04 | V-A02-04 | TLS enforced (modern protocols only), HSTS enabled, secure cookie flag set. |
| C-A02-05 | V-A02-05 | OTPs and tokens generated from a cryptographically secure random source, short expiry, single use. |

### 4.3 A03: Injection

| Control ID | Fixes | Implementation requirement |
| --- | --- | --- |
| C-A03-01 | V-A03-01 | All database access uses parameterised queries or a vetted ORM; no string-built SQL. |
| C-A03-02 | V-A03-02, V-A03-03 | Context-aware output encoding by default; framework auto-escaping on; review text sanitised with an allow-list sanitiser. |
| C-A03-03 | V-A03-04 | No shell invocation; invoice generation uses a library API with validated parameters. |
| C-A03-04 | V-A03-05 | Request fields type-checked and cast before use in queries. |
| C-A03-05 | V-A03-06 | Templates are static; user data passed only as escaped variables, never as template source. |

### 4.4 A04: Insecure Design

| Control ID | Fixes | Implementation requirement |
| --- | --- | --- |
| C-A04-01 | V-A04-01 | Rate limiting and progressive lockout on login, OTP and reset endpoints. |
| C-A04-02 | V-A04-02 | Reset tokens are long, random, hashed at rest, expire quickly and are single use. |
| C-A04-03 | V-A04-03 | Prices and discounts computed server-side; coupons validated for limits and single redemption per rules. |

### 4.5 A05: Security Misconfiguration

| Control ID | Fixes | Implementation requirement |
| --- | --- | --- |
| C-A05-01 | V-A05-01 | CORS allow-list of explicit origins; no wildcard with credentials. |
| C-A05-02 | V-A05-02 | Generic error responses with a correlation ID; details only in protected logs. |
| C-A05-03 | V-A05-03 | No default credentials; debug off; production-like config by default. |
| C-A05-04 | V-A05-04 | Minimal pinned base image (by digest), non-root user, read-only filesystem where possible, dropped capabilities. |
| C-A05-05 | V-A05-05 | No directory listing; `.git`, backups and dotfiles excluded from build context and web root. |
| C-A05-06 | V-A05-06 | Security headers set: CSP, X-Content-Type-Options, frame protection, Referrer-Policy, Permissions-Policy. |
| C-A05-07 | V-A05-07 | XML parser configured with external entities and DTDs disabled. |

### 4.6 A06: Vulnerable and Outdated Components

| Control ID | Fixes | Implementation requirement |
| --- | --- | --- |
| C-A06-01 | V-A06-01, V-A06-02 | Current patched dependencies, lockfile committed, automated update PRs, no known-CVE packages at baseline date. |
| C-A06-02 | V-A06-03 | Supported, minimal base image pinned by digest. |
| C-A06-03 | V-A06-04 | Frontend assets self-hosted or loaded with Subresource Integrity hashes. |

### 4.7 A07: Identification and Authentication Failures

| Control ID | Fixes | Implementation requirement |
| --- | --- | --- |
| C-A07-01 | V-A07-01 | Password policy per current guidance (length-based, breached-password check). |
| C-A07-02 | V-A07-02 | Short-lived access tokens, refresh rotation, server-side revocation on logout. |
| C-A07-03 | V-A07-03 | JWT verification pins the algorithm and validates signature, expiry, issuer and audience. |
| C-A07-04 | V-A07-04 | Session ID regenerated on login and privilege change. |
| C-A07-05 | V-A07-05 | Uniform authentication error messages and timing-safe comparisons. |

### 4.8 A08: Software and Data Integrity Failures

| Control ID | Fixes | Implementation requirement |
| --- | --- | --- |
| C-A08-01 | V-A08-01 | Only data formats (JSON) with schema validation; no unsafe deserialisation. |
| C-A08-02 | V-A08-02 | CI never pipes remote scripts to a shell; downloads verified by checksum or signature. |
| C-A08-03 | V-A08-03 | Third-party Actions pinned to full commit SHAs; workflow token permissions minimal. |
| C-A08-04 | V-A08-04 | Uploads validated by type, content and size; stored outside web root with random names; served via authorised handler. |

### 4.9 A09: Security Logging and Monitoring Failures

| Control ID | Fixes | Implementation requirement |
| --- | --- | --- |
| C-A09-01 | V-A09-01 | Structured logging with redaction of passwords, tokens, OTPs, payment and personal identifiers. |
| C-A09-02 | V-A09-02 | Authentication failures, access denials and admin actions logged with user, time and correlation ID. |
| C-A09-03 | V-A09-03 | Log fields encoded; newlines neutralised. |

### 4.10 A10: Server-Side Request Forgery

| Control ID | Fixes | Implementation requirement |
| --- | --- | --- |
| C-A10-01 | V-A10-01 | URL import allows only an approved host allow-list over HTTPS, resolves and blocks private, loopback and link-local addresses, limits redirects, size and time. |

### 4.11 Additional Classes

| Control ID | Fixes | Implementation requirement |
| --- | --- | --- |
| C-X-01 | V-X-01 | No secrets in repo or history; pre-commit and CI secret scanning enabled. |
| C-X-02 | V-X-02 | CI secrets masked; never echoed. |
| C-X-03 | V-X-03 | Redirect targets validated against an allow-list of relative paths. |
| C-X-04 | V-X-04 | Linear-time regular expressions; input length caps. |
| C-X-05 | V-X-05 | Atomic database transactions with row locking or unique constraints for redemptions. |
| C-X-06 | V-X-06 | Safe merge utilities that reject `__proto__` and `constructor` keys; objects without prototypes where needed. |
| C-X-07 | V-X-07 | No debug or backdoor routes; admin access only through normal authenticated, audited flows. |
| C-X-08 | V-X-08 | Database on an internal-only network, no public ports, private storage, segmented compose networks. |

**Target total:** every flaw ID in the vulnerable twin has a mapped control (at least 50 controls).

## 5. DPDP Act Compliance Control Catalogue

Each control fixes the matching non-compliance scenario in the vulnerable twin. The Act-section column is stable; Rule-level references live in an updatable field of the manifest and must be verified against the Rules as currently notified.

### 5.1 Notice and Consent (Sections 4 to 6)

| Control ID | Fixes | Act ref. | Implementation requirement |
| --- | --- | --- | --- |
| DC-01 | D-01 | S5 | Clear, standalone notice at or before collection: personal data collected, purpose, how to exercise rights, how to complain to the Board. |
| DC-02 | D-02 | S6 | Consent UI with unticked, separate, granular checkboxes; not bundled with Terms of Service. |
| DC-03 | D-03 | S6 | Service access never conditioned on consent to unnecessary purposes (marketing, analytics, sharing are optional). |
| DC-04 | D-04 | S6 | Consent ledger storing user, purpose, notice version, timestamp, channel and status, with an audit trail. |
| DC-05 | D-05 | S6(4) | Withdrawal control in profile settings, as easy as giving consent, effective immediately and propagated to processors. |
| DC-06 | D-06 | S5, S6 | Notice and consent available in English and Eighth Schedule languages (at least Hindi plus two more in v1; all languages as a stretch goal). |
| DC-07 | D-07 | S4 | Processing limited to stated purposes; purpose tags attached to every personal-data field and checked in code. |
| DC-07a | (new) | S6(7) to S6(9) | Optional integration point for a registered Consent Manager (documented interface, mocked). |

### 5.2 Data Fiduciary Obligations (Section 8)

| Control ID | Fixes | Act ref. | Implementation requirement |
| --- | --- | --- | --- |
| DC-08 | D-08 | S8(5) | Reasonable security safeguards: all controls in section 4, mapped to DPDP in the manifest (`dpdp_relevant: true`). |
| DC-09 | D-09 | S8(6) | Breach detection alerts, incident runbook, templates for intimating the Board and affected users, and log retention in line with the Rules (verify period). |
| DC-10 | D-10 | S8(7) | Retention schedule per data category and an automated purge job; erasure when purpose is served or consent withdrawn, subject to legal retention. |
| DC-11 | D-11 | S8(3) | Input validation, user-initiated correction flow, periodic data-quality review job. |
| DC-12 | D-12 | S8(1), S8(2) | Processor register listing each processor, purpose and data shared; data-processing agreement reference per processor; shared fields minimised. |
| DC-13 | D-13 | S8(9) | Published business contact (or DPO contact) for questions on processing, shown in the notice, policy and app footer. |
| DC-14 | D-14 | S8(10) | Grievance redressal: in-app form, ticket ID, acknowledgement, published response-time commitment, escalation path to the Board. |

### 5.3 Data Principal Rights (Sections 11 to 14)

| Control ID | Fixes | Act ref. | Implementation requirement |
| --- | --- | --- | --- |
| DC-15 | D-15 | S11 | "Download my data" covers profile, orders, location history, tickets, consent history and the list of processors and parties with whom data is shared. |
| DC-16 | D-16 | S12 | True erasure: personal data removed or irreversibly anonymised across tables, logs, caches, uploads and processor copies; retained records limited to legally required fields and documented. |
| DC-17 | D-17 | S12 | Self-service correction of name, phone, address and other fields. |
| DC-18 | D-18 | S14 | Nominee feature allowing the user to name a person to exercise rights on death or incapacity. |

### 5.4 Children's Data (Section 9)

| Control ID | Fixes | Act ref. | Implementation requirement |
| --- | --- | --- | --- |
| DC-19 | D-19 | S9(1) | Age gate at signup; for under-18 users, verifiable parental consent flow (mocked verification) before any processing; minors' accounts flagged. |
| DC-20 | D-20 | S9(3) | Tracking, behavioural monitoring and targeted advertising technically disabled for minors; enforced server-side and in SDK initialisation. |

### 5.5 Cross-Border Transfer and Other Obligations (Sections 10 and 16)

| Control ID | Fixes | Act ref. | Implementation requirement |
| --- | --- | --- | --- |
| DC-21 | D-21 | S16 | Data stored and processed in India-region endpoints; any transfer allow-list is explicit and documented, and checked against government notifications. |
| DC-22 | D-22 | S10 | Configuration flag for significant data fiduciary status; when on, requires DPO details, DPIA summary, audit report reference and algorithm due-diligence note, all present in `privacy/`. |
| DC-23 | D-23 | S8(1), S9 | No personal data in URLs, analytics events or error reports; automated tests assert this. |
| DC-24 | D-24 | S8(4) | Maintained data inventory and record of processing activities mapping fields, purposes, retention and processors. |

**Target total:** every D-xx scenario has a matching DC-xx control (at least 24 controls).

### 5.6 Synthetic Personal Data Rules

- Names, phone numbers (reserved or clearly fake ranges), emails (`@example.com`) and addresses are fabricated.
- Identity-like and card-like values are non-valid lookalikes with a documented fake prefix.
- Seed data includes at least 5 synthetic minor users, each with a parental-consent record, to exercise children's-data checks on the compliant path.

## 6. Hard-Negative (False-Positive Trap) Requirements

The `hard-negatives/` folder and some inline code contain secure code that superficially resembles vulnerable patterns. SecureScan must **not** flag them.

| ID | Hard negative | Why it is safe |
| --- | --- | --- |
| HN-01 | Dynamic SQL composed from a hard-coded allow-list of column names, with values bound as parameters | No user-controlled text enters the query |
| HN-02 | Use of `exec`-like function names in a comment, test or unrelated variable | Not an actual call |
| HN-03 | Variables named `password`, `token`, `secret` that read from environment or hold a hash | No hardcoded credential |
| HN-04 | Test fixtures with obviously fake keys in `/test/` with a documented allow-list entry | Non-functional test data |
| HN-05 | `innerHTML` assignment of a sanitised value passed through the approved sanitiser | Output is encoded and tested |
| HN-06 | Random number use for UI animation or jitter | Not security-relevant |
| HN-07 | Hash function usage (for example SHA-256) for file integrity or cache keys | Not password storage |
| HN-08 | A health-check route without authentication returning only a static status | Intentionally public, no data |
| HN-09 | HTTP (non-TLS) URL for an internal container-to-container healthcheck on an isolated network, documented | Not exposed externally |
| HN-10 | Fields named `dob` or `phone` in code that handle encrypted, purpose-tagged, consent-gated data | Compliant processing, should not trigger a PII warning by name alone |

## 7. Real-Time Testing Support

| ID | Requirement |
| --- | --- |
| FR-RT-01 | `main` is always the clean baseline and must scan clean; a CI job fails the build if SecureScan reports findings above the agreed level. |
| FR-RT-02 | `tools/inject.js` applies a small named patch that reintroduces one specific flaw (identical to the matching flaw in the vulnerable twin) on a throwaway branch, for example removing the ownership check on order lookup. |
| FR-RT-03 | Expected behaviour: the injected branch produces exactly the finding listed in `pairs.json`; reverting the patch returns the scan to clean. |
| FR-RT-04 | A GitHub Actions workflow (or webhook script) triggers SecureScan on each push and pull request. |
| FR-RT-05 | Compliance injection patches (for example, pre-ticking the consent box, replacing hard erasure with a soft delete) verify that SecureScan's DPDP engine detects regressions. |
| FR-RT-06 | Optional runtime mode: `/health` and a documented base URL allow dynamic checks against the running container, which should also be clean. |
| FR-RT-07 | `tools/reset.sh` restores the repo and database to the known baseline. |

## 8. Control Manifest Specification

Each control has a record in `groundtruth/controls.json` (security) or `groundtruth/dpdp-controls.json` (DPDP).

```json
{
  "id": "C-A03-01",
  "fixes": ["V-A03-01"],
  "title": "Parameterised queries for product search",
  "owasp": "A03:2021",
  "cwe": "CWE-89",
  "files": ["backend/src/repositories/productRepo.js"],
  "expected_scanner_result": "no_finding",
  "inject_patch": "patches/sqli_search.diff",
  "inject_expected_finding": "V-A03-01",
  "dpdp_relevant": true,
  "dpdp_refs": ["S8(5)"]
}
```

DPDP records add `act_section`, `rule_reference` (updatable), `evidence_type` (code, config, UI, document or data) and `verification` (how the compliance can be demonstrated, such as a unit test name or a document path).

## 9. Baseline Verification and Scoring

| ID | Requirement |
| --- | --- |
| FR-SC-01 | `tools/verify-baseline.sh` runs SecureScan on `main` and compares results to `controls.json`, `dpdp-controls.json` and `baseline-notes.md`. |
| FR-SC-02 | Output: total findings by severity and category, every unexpected finding listed, every informational finding checked against its justification. |
| FR-SC-03 | `tools/score.py` computes a **false-positive rate** (findings on clean code and hard negatives) and an **injection detection rate** (injected flaws found versus attempted). |
| FR-SC-04 | `tools/score.py` also produces a **paired comparison** against the vulnerable twin: for each pair, it should find the flaw in the twin and nothing in the secure app. |
| FR-SC-05 | Reports are written as JSON and Markdown; the CI job can fail below thresholds. |

## 10. Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-01 | **Parity:** feature set, routes, data model and file layout match the vulnerable twin so scanner configs are reusable. |
| NFR-02 | **Reproducibility:** `docker compose up` yields a running app with seeded synthetic data in under 10 minutes. |
| NFR-03 | **Isolation:** no outbound calls to real third-party services; all integrations mocked and India-region labelled. |
| NFR-04 | **Quality:** automated unit, integration and authorisation tests; security and privacy tests (for example asserting no PII in logs and URLs) run in CI. |
| NFR-05 | **Maintainability:** adding a control needs one code change, one manifest record, one injection patch and one pairing entry. |
| NFR-06 | **Freshness:** dependency and base-image refresh at least weekly, with the baseline stamp (date, rule-pack version, scanner version) updated in `baseline-notes.md`. |
| NFR-07 | **Honesty of claims:** documentation uses "meets the defined baseline" wording, never "certified" or "guaranteed". |
| NFR-08 | **Licensing:** open licence with a disclaimer that it is a test reference and not legal advice. |

## 11. Acceptance Criteria

1. SecureScan reports **zero findings at Low severity or above** and **zero DPDP non-compliance findings** on `main` at the recorded baseline version.
2. Every vulnerability ID in the vulnerable twin has a paired control, and every DPDP scenario has a paired compliance control, each present in code or documents and in the manifest.
3. At least 10 hard-negative patterns exist and none is flagged (or any flag is recorded as a false positive and counted in the metric).
4. All normal user journeys (register, consent, search, order, track, export, erase, grievance, admin) work end to end.
5. Injecting any sampled flaw produces exactly the expected finding, and reverting removes it, in a real-time scan.
6. Compliance regression patches (for example, a pre-ticked consent box) are detected by the DPDP engine.
7. The paired comparison report shows detection on the twin and a clean result here for at least 95% of pairs.
8. Setup works with one command and reset restores the baseline.

## 12. Traceability Overview

| PRD goal | FRD sections |
| --- | --- |
| G1 (zero findings) | 4, 5, 9, 11 |
| G2 (security controls 1:1) | 4, 8 |
| G3 (DPDP controls 1:1) | 5, 8 |
| G4 (control manifest) | 8 |
| G5 (hard negatives) | 6 |
| G6 (real-time baseline) | 7 |
| G7 (easy run and reset) | 2, 10 |

## 13. Open Questions

1. What severity threshold counts as "clean": Low and above, or Medium and above for the first release?
2. Should informational findings (for example a missing optional header) be allowed, and who approves each justification?
3. Does SecureScan's DPDP engine analyse documents (notice, policy, retention schedule) as well as code and config? If so, which formats must the privacy artefacts use?
4. Should the project include a second language variant (Python or Java) to match any variant of the vulnerable twin?
5. Which DPDP Rules provisions should be treated as in force at release time (confirm against the current notified text)?
6. Should dynamic (DAST) scanning be part of the clean baseline in v1, or static only?

*This document is a planning aid for testing software and does not constitute legal advice or a compliance certification. Have qualified counsel confirm the DPDP interpretation used in SecureScan's rule pack.*
