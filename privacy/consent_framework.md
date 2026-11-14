# KiranaKart Consent Framework & Architecture (DPDP Sections 4, 5, 6)

## 1. Statutory Architecture
The consent architecture of KiranaKart adheres strictly to the core tenants of Section 6 of the DPDP Act 2023:
1. **Free, Specific, Informed, Unconditional, and Unambiguous:**
   - Pre-ticked checkboxes are strictly prohibited.
   - Core grocery checkout is never conditioned upon marketing or analytics consent.
2. **Granular Purposes:**
   - `essential`: Cart processing, payment settlement, delivery fulfillment.
   - `order_updates`: Real-time order dispatch notifications via SMS/WhatsApp.
   - `marketing`: Promotional vouchers and customized product recommendations.
   - `analytics`: Performance diagnostics and crash analysis.
3. **Multi-lingual Notice & Consent:**
   - Rendered in English, Hindi, Kannada, Tamil, Telugu, and Bengali.
4. **Consent Ledger Specification:**
   - Every consent event (grant or withdrawal) produces an immutable record in `consent_ledger`:
     ```json
     {
       "user_id": "usr_9981",
       "purpose": "marketing",
       "status": "withdrawn",
       "notice_version": "2026.1",
       "timestamp": "2026-11-14T18:25:00Z",
       "channel": "web_privacy_center",
       "ip_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
     }
     ```
5. **Withdrawal Parity:**
   - Users can toggle consent off with a single click in their Privacy Center.
   - Downstream notification workers immediately cease promotional dispatch upon receipt of the withdrawal event.
