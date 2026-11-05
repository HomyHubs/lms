# ADR 0013 — Question images (slice-12)

Status: Accepted with the slice-12 PR.

## Context

Teachers need pictures in questions (Starter/Mover papers are mostly picture-based) and on single
options. Attempts keep a snapshot of their questions (ADR 0002) and published sets are frozen
(ADR 0011), so an image must not change or disappear under an attempt that already started, and a
student must not be able to fetch an exam picture before the exam is handed to them.

## Decision

1. **Upload.** `POST /api/media` (Admin/Teacher) takes the raw file as `application/octet-stream`
   (no multipart dependency). The type is decided by magic bytes (PNG, JPEG, WebP, GIF), never by
   the file name or the client header; limit 2 MB and 4000×4000 px. PNG text/eXIf chunks and JPEG
   APP1 (EXIF/XMP) are stripped; the image is otherwise stored as sent — no resize or re-encode, so
   no native image library is needed. WebP/GIF metadata is not stripped (accepted risk, small).
2. **Storage.** `media_assets` holds metadata only (sha256 unique, mime, bytes, size, storage key);
   bytes live behind `MediaStorage` (`put/get`). Only the `local` driver (`MEDIA_DIR`, temp file +
   rename) ships now; an S3-compatible driver is deferred until deploy needs it. Assets are
   content-addressed and immutable: the same bytes return the existing asset, nothing is rewritten.
3. **Links.** `question_media` (question, position, media, slot `stem | option`, option index; one
   image per option, max 10 per question) is replaced as a whole by `PUT /api/questions/:id/media`.
   A DB trigger rejects changes for a question held by a non-draft set (`restrict_violation`, API
   409), matching ADR 0011.
4. **Snapshot.** Starting an attempt copies the media ids of its questions into `exam_attempt_media`
   in the same transaction, and the question view carries `stemImages` / `optionImages` URLs. When
   options are shuffled their images move with them. Later edits to the bank question do not touch
   the old attempt, and FKs are `restrict` so a referenced asset cannot be deleted.
5. **Serving.** `GET /api/media/:id` needs a session. Managers read any asset; a student reads an
   asset only if it belongs to one of their own attempts — otherwise 404, so exam pictures do not
   leak before the start. Headers: real `Content-Type`, `Cache-Control: private, max-age=86400`,
   `X-Content-Type-Options: nosniff`, inline disposition; rate limit 600/min per user.

## Consequences

- Orphan assets (uploaded, never linked) are kept; a cleanup job is deferred.
- Bank question form and Word-import images (slice-11b) are not wired yet; the set editor is the
  entry point. Manual grading does not show images yet.
- The octet-stream body parser is registered in a scoped plugin and guarded so it can coexist with
  the import route of slice-11b.
