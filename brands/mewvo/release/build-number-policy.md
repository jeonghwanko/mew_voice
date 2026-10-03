# Store build numbers

Latest: 1.2.0 (89) uploaded to TestFlight via Jenkins #22. Jenkins #23 reserves the next sequential number for the account-deletion fix. Failed or aborted reservations remain consumed.
Jenkins #23 produced **1.2.0 (90)**. Both TestFlight and Play internal draft accepted it. The Play retry reused the archived binary and did not increment the counter.

Decision: 2026-09-10, user requested small sequential build numbers before review submission.

- Product version: `apps/mobile/app.json` → `expo.version` (currently `1.2.0`), matching package.json/package-lock.json.
- Store build number: `deploy/jenkins/mobile-ci.mjs` → `reserveBuildNumber`.
- Durable CI state: Mac agent `~/.mewvoice-ci/build-number.json` → `lastBuildNumber`.
- Migration baseline: public Android versionCode `86`. First reservation: `87`.
- One reservation is shared by Android versionCode and iOS CFBundleVersion in a `both` build.
- Failed reservations are not reused. Screenshots-only jobs do not reserve a number.
- Jenkins disables concurrent builds of this job. Do not share the counter with another job without adding cross-process locking.
- Back up the counter with the CI agent. Before replacing an agent or restoring state, inspect store usage and choose an unused number greater than all released builds and prior reservations.

The former timestamp builds (`211201992`, `211210772`) were uploaded but not released. Their historical artifacts keep their original numbers. Jenkins #19 successfully uploaded `1.1.1 (87)` to both stores. Google production/internal drafts were verified as `87`; Apple build `75ecc769-1e8a-4655-9716-5d53cc956285` was verified `VALID` and attached to version `1.1.1`.

Correction: upload acceptance of `1.1.1 (87)` did not establish review eligibility. The existing Apple marketing version was `1.1.86`; the replacement must use the higher `1.2.0`. CI validates numeric version components against that baseline. Always attach the exact intended build ID; do not select the largest number from historical builds.

Build 88 was reserved by Jenkins #21 and aborted before upload after discovering that the image-picker plugin removed microphone permissions. Jenkins #22 targets `1.2.0 (89)` with corrected microphone permissions and unused Android foreground service permissions removed.
