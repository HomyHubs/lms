/**
 * Dinh dang ma hoc vien (slice-23-c, ADR 0022) — MOT noi duy nhat giu dinh dang.
 *
 * Ma = `<tien to co so>-<so thu tu>` vd `HV-0001`. Tien to lay tu `branches.code` (fallback `HV`),
 * so thu tu lay tu bang dem `student_code_seq` khoa theo tien to.
 *
 * Vi sao phai co file nay: truoc day bieu thuc noi chuoi duoc chep tay o 3 noi (store that + 2 store
 * gia lap trong test). Mot dinh dang co 3 ban sao la mot dinh dang se lech — va da lech that: khi
 * `HV` + 10001 va `HV1` + 1 cung cho `HV10001`, khong ai doc ra duoc ma thuoc co so nao.
 *
 * Dau phan cach thuoc ve DINH DANG, khong thuoc ve tien to: `branches.code` van la `HV`, khoa cua
 * bo dem van la `HV`. Chi chuoi sinh ra doi.
 */

/** Tien to mac dinh khi hoc vien chua gan co so / co so chua co `branches.code`. */
export const DEFAULT_STUDENT_CODE_PREFIX = 'HV'

/** Dau phan cach giua tien to co so va so thu tu. */
export const STUDENT_CODE_SEPARATOR = '-'

/** So chu so toi thieu cua phan so thu tu; so lon hon van dai ra binh thuong (`HV-10000`). */
export const STUDENT_CODE_SEQ_WIDTH = 4

/**
 * Dang dung cua ma: tien to khong rong, mot dau phan cach, roi toi thieu 4 chu so.
 *
 * `(.+)` tham lam nen voi tien to co chua dau phan cach (`AB-CD-0001`) no cat o dau `-` CUOI CUNG
 * truoc phan so — dung y muon. Vi vay `branches.code = 'AB-CD'` van cho ma parse duoc.
 */
const STUDENT_CODE_PATTERN = /^(.+)-(\d{4,})$/

/**
 * Tien to da chuan hoa: trim, roi ve mac dinh neu rong.
 *
 * Ham nay dung lam KHOA CUA BO DEM, nen no phai la noi duy nhat quyet dinh "tien to la gi" — neu
 * `nextCode` chuan hoa mot kieu con cho khac chuan hoa kieu khac thi bo dem tach lam hai dong.
 */
export function normalizeStudentCodePrefix(prefix: string | null | undefined): string {
  const trimmed = prefix?.trim() ?? ''
  return trimmed === '' ? DEFAULT_STUDENT_CODE_PREFIX : trimmed
}

/** Sinh ma tu tien to + so thu tu. Tien to rong/null roi ve `HV`. */
export function formatStudentCode(prefix: string | null | undefined, sequence: number): string {
  const normalized = normalizeStudentCodePrefix(prefix)
  return `${normalized}${STUDENT_CODE_SEPARATOR}${String(sequence).padStart(STUDENT_CODE_SEQ_WIDTH, '0')}`
}

/**
 * Tach ma thanh tien to + so thu tu. Tra `null` khi chuoi khong dung dinh dang.
 *
 * Dung de kiem tra va de doc lai ma; KHONG dung de khop import diem (khop theo chuoi nguyen ven,
 * vi do la khoa that trong DB).
 */
export function parseStudentCode(code: string): { prefix: string; sequence: number } | null {
  const match = STUDENT_CODE_PATTERN.exec(code.trim())
  if (!match) return null
  const sequence = Number(match[2])
  if (!Number.isSafeInteger(sequence)) return null
  return { prefix: match[1]!, sequence }
}

/** Ma co dung dinh dang hien hanh hay khong (vd de canh bao du lieu cu con o dang `HV0001`). */
export function isStudentCode(code: string): boolean {
  return parseStudentCode(code) !== null
}
