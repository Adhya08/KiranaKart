# Data Breach Incident Response Runbook & Notification Protocol (DPDP Act, Section 8(6))

## 1. Statutory Mandate
Under Section 8(6) of the DPDP Act 2023 and associated rules, in the event of a personal data breach, the Data Fiduciary must give intimation of the breach to:
1. The **Data Protection Board of India (DPBI)**
2. Each affected **Data Principal** (customer, vendor, employee)

---

## 2. Incident Classification & Timelines
- **Phase 1: Detection & Triage (T0 to T+4h):** Security log anomaly detected, incident correlation ID assigned, affected systems isolated.
- **Phase 2: Containment & Forensics (T+4h to T+12h):** Revoke affected credentials/tokens, apply patches, assess scope of compromise.
- **Phase 3: Statutory Board Intimation (T+12h to T+24h):** Send preliminary breach notification to DPBI via secure portal.
- **Phase 4: Data Principal Intimation (T+24h to T+48h):** Direct notification via registered email/SMS and prominent in-app alert.

---

## 3. Statutory Board Intimation Template (Form DPBI-BN-1)
```text
To: The Data Protection Board of India
Subject: Statutory Breach Intimation under Section 8(6) of DPDP Act, 2023

1. Data Fiduciary Name: KiranaKart Technologies Private Limited
2. Registration/CIN: U72200DL2024PTC998877
3. Date & Time of Occurrence: [YYYY-MM-DD HH:MM IST]
4. Nature of Incident: [e.g. Unauthorized token exposure / storage anomaly]
5. Categories of Personal Data Involved: [e.g. Phone numbers, masked delivery addresses]
6. Estimated Count of Affected Principals: [Count]
7. Likely Consequences: [Risk assessment]
8. Remedial Actions Taken: [Revocation of API keys, patch deployment, server isolation]
9. Contact Person: Smt. Priyanka Sharma, DPO (dpo@kiranakart.local, +91-11-44556677)
```

---

## 4. Affected Data Principal Notice Template
```text
Dear KiranaKart User,

We are writing to inform you of a security incident that occurred on [Date] affecting personal data associated with your grocery ordering profile.

What Happened: [Clear, plain-language description]
What Data Was Involved: [Specific items, e.g. Name and Delivery Address]
What Data Was NOT Involved: Your passwords remain hashed with Argon2id and payment card information is tokenized and was never accessed.
What We Have Done: We immediately contained the incident, applied security patches, and notified the Data Protection Board of India.
What You Should Do: Monitor your account for suspicious activity and feel free to reach our Grievance Officer at dpo@kiranakart.local.
```

