# ADR 0010 — In-app notifications and automatic reminders (slice-9b)

Status: Accepted with the slice-9b PR.

## Context

Students who fail an exam can retake it after a cooldown (slice-5), and teachers have planned
sessions (slice-7), but nobody is told. Slice-2 already sends OTP over WhatsApp Cloud API or
Telegram, configured per environment. Users have a phone number but no Telegram chat id.

## Decision

1. **Outbox table.** `notifications` stores every reminder once per user (`dedupe_key` unique:
   `retake:<attemptId>`, `session:<sessionId>:<teacherId>`). The row is the in-app message and the
   delivery job at the same time: `delivery_status` pending → sent | failed, `delivery_attempts`,
   `last_error`, `sent_at`; `read_at` for the bell.
2. **Two reminders.** Retake: the latest attempt of a student for an exam is failed, attempts are
   left, the cooldown is over and the exam is still open. Session: a non-cancelled session starts in
   the next 24 h (Asia/Ho_Chi_Minh); the planned teacher is reminded, otherwise every class teacher.
3. **Scan → enqueue → deliver.** `runReminders` scans both sources, inserts with
   `on conflict do nothing`, then sends every pending row; a failed send is retried on the next run
   and given up (`failed`) after 3 attempts. One run at a time per process.
4. **Channel.** `NOTIFY_CHANNEL` = `whatsapp` | `telegram` | `console` (default). It reuses the
   slice-2 credentials; missing credentials fall back to `console` with a warning. Telegram sends
   to the single ops chat `TELEGRAM_CHAT_ID` with the phone number as prefix, since users have no
   chat id. The bell always shows the message, whatever the channel.
5. **Schedule.** In-process `setInterval` every `NOTIFY_INTERVAL_MINUTES` (default 15, `0` off),
   started on server ready and stopped on close; admins can also trigger `POST /notifications/run`.
6. **API.** `GET /notifications` (latest 20 + unread count), `POST /notifications/:id/read`,
   `POST /notifications/read-all` — always scoped to the signed-in user.

## Consequences

- With several API processes each runs the scan; dedupe keeps one row per reminder, but a pending
  row may be sent twice in a race. Fine for one process; a lock or a worker is needed to scale.
- No per-user opt-out and no grade-published notice yet.
- Real WhatsApp/Telegram delivery is untested until credentials exist in the environment.
