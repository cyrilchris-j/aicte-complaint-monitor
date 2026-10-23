import { useMemo, useState, useSyncExternalStore } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { dashboardStats, getSnapshot, subscribe, visibleCases } from '../demo/store'
import { Button, Card, Field, PageHeader, inputClass } from '../components/ui'
import { csvEscape, downloadText, isPendingStatus } from '../lib/utils'

export function ReportsPage() {
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [bureau, setBureau] = useState('')
  const [region, setRegion] = useState('')
  const [status, setStatus] = useState('')
  const cases = useMemo(() => {
    if (!profile) return []
    return visibleCases(profile).filter((c) => {
      const inst = snapshot.institutions.find((i) => i.id === c.institution_id)
      if (bureau && c.bureau_id !== bureau) return false
      if (region && inst?.region !== region) return false
      if (status && c.status !== status) return false
      return true
    })
  }, [snapshot, profile, bureau, region, status])

  if (!profile) return null
  const stats = dashboardStats(profile)

  const byInst = snapshot.institutions
    .map((i) => ({ name: i.institution_name, count: cases.filter((c) => c.institution_id === i.id).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)

  const byBureau = snapshot.bureaus.map((b) => {
    const list = cases.filter((c) => c.bureau_id === b.id)
    return {
      code: b.code,
      received: list.length,
      disposed: list.filter((c) => c.status === 'DISPOSED' || c.status === 'CLOSED').length,
      pending: list.filter((c) => isPendingStatus(c.status)).length,
    }
  })

  const byRegion = [...new Set(snapshot.institutions.map((i) => i.region))].map((r) => ({
    region: r,
    count: cases.filter((c) => snapshot.institutions.find((i) => i.id === c.institution_id)?.region === r).length,
  }))

  function exportCsv() {
    const header = ['Case ID', 'Institution', 'Bureau', 'Category', 'Status', 'Priority', 'Received']
    const lines = [
      header.join(','),
      ...cases.map((c) =>
        [
          c.case_id,
          snapshot.institutions.find((i) => i.id === c.institution_id)?.institution_name ?? '',
          snapshot.bureaus.find((b) => b.id === c.bureau_id)?.code ?? '',
          c.complaint_category,
          c.status,
          c.priority,
          c.received_date.slice(0, 10),
        ]
          .map(csvEscape)
          .join(','),
      ),
    ]
    downloadText('casesync-report.csv', lines.join('\n'), 'text/csv')
  }

  function exportPdf() {
    const w = window.open('', '_blank')
    if (!w) return
    const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    w.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>AICTE CaseSync - Grievance Monitoring Report</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; color: #1e293b; font-size: 13px; }
            .header { text-align: center; border-bottom: 3px double #003366; padding-bottom: 12px; margin-bottom: 20px; }
            .gov { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #475569; }
            .title { font-size: 18px; font-weight: bold; color: #003366; margin: 4px 0; }
            .sub { font-size: 12px; color: #64748b; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th { background-color: #003366; color: white; text-align: left; padding: 6px 8px; font-size: 11px; text-transform: uppercase; }
            td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; }
            tr:nth-child(even) td { background-color: #f8fafc; }
            .badge { display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: bold; border-radius: 2px; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="gov">भारत सरकार | Government of India — शिक्षा मंत्रालय | Ministry of Education</div>
            <div class="title">ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</div>
            <div class="sub">Integrated Institution Complaint Monitoring & Coordination Platform (CaseSync)</div>
          </div>
          <div class="meta">
            <span><strong>Official Dossier:</strong> Institutional Grievance Status Report</span>
            <span><strong>Generated:</strong> ${now}</span>
            <span><strong>Filtered Count:</strong> ${cases.length} Files</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Case Reference</th>
                <th>Institution</th>
                <th>Bureau</th>
                <th>Category</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              ${cases.slice(0, 100).map((c) => {
                const instName = snapshot.institutions.find((i) => i.id === c.institution_id)?.institution_name ?? ''
                const bCode = snapshot.bureaus.find((b) => b.id === c.bureau_id)?.code ?? ''
                return `<tr>
                  <td style="font-family: monospace; font-weight: bold; color: #003366;">${c.case_id}</td>
                  <td>${instName}</td>
                  <td><strong>${bCode}</strong></td>
                  <td>${c.complaint_category}</td>
                  <td>${c.status}</td>
                  <td>${c.priority}</td>
                  <td>${c.received_date.slice(0, 10)}</td>
                </tr>`
              }).join('')}
            </tbody>
          </table>
          <div class="footer">
            Generated by AICTE CaseSync · Regulation Bureau Official System · Confidential Record
          </div>
        </body>
      </html>
    `)
    w.document.close()
    w.print()
  }

  const disposalRate = cases.length ? Math.round((cases.filter((c) => c.status === 'DISPOSED' || c.status === 'CLOSED').length / cases.length) * 100) : 0

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports & Analytics Dossier"
        subtitle="Workload distribution, ageing, cross-bureau overlap analysis, and disposal metrics across AICTE Cells."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
            <Button variant="secondary" onClick={exportPdf}>Print / Export PDF</Button>
          </div>
        }
      />
      <div className="grid gap-3 md:grid-cols-3 rounded-[3px] border border-[#cbd5e1] bg-white p-3.5 shadow-xs">
        <Field label="Filter by Bureau / Cell">
          <select className={inputClass} value={bureau} onChange={(e) => setBureau(e.target.value)}>
            <option value="">All Bureaus</option>
            {snapshot.bureaus.map((b) => (
              <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Filter by Regional Office">
          <select className={inputClass} value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">All Regions</option>
            {[...new Set(snapshot.institutions.map((i) => i.region))].map((r) => (
              <option key={r} value={r}>{r} Regional Office</option>
            ))}
          </select>
        </Field>
        <Field label="Filter by Case Status">
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="UNDER_PROCESS">Under Process</option>
            <option value="PENDING_INFORMATION">Pending Information</option>
            <option value="PENDING_INSTITUTION_RESPONSE">Pending Institution Response</option>
            <option value="ESCALATED">Escalated</option>
            <option value="DISPOSED">Disposed</option>
            <option value="CLOSED">Closed</option>
          </select>
        </Field>
      </div>
      <div className="flex items-center justify-between rounded-[3px] bg-[#eef4fa] border border-[#cbd5e1] px-4 py-2.5 text-[13px] text-[#003366] font-semibold">
        <span>Active Filtered Records: {cases.length} cases</span>
        <span>Overall Disposal Efficiency Rate: {disposalRate}%</span>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Institution-wise Distribution (Top 12)">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={byInst} layout="vertical">
                <CartesianGrid stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#003366" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Bureau & Cell Caseload Workload">
          <div className="rounded-[3px] border border-[#cbd5e1] overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#003366] text-white text-[11px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-3 py-2">Bureau</th>
                  <th className="px-3 py-2">Total Received</th>
                  <th className="px-3 py-2">Disposed</th>
                  <th className="px-3 py-2">Pending Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {byBureau.map((b) => (
                  <tr key={b.code} className="hover:bg-[#f8fafc]">
                    <td className="px-3 py-2.5 font-bold text-[#003366]">{b.code}</td>
                    <td className="px-3 py-2.5 font-mono">{b.received}</td>
                    <td className="px-3 py-2.5 font-mono text-[#15803d] font-bold">{b.disposed}</td>
                    <td className="px-3 py-2.5 font-mono text-[#b45309] font-bold">{b.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Region-wise Inflow Distribution">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={byRegion}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#ff9933" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Monthly Inflow vs Disposal Trend">
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={stats.monthlyTrend}>
                <CartesianGrid stroke="#e2e8f0" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="received" name="Received" stroke="#003366" strokeWidth={2} />
                <Line type="monotone" dataKey="disposed" name="Disposed" stroke="#15803d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Ageing analysis">
          <ul className="text-[14px]">
            {stats.ageing.map((a) => (
              <li key={a.bucket} className="flex justify-between border-b border-line py-2">
                <span>{a.bucket}</span>
                <span className="font-semibold">{a.count}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Overlap analysis">
          <p className="text-[14px]">Active overlap pairs: {snapshot.links.filter((l) => !l.dismissed).length}</p>
          <p className="text-[14px]">Cross-bureau: {snapshot.links.filter((l) => l.relationship_type === 'CROSS_BUREAU_OVERLAP').length}</p>
          <p className="text-[14px]">Confirmed links: {snapshot.links.filter((l) => l.confirmed).length}</p>
        </Card>
      </div>
    </div>
  )
}
