import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import {
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend,
} from 'recharts'
import type { StudentAttendancePanel, StudentExamPanel } from '@lms/shared'
import { Button } from '@/components/ui/button'
import { Card, CardTitle, PageHeader } from '@/components/ui/card'
import { useStudentProfile } from './useStudents'

const CLASSIFICATION_LABEL: Record<string, string> = {
  excellent: 'Xuất sắc',
  good: 'Khá',
  average: 'Trung bình',
  weak: 'Yếu',
}

function ExamPanelCard({ panel }: { panel: StudentExamPanel }): React.ReactElement {
  const data = [
    { name: 'Đạt', value: panel.passed },
    { name: 'Chưa đạt', value: panel.failed },
  ]
  const COLORS = ['#16a34a', '#dc2626']
  return (
    <Card className="space-y-3">
      <CardTitle>Kết quả thi</CardTitle>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-2xl font-semibold text-slate-900">{panel.attempts}</p>
          <p className="text-xs text-slate-500">Lượt thi</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-green-600">{panel.passed}</p>
          <p className="text-xs text-slate-500">Đạt</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-red-600">{panel.failed}</p>
          <p className="text-xs text-slate-500">Chưa đạt</p>
        </div>
      </div>
      {panel.avgScorePct !== null && (
        <p className="text-sm text-slate-600">Điểm trung bình: <strong>{panel.avgScorePct}%</strong></p>
      )}
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }: { name: string; percent?: number }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  )
}

function AttendancePanelCard({ panel }: { panel: StudentAttendancePanel }): React.ReactElement {
  const data = [
    { name: 'Có mặt', value: panel.present },
    { name: 'Đi muộn', value: panel.late },
    { name: 'Vắng', value: panel.absent },
    { name: 'Có phép', value: panel.excused },
  ]
  const COLORS = ['#16a34a', '#f59e0b', '#dc2626', '#6366f1']
  return (
    <Card className="space-y-3">
      <CardTitle>Chuyên cần</CardTitle>
      {panel.ratePct !== null && (
        <p className="text-sm text-slate-600">Tỷ lệ đi học: <strong>{panel.ratePct}%</strong></p>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
          <Tooltip />
          <Legend />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

export function StudentDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: profile, isLoading, isError } = useStudentProfile(id ?? null)

  if (isLoading) {
    return <p className="py-10 text-center text-sm text-slate-500">Đang tải hồ sơ…</p>
  }
  if (isError || !profile) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => void navigate('/students')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Quay lại
        </Button>
        <p className="text-sm text-red-500">Không tìm thấy học viên hoặc bạn không có quyền xem.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => void navigate('/students')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Quay lại
        </Button>
        <PageHeader
          icon={GraduationCap}
          title={profile.fullName ?? profile.phoneNumber}
          description={[profile.branchName, profile.levelCode].filter(Boolean).join(' · ')}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profile.exam ? (
          <ExamPanelCard panel={profile.exam} />
        ) : (
          <Card className="space-y-2">
            <CardTitle>Kết quả thi</CardTitle>
            <p className="text-sm text-slate-400">Chưa có lượt thi nào được chấm.</p>
          </Card>
        )}

        {profile.attendance ? (
          <AttendancePanelCard panel={profile.attendance} />
        ) : (
          <Card className="space-y-2">
            <CardTitle>Chuyên cần</CardTitle>
            <p className="text-sm text-slate-400">Chưa có dữ liệu điểm danh.</p>
          </Card>
        )}

        <Card className="space-y-2">
          <CardTitle>Xếp loại học lực</CardTitle>
          {profile.classification && profile.classification.label ? (
            <>
              <p className="text-3xl font-bold text-slate-900">
                {CLASSIFICATION_LABEL[profile.classification.label] ?? profile.classification.label}
              </p>
              {profile.classification.finalScore !== null && (
                <p className="text-sm text-slate-500">Điểm tổng: {profile.classification.finalScore}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">Chưa đủ dữ liệu xếp loại.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
