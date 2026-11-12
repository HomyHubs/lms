-- migrate:up
-- Task 3 (slice-0): quen mat khau qua OTP gui Email. Bang luu YEU CAU dat lai mat khau.
-- Khong luu OTP tho: chi luu SHA-256 hash cua ma OTP (giong co che token phien o Task 2).
-- OTP co TTL ngan (mac dinh 10 phut, ep o tang service) va chi dung mot lan (`consumed_at`).
-- Email luu de doi chieu, khong lo user enumeration vi endpoint luon tra 200 (xem routes).

create table if not exists password_reset_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  -- SHA-256 hash cua ma OTP (khong luu ma tho).
  otp_hash text not null,
  -- So lan nhap sai da thu (chong do vet OTP); vuot nguong thi vo hieu.
  attempts integer not null default 0,
  -- Danh dau da dung (dat lai mat khau thanh cong) de khong tai su dung.
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists password_reset_otps_user_id_idx on password_reset_otps(user_id);
create index if not exists password_reset_otps_expires_at_idx on password_reset_otps(expires_at);

-- migrate:down
drop table if exists password_reset_otps;
