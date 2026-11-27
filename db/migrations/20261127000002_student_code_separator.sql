-- migrate:up
-- slice-23-c (ADR 0022): dinh dang ma hoc vien co dau phan cach — '<tien to>-<so thu tu>' (vd HV-0001).
--
-- Vi sao doi: ADR 0020 da sua BO DEM (khoa theo tien to) nhung CHUOI MA van mo ho — 'HV' + 10001 va
-- 'HV1' + 1 deu cho 'HV10001'. Unique index chan duoc trung nen khong co du lieu sai, nhung khong ai
-- doc ma biet duoc no thuoc co so nao, so thu tu bao nhieu, va moi doan parse ma deu phai doan.
-- ADR 0020 chua trieu chung; dau phan cach chua nguyen nhan.
--
-- Cach doi: chen dau phan cach vao CHINH chuoi ma, KHONG suy lai tien to tu co so HIEN TAI cua hoc
-- vien. Hoc vien chuyen co so van mang ma co tien to cu; suy lai theo co so se DOI tien to, tuc doi
-- danh tinh cua ma — dung thu khong duoc phep. Chen mot ky tu thi khong doi gi ngoai dau phan cach.
--
-- Idempotent: bo qua ma da o dung dang dich (^<khong-so>+-<so>+$), nen chay lai khong doi gi.
-- Harness CI chay up -> down -> up cho TOAN BO db/migrations (apps/api/scripts/*.integration.mjs),
-- nen file nay tu dong duoc nghiem thu rollback.

update users
set student_code = regexp_replace(student_code, '^([^0-9]+)([0-9]+)$', '\1-\2'),
    updated_at = now()
where role = 'student'
  and student_code is not null
  -- Chi dung dang cu '<tien to><so>' (khong co dau phan cach nao).
  and student_code ~ '^[^0-9]+[0-9]+$'
  -- Va chua o dang dich. Tach rieng dieu kien nay de lan chay thu hai khong bien 'HV-0001' thanh
  -- 'HV--0001' (dau '-' khong phai chu so nen no lot qua dieu kien tren).
  and student_code !~ '^[^0-9]+-[0-9]+$';

-- migrate:down
-- Nghich dao chinh xac cua up: go dung dau phan cach vua chen.
--
-- Luu y: neu chay down tren mot DB ma up KHONG sua dong nao (dong da o dang moi tu truoc), dong do
-- van bi go dau phan cach. Chap nhan duoc: no khong phai dong do migration nay tao ra.
update users
set student_code = regexp_replace(student_code, '^([^0-9]+)-([0-9]+)$', '\1\2'),
    updated_at = now()
where role = 'student'
  and student_code is not null
  and student_code ~ '^[^0-9]+-[0-9]+$';
