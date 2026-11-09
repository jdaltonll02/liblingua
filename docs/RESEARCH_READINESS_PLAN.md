# LibLingua Research Readiness Plan

Status: In progress  
Owner: LibLingua project  
Last updated: 2026-11-09

## Outcome

LibLingua can collect, review, release, retract, and reproduce ethically governed
language datasets whose provenance, consent, linguistic scope, quality decisions,
privacy protections, and evaluation splits are auditable.

## Working rules

- Complete phases in order unless a later change is needed to keep an earlier phase testable.
- Every phase must include automated tests and user-facing documentation where applicable.
- No public research release is approved until all release-gate items are complete.
- Decisions requiring project authority are marked **MANUAL GATE**. Implementation pauses at
  that gate only when the answer changes data rights, participant eligibility, or licensing.
- PostgreSQL and Hostinger MariaDB schemas must remain functionally equivalent.

## Phase 0 — Trustworthy engineering baseline

- [x] Make the existing backend and frontend test suites pass from the repository root.
- [x] Reconcile export behavior with its documented/tested schema.
- [x] Add research-readiness checks to the CI gate.
- [x] Record the baseline and deployment compatibility constraints.

Acceptance: `npm test` and production build pass without a live production database.

Baseline on 2026-11-09: 291 backend and 1 frontend tests pass locally. Seventeen
database integration tests are opt-in through `TEST_DATABASE_URL`; CI supplies an
isolated PostgreSQL service and runs them. Both Prisma providers are validated in CI.
The frontend production bundle is built without applying deployment migrations.

## Phase 1 — Governance and data-use policy

- [x] **MANUAL GATE 1:** Approve adult/minor participation policy, public/commercial-use
      scope, audio access model, dataset license direction, and community decision model.
- [x] Add versioned governance, acceptable-use, prohibited-use, and benefit-sharing documents.
- [x] Add database support for versioned research policies and human governance approvals.
- [x] Add a community advisory/review record and named release approvers.
- [x] Prevent publication when required governance approvals are absent.

Acceptance: every collection campaign and release points to approved governance terms.

## Phase 2 — Consent and participant rights

- [ ] Add and approve versioned consent documents.
- [x] Add append-only consent records tied to exact policy versions.
- [x] Capture separate scopes for text, target audio, English audio, public release,
      model training, commercial use, and future research.
- [x] Require valid consent before contribution and enforce it during export.
- [x] Add consent history, withdrawal requests, and participant self-service controls.
- [x] Guardian consent is not applicable: Manual Gate 1 approved an adult-only pilot;
      registration, profile updates, consent grants, submissions, exports, and releases enforce 18+ eligibility.

Acceptance: no contribution or export can bypass consent; withdrawal is covered by tests.

## Phase 3 — Linguistic identity and annotation protocol

- [x] Replace broad/free-text-only language and dialect metadata with controlled,
      community-approved language varieties while retaining contributor notes.
- [x] Record autonym, code set/version, orthography, script, register, code-switching,
      acquisition, proficiency, literacy, daily use, and translation uncertainty.
- [x] Version language-specific annotation guidelines.
- [x] Add alternative translation and untranslatable/culturally-sensitive outcomes.

Acceptance: each annotation is interpretable within a declared variety and guideline version.

## Phase 4 — Independent review and adjudication

- [x] Replace the validation Boolean as the source of truth with review states.
- [x] Add blind reviewer assignments, structured rubric scores, error labels, comments,
      revisions, and adjudication.
- [x] Remove automatic validation, self-assigned gold status, and default perfect scores from manual entry.
- [x] Keep language-specific surface similarity only as an anomaly signal, not inter-annotator agreement.
- [ ] Version and independently approve dialect-specific gold references.

Acceptance: released records meet a documented multi-reviewer rule with full provenance.

## Phase 5 — Source, annotation, and processing provenance

- [x] Record source dataset, source record ID, citation, license, copyright status,
      import timestamp, importer version, original text, and normalization history.
- [ ] Record annotation revisions, guideline version, collection campaign, app version,
      reviewer decisions, and exclusion reasons.
- [x] Add specialist review and release-eligibility controls for health and legal domains.
- [x] Add normalized exact-duplicate hashing and quarantine duplicate imports.
- [ ] Add near-duplicate source detection and grouping.

Acceptance: every released field can be traced to its source and processing history.

## Phase 6 — Privacy, withdrawal, and access tiers

- [x] Add public, registered-research, controlled, and internal export tiers.
- [x] Add pseudonymous release speaker IDs and demographic disclosure rules.
- [x] Remove internal quality signals, audio URLs, exact timestamps, and contributor demographics from public exports.
- [ ] Implement withdrawal effects for text, metadata, and stored audio.
- [ ] Rename or redesign account anonymization so its guarantees are accurate.

Acceptance: privacy and withdrawal policies are enforced by the export and storage layers.

## Phase 7 — Leakage-safe, reproducible splits

- [x] Replace translation-UUID splitting with immutable split manifests.
- [x] Group live exports by source sample as an immediate leakage safeguard.
- [x] Extend release manifests to group by near-duplicate family.
- [x] Support speaker-disjoint splits for speech tasks.
- [ ] Stratify by declared language variety and approved non-sensitive dimensions.
- [x] Store algorithm version, seed, manifest checksum, and held-out test approvals.

Acceptance: automated tests prove that source, duplicate family, and speaker leakage cannot occur.

## Phase 8 — Immutable releases and research documentation

- [x] Replace live-table publications with frozen release manifests and artifacts.
- [x] Add semantic version, schema version, Git commit, checksums, license, criteria,
      release approvers, changelog, corrections, retractions, and deprecation status.
- [ ] Generate a dataset card, NLP data statement, and machine-readable metadata.
- [x] Keep metadata available when a dataset is restricted or retracted.

Acceptance: a release can be reproduced byte-for-byte and remains citable over time.

## Phase 9 — Audio research quality

- [ ] Model speakers, recording sessions, utterances, devices, environments, and prompts.
- [ ] Record original format and derived format metadata.
- [ ] Add duration, silence, clipping, channel, sample-rate, and text-alignment checks.
- [ ] Separate ASR, speech-translation, bilingual-voice, and TTS eligibility.
- [ ] Enforce audio consent and controlled-access rules.

Acceptance: every published audio item has consent, technical QC, alignment, and task eligibility.

## Phase 10 — Pilot and release audit

- [ ] Run a small adult-only, supervised pilot for each approved language variety.
- [ ] Audit reviewer agreement, dialect balance, contributor concentration, source balance,
      privacy risk, rejection reasons, and withdrawal behavior.
- [ ] **MANUAL GATE 2:** Community/research leads approve or reject the first release candidate.
- [ ] Publish only after all release-gate checks pass.

Acceptance: signed release review plus a reproducible release candidate with no critical findings.

## Deferred until a governing decision exists

- Exact dataset license and commercial-use terms.
- Names and authority of community advisory representatives.
- Compensation and benefit-sharing amounts/mechanisms.
- Jurisdiction-specific ethics approval and child-participation requirements.
- Which voice data, if any, may be publicly downloadable.
