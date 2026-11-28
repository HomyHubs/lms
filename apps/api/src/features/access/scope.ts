import type { PublicUser } from '@lms/shared'

/** Nguon "pham vi co so" — dung chung interface voi `userbranches` de khong phu thuoc vong. */
export interface BranchScopeSource {
  branchIdsForUser: (userId: string) => Promise<string[]>
}

/**
 * Pham vi co so cua nguoi goi.
 *
 * `undefined` = KHONG gioi han (superadmin); nguoc lai la danh sach id co so duoc phep xem.
 *
 * Vi sao can ham nay: luat "superadmin vuot branch-scope" tung duoc viet lai o tung handler
 * (`user.role === 'superadmin' ? undefined : await branchScope.branchIdsForUser(...)`), nen mot handler
 * moi quen viet lai thi superadmin bi loc ve rong — loi chi superadmin gap, va khong test nao bat duoc
 * (xem ADR 0021). Gom ve mot ham thi chi con mot cho de sai.
 */
export async function branchScopeOf(
  user: PublicUser,
  scope: BranchScopeSource,
): Promise<string[] | undefined> {
  if (user.role === 'superadmin') return undefined
  return scope.branchIdsForUser(user.id)
}
