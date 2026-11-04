# ADR 0002 — Fail-closed password reset destination

Status: Accepted for security containment, 2026-11-02; supersedes ADR0001 reset channel selection only.

Email-only is the owner's decision. Client recipient is forbidden. A recovery destination must be verified and resolved server-side. The current identity schema has email but no verification evidence/binding. Consequently the production store returns no eligible recovery identity; requests retain their generic success response without creating/sending OTPs. Existing outstanding OTPs must also be ineligible. No phone-derived email or assumed verification is permitted.

The provider adapter fails if credentials are missing (all environments); logs contain status/channel only, never OTP, destination or upstream response body. Optional providers remain code-only, inaccessible through reset API/UI until verified bindings and an explicit enablement contract exist.

Consequence: legitimate self-service recovery remains blocked until an identity verification/provisioning decision and implementation exist. This is an explicit blocker, not a completed recovery feature. No schema migration/backfill in this containment PR.
