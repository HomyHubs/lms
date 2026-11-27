import { ChevronRight, Route } from 'lucide-react'
import type { Class, Course, Level } from '@lms/shared'

/**
 * slice-28: so do lo trinh cap do Starter -> Mover -> Flyer.
 * Chi doc; so lieu dem tu du lieu that (levels/courses/classes) da tai o trang cha.
 * Thu tu lay theo LevelCode co dinh, KHONG theo alphabet cua API (API sap xep theo name).
 */

const LEVEL_ORDER: string[] = ['starter', 'mover', 'flyer']

function orderLevels(levels: Level[]): Level[] {
  return [...levels].sort((a, b) => {
    const ai = LEVEL_ORDER.indexOf(a.code)
    const bi = LEVEL_ORDER.indexOf(b.code)
    return (ai === -1 ? LEVEL_ORDER.length : ai) - (bi === -1 ? LEVEL_ORDER.length : bi)
  })
}

export interface LevelRoadmapProps {
  levels: Level[] | undefined
  courses: Course[] | undefined
  classes: Class[] | undefined
}

export function LevelRoadmap({ levels, courses, classes }: LevelRoadmapProps): React.ReactElement {
  const ordered = orderLevels(levels ?? [])
  const allCourses = courses ?? []
  const allClasses = classes ?? []

  return (
    <section className="c-card">
      <h2 className="c-section-title">
        <Route className="h-5 w-5" /> Lộ trình cấp độ
      </h2>
      <p className="text-sm text-slate-500">
        Học viên đi theo thứ tự Starter → Mover → Flyer. Số liệu tính trên các lớp thuộc cơ sở bạn được phân quyền.
      </p>
      {ordered.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có cấp độ nào.</p>
      ) : (
        <ol className="flex flex-col gap-3 pt-2 md:flex-row md:items-stretch">
          {ordered.map((level, index) => {
            const levelCourses = allCourses.filter((c) => c.levelId === level.id)
            const courseIds = new Set(levelCourses.map((c) => c.id))
            const levelClasses = allClasses.filter((k) => courseIds.has(k.courseId))
            return (
              <li key={level.id} className="flex flex-1 items-center gap-3">
                <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">{level.name}</span>
                    <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                      Cấp {index + 1}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {levelCourses.length} khoá học · {levelClasses.length} lớp
                  </p>
                  {levelCourses.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-400">Chưa có khoá học</p>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-700">
                      {levelCourses.map((c) => (
                        <li key={c.id}>{c.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {index < ordered.length - 1 && (
                  <ChevronRight className="hidden h-5 w-5 shrink-0 text-slate-300 md:block" aria-hidden />
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
