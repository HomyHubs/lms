/**
 * Tinh tuoi hoc vien (slice-26, ADR 0018).
 *
 * Vi sao can file rieng: truoc day tuoi duoc tinh bang `new Date().getFullYear() - birth_year`,
 * tuc "tuoi se dat trong nam nay" chu khong phai tuoi hien tai — sai +-1 tu voi bat ky ai chua
 * qua sinh nhat. Muon chinh xac phai co ngay/thang sinh (`users.birth_date`).
 *
 * Toan bo ham o day THUAN va nhan `today` dang 'YYYY-MM-DD' thay vi doc dong ho he thong, de test
 * tat dinh (khong phu thuoc ngay chay test) va de tach bach voi mui gio.
 */

/** Mui gio nghiep vu cua trung tam — dung chung quy uoc voi attendance/examhistory/workhours. */
export const AGE_TIME_ZONE = 'Asia/Ho_Chi_Minh'

/** Dinh dang 'YYYY-MM-DD' theo gio VN (en-CA cho ra dung thu tu nam-thang-ngay). */
const VN_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: AGE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Hom nay theo gio VN, dang 'YYYY-MM-DD'. */
export function todayInVN(now: Date = new Date()): string {
  return VN_DATE_FORMAT.format(now)
}

interface Ymd {
  year: number
  month: number
  day: number
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Doc 'YYYY-MM-DD' thanh nam/thang/ngay. Tra null khi sai dinh dang hoac ngay khong co that
 * (vd 2026-02-30, 2026-13-01). Kiem tra bang cach doi chieu lai qua `Date.UTC` — cach duy nhat
 * bat duoc ngay "tron" ma regex khong thay.
 */
export function parseIsoDate(value: string): Ymd | null {
  const match = ISO_DATE.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null
  }
  return { year, month, day }
}

/**
 * Tuoi chinh xac tu ngay sinh: da qua sinh nhat trong nam nay chua.
 * Tra null khi mot trong hai ngay khong hop le, hoac ngay sinh o tuong lai.
 */
export function ageFromBirthDate(birthDate: string, today: string): number | null {
  const birth = parseIsoDate(birthDate)
  const now = parseIsoDate(today)
  if (!birth || !now) return null
  let age = now.year - birth.year
  // Chua toi sinh nhat nam nay -> van con o tuoi cu.
  if (now.month < birth.month || (now.month === birth.month && now.day < birth.day)) age -= 1
  return age < 0 ? null : age
}

/**
 * Tuoi UOC LUONG khi chi biet nam sinh (du lieu cu / nhap nhanh): hieu nam, tuc co the lech +-1
 * so voi tuoi that tuy da qua sinh nhat hay chua. FE hien kem dau `~` de noi ro dieu nay.
 *
 * TODO(slice-26-b): khong the sua bang code — ban ghi chi co `birth_year` se con lech +-1 cho toi
 * khi duoc nhap bo sung ngay sinh that. Xem docs/tasks/slices/slice-26-nguoi-dung-hien-thi.md.
 */
export function ageFromBirthYear(birthYear: number, today: string): number | null {
  const now = parseIsoDate(today)
  if (!now) return null
  const age = now.year - birthYear
  return age < 0 ? null : age
}

/**
 * Tuoi de hien thi: uu tien ngay sinh (chinh xac), fallback nam sinh (uoc luong).
 * null khi khong co du lieu nao dung duoc.
 */
export function displayAge(
  birthDate: string | null,
  birthYear: number | null,
  today: string,
): number | null {
  if (birthDate !== null) {
    const exact = ageFromBirthDate(birthDate, today)
    if (exact !== null) return exact
  }
  if (birthYear !== null) return ageFromBirthYear(birthYear, today)
  return null
}
