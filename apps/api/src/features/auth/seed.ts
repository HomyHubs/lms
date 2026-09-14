import { loadConfig } from '../../platform/config.js'
import { createDb } from '../../platform/db.js'
import { hashPassword } from './service.js'

/**
 * Seed tai khoan admin dau tien (idempotent) — de demo dang nhap Task 2 (slice-0).
 * Doc SDT/mat khau tu env; KHONG luu plain text (chi luu bcrypt hash).
 *
 *   SEED_ADMIN_PHONE=0901234567 SEED_ADMIN_PASSWORD=secret12 \
 *     pnpm --filter @lms/api seed
 */
async function main(): Promise<void> {
  const phone = process.env.SEED_ADMIN_PHONE ?? '0901234567'
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'changeme8'

  const config = loadConfig()
  const db = createDb(config.DATABASE_URL)

  try {
    const passwordHash = await hashPassword(password)
    await db
      .insertInto('users')
      .values({ phone_number: phone, password_hash: passwordHash, role: 'admin' })
      .onConflict((oc) =>
        oc.column('phone_number').doUpdateSet({ password_hash: passwordHash }),
      )
      .execute()
    console.log(`Seeded admin user: ${phone}`)
  } finally {
    await db.destroy()
  }
}

void main()
