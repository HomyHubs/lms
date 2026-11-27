import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, PageHeader } from '@/components/ui/card'
import { useStudentSearch } from './useStudents'

export function StudentsPage(): React.ReactElement {
  const [q, setQ] = useState('')
  const [submitted, setSubmitted] = useState('')
  const navigate = useNavigate()
  const { data: students, isLoading, isError } = useStudentSearch(submitted)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(q.trim())
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={GraduationCap} title="Học viên" description="Tìm kiếm và xem hồ sơ học viên" />
      <Card>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Nhập tên hoặc số điện thoại…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button type="submit" disabled={q.trim().length === 0}>
            <Search className="mr-1 h-4 w-4" /> Tìm
          </Button>
        </form>
      </Card>

      {submitted && (
        <Card>
          {isLoading && <p className="py-6 text-center text-sm text-slate-500">Đang tìm…</p>}
          {isError && <p className="py-6 text-center text-sm text-red-500">Tìm kiếm thất bại, thử lại sau.</p>}
          {!isLoading && !isError && students && students.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">Không tìm thấy học viên nào.</p>
          )}
          {!isLoading && !isError && students && students.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Mã HV</th>
                  <th className="pb-2 pr-4 font-medium">Họ tên</th>
                  <th className="pb-2 pr-4 font-medium">Số điện thoại</th>
                  <th className="pb-2 pr-4 font-medium">Cơ sở</th>
                  <th className="pb-2 font-medium">Cấp độ</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                    onClick={() => void navigate(`/students/${s.id}`)}
                  >
                    <td className="py-2 pr-4 font-mono text-xs text-slate-500">{s.studentCode ?? '—'}</td>
                    <td className="py-2 pr-4 font-medium text-slate-900">{s.fullName ?? '—'}</td>
                    <td className="py-2 pr-4 text-slate-600">{s.phoneNumber}</td>
                    <td className="py-2 pr-4 text-slate-600">{s.branchName ?? '—'}</td>
                    <td className="py-2 text-slate-600">{s.levelCode ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  )
}
