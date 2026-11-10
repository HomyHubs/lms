import { loadConfig } from '../../platform/config.js'
import { createDb } from '../../platform/db.js'
import { hashPassword } from './service.js'

/**
 * Seed tai khoan admin + superadmin dau tien (idempotent) — de demo dang nhap (slice-0 / slice-1 revise).
 * Doc SDT/mat khau tu env; KHONG luu plain text (chi luu bcrypt hash).
 *
 *   SEED_ADMIN_PHONE=0901234567 SEED_ADMIN_PASSWORD=secret12 \
 *   SEED_SUPERADMIN_PHONE=0900000000 SEED_SUPERADMIN_PASSWORD=secret12 \
 *     pnpm --filter @lms/api seed
 */
type SeedRole = 'admin' | 'superadmin'

async function main(): Promise<void> {
  const config = loadConfig()
  const db = createDb(config.DATABASE_URL)

  const accounts: Array<{ phone: string; email: string; password: string; role: SeedRole }> = [
    {
      phone: process.env.SEED_ADMIN_PHONE ?? '0901234567',
      // Task 3: email de demo luong quen mat khau qua OTP.
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
      password: process.env.SEED_ADMIN_PASSWORD ?? 'changeme8',
      role: 'admin',
    },
    {
      // slice-1 revise: superadmin cap cao nhat (vuot branch-scope, quan ly admin, export danh sach hoc vien).
      phone: process.env.SEED_SUPERADMIN_PHONE ?? '0900000000',
      email: process.env.SEED_SUPERADMIN_EMAIL ?? 'superadmin@example.com',
      password: process.env.SEED_SUPERADMIN_PASSWORD ?? 'changeme8',
      role: 'superadmin',
    },
  ]

  try {
    for (const account of accounts) {
      const passwordHash = await hashPassword(account.password)
      await db
        .insertInto('users')
        .values({
          phone_number: account.phone,
          email: account.email,
          password_hash: passwordHash,
          role: account.role,
        })
        .onConflict((oc) =>
          // Giu role dung voi tai khoan (admin/superadmin) khi chay lai seed.
          oc.column('phone_number').doUpdateSet({
            password_hash: passwordHash,
            email: account.email,
            role: account.role,
          }),
        )
        .execute()
      console.log(`Seeded ${account.role} user: ${account.phone} (${account.email})`)
    }
  } finally {
    await db.destroy()
  }
}

void main()
