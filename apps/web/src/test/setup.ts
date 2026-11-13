import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'
import { configure } from '@testing-library/react'

// Khi chạy toàn bộ suite song song (pnpm -r test), các lookup phụ thuộc fetch đôi khi vượt
// 1000ms mặc định của Testing Library -> test flaky (vd ExamsPage/ExamSetsPage). Nới budget
// async toàn cục để findBy*/waitFor ổn định dưới tải, không phải chỉnh timeout từng test.
configure({ asyncUtilTimeout: 5000 })

// jsdom không hiện thực `Element.scrollIntoView`. Nhiều component gọi nó trong handler click
// (vd "Sửa" ở QuestionsPage) -> ném lỗi trong event listener -> Vitest coi là "unhandled error"
// và fail cả lần chạy DÙ mọi assertion đều pass (biểu hiện là lỗi không ổn định khi chạy -r).
// Stub no-op toàn cục để loại nhiễu này; test nào cần spy vẫn tự gán đè trong chính test đó.
beforeEach(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})
