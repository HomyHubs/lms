type ChartItem = { label: string; value: number }

const COLORS = ['#0369a1', '#0f766e', '#b45309', '#be123c', '#7e22ce', '#475569']

export function ReportCharts({ title, items, unit = 'lượt' }: { title: string; items: ChartItem[]; unit?: string }): React.ReactElement {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  const max = Math.max(1, ...items.map((item) => item.value))
  let offset = 0
  return <section className="c-card" aria-label={title}>
    <h2 className="c-section-title">{title}</h2>
    {total === 0 ? <p className="text-sm text-slate-500">Chưa có dữ liệu để vẽ biểu đồ.</p> : <div className="grid gap-4 md:grid-cols-2">
      <div aria-label="Biểu đồ cột" className="space-y-2">
        {items.map((item, index) => <div key={item.label} className="text-sm">
          <div className="flex justify-between gap-2"><span>{item.label}</span><span>{item.value} {unit}</span></div>
          <div className="h-3 rounded bg-slate-100"><div className="h-3 rounded" style={{ width: `${item.value / max * 100}%`, backgroundColor: COLORS[index % COLORS.length] }} /></div>
        </div>)}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <svg aria-hidden="true" width="140" height="140" viewBox="0 0 36 36">
          {items.map((item, index) => {
            const size = item.value / total * 100
            const start = offset
            offset += size
            return <circle key={item.label} cx="18" cy="18" r="15.9155" fill="none" stroke={COLORS[index % COLORS.length]} strokeWidth="8" strokeDasharray={`${size} ${100 - size}`} strokeDashoffset={-start} transform="rotate(-90 18 18)" />
          })}
        </svg>
        <ul aria-label="Chú giải biểu đồ tròn" className="space-y-1 text-sm">{items.map((item, index) => <li key={item.label}><span aria-hidden="true" className="mr-2 inline-block h-3 w-3" style={{ backgroundColor: COLORS[index % COLORS.length] }} />{item.label}: {item.value} {unit} ({(item.value / total * 100).toFixed(1)}%)</li>)}</ul>
      </div>
    </div>}
  </section>
}
