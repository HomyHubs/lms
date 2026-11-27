import { LEVEL_CODES, type Class, type Course, type Level, type LevelCode } from '@lms/shared'

/**
 * slice-16: gom số học viên theo CẤP ĐỘ (Starter/Mover/Flyer) cho biểu đồ cột trên Dashboard.
 *
 * Yêu cầu gốc mục 1.2 nhắc "3 level Starter/Mover/Flyer" trong khi tiêu đề lại nói "theo khóa học";
 * chủ dự án đã chốt 2026-11-27: cột gom theo cấp độ, chi tiết từng khóa học nằm trong tooltip.
 *
 * Giữ dạng hàm thuần (không hook, không recharts) để test được bằng dữ liệu thường — chart chỉ lo vẽ.
 */

/** Một cột cấp độ: tổng học viên của cấp + chi tiết từng khóa học bên trong cấp đó. */
export interface LevelChartDatum {
  levelCode: LevelCode
  /** Tên cấp độ lấy từ API (Starter/Mover/Flyer). */
  name: string
  /** Tổng học viên của cấp = tổng học viên các khóa thuộc cấp. */
  value: number
  /** Chi tiết theo khóa học, giữ nguyên thứ tự API trả về. */
  courses: { name: string; value: number }[]
}

/** Thứ tự cố định Starter → Mover → Flyer (KHÔNG theo alphabet, giống `LevelRoadmap`). */
const LEVEL_ORDER: Record<LevelCode, number> = {
  starter: 0,
  mover: 1,
  flyer: 2,
}

function isLevelCode(code: string): code is LevelCode {
  return (LEVEL_CODES as readonly string[]).includes(code)
}

/**
 * Dựng dữ liệu biểu đồ cấp độ.
 *
 * @param levels        danh sách cấp độ (GET /api/levels)
 * @param courses       danh sách khóa học (GET /api/courses) — mỗi khóa có `levelId`
 * @param classes       danh sách lớp (GET /api/classes) — mỗi lớp có `courseId`
 * @param countByClass  sĩ số theo classId
 *
 * Cấp độ không có khóa học/lớp vẫn được giữ với `value: 0` để biểu đồ luôn đủ 3 cột
 * (người xem thấy ngay "cấp này chưa có học viên" thay vì tưởng biểu đồ thiếu dữ liệu).
 */
export function buildStudentsByLevel(
  levels: readonly Level[],
  courses: readonly Course[],
  classes: readonly Class[],
  countByClass: ReadonlyMap<string, number>,
): LevelChartDatum[] {
  const countForCourse = (courseId: string): number =>
    classes
      .filter((cls: Class) => cls.courseId === courseId)
      .reduce((sum: number, cls: Class) => sum + (countByClass.get(cls.id) ?? 0), 0)

  return levels
    .filter((level: Level) => isLevelCode(level.code))
    .map((level: Level) => {
      const coursesOfLevel = courses.filter((course: Course) => course.levelId === level.id)
      const detail = coursesOfLevel.map((course: Course) => ({
        name: course.name,
        value: countForCourse(course.id),
      }))
      const value = detail.reduce((sum: number, c: { value: number }) => sum + c.value, 0)
      return { levelCode: level.code, name: level.name, value, courses: detail }
    })
    .sort(
      (a: LevelChartDatum, b: LevelChartDatum) => LEVEL_ORDER[a.levelCode] - LEVEL_ORDER[b.levelCode],
    )
}
