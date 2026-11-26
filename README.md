# RemodelFlow

A Next.js MVP for managing homeowner remodeling inquiries and property-derived prospect records in San Jose, Santa Clara, and San Francisco.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## MVP features

- Overview dashboard with lead metrics, source breakdown, and a performance chart.
- Lead qualification form for kitchen, bathroom, ADU, and addition projects in the target Bay Area cities.
- Transparent lead score based on project, budget, timeline, and service location.
- Basic round-robin assignment to a demo sales team; status and location/source filters.
- Property CSV import. Supported header aliases include `name`/`fullname`, `phone`/`telephone`, `email`, `city`, and `project`/`projecttype`.
- Dialer-friendly CSV export with contact, qualification, assignment, source, and consent fields.
- Workspace DNC suppression and export eligibility checks.
- Consent timestamp displayed for opt-in leads.

## Consent, privacy, and production requirements

This MVP is a local browser prototype: records are stored in that browser's `localStorage`; it has no authentication, database, audit-grade consent evidence, or server-side suppression service. Do not upload sensitive personal data to a shared device or use demo records as real leads.

Property-derived records are explicitly marked as **not opted in** and are never included in the dialer export. Importing property data does not establish permission to call or text. The opt-in form checkbox is a prototype workflow control, not legal advice or a substitute for retaining the actual disclosure text, source, timestamp, and proof of consent. The in-app DNC list is only a basic workspace-level suppression control; verify applicable federal, state, and company-specific rules/lists before outreach. Review TCPA, TSR, California privacy, and other applicable requirements with qualified counsel before production use.

Before launch, add secure authentication, a production database, role-based access, encryption, server-side audit logs, durable consent artifacts, global suppression enforcement, retention/deletion workflows, rate limiting, and integrations for the specific dialers in use. CSV export is the current broad-compatibility path; API/webhook integrations are not included.
