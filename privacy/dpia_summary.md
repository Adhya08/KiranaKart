# Data Protection Impact Assessment (DPIA) Summary (Section 10)

**Document Reference:** DPIA-2026-KK-01  
**Target Architecture:** KiranaKart Secure Hyperlocal Grocery Ecosystem  
**Assessor:** Independent Privacy and Cybersecurity Audit Group  
**Status:** Approved | Meets Section 10 Significant Data Fiduciary (SDF) standards  

---

## 1. Scope and Systematic Description
KiranaKart processes customer profiles, geolocation, and payment transactions across India. The scope of this assessment covers:
- User onboarding and multi-language consent capture
- Geolocation tracking for hyperlocal delivery within a 5 km radius
- Minor detection and parental consent verification
- Third-party data processor integrations

---

## 2. Assessment of Necessity and Proportionality
| Processing Activity | Necessity Justification | Safeguards Applied |
| :--- | :--- | :--- |
| Customer Delivery Address | Required for physical delivery of groceries | Stored with AES-256-GCM encryption; purged after account closure |
| Rider Geolocation Tracking | Required for order ETA estimation | Ephemeral updates; coordinates expunged 30 days post-delivery |
| Minor Age Gating | Required by Section 9(1) of DPDP Act | Automated age check; parent OTP verification; tracking disabled |

---

## 3. Risks Identified & Mitigations
1. **Risk:** Inadvertent profiling of minors (Section 9(3)).  
   *Mitigation:* Architectural kill-switch in middleware preventing analytics or ad SDK initialization if `user.is_minor == true`.
2. **Risk:** Unintended data leakage to third-party processors.  
   *Mitigation:* Processor register with strict DPA clauses and field minimisation (only tokenized IDs passed).
3. **Risk:** Residual personal data remaining after erasure requests.  
   *Mitigation:* Synchronous cryptographic shredding and database cascade purge with verified audit log.
