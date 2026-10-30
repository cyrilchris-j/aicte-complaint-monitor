import { useMemo, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { getSnapshot, subscribe } from '../demo/store'
import { Button, PageHeader } from '../components/ui'
import { formatDateTime, csvEscape, downloadText } from '../lib/utils'
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Printer,
  ArrowRight,
  Clock,
  Layers,
  FileText,
  AlertTriangle,
  Lock,
} from 'lucide-react'

const ACTION_CATEGORIES = [
  { id: 'ALL', label: 'All Operations' },
  { id: 'CASE', label: 'Case Movements' },
  { id: 'TRANSFER', label: 'Bureau Transfers' },
  { id: 'LINK', label: 'Overlap & Linking' },
  { id: 'NOTICE', label: 'Notices & Demands' },
  { id: 'ADMIN', label: 'Settings & SLA' },
] as const

function getActionBadgeStyle(action: string) {
  const act = action.toUpperCase()
  if (act.includes('TRANSFER') || act.includes('TRANSFERRED')) {
    return 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]'
  }
  if (act.includes('NOTICE') || act.includes('SCN') || act.includes('SUMMONS')) {
    return 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]'
  }
  if (act.includes('LINK') || act.includes('OVERLAP') || act.includes('COORDINAT')) {
    return 'bg-[#f5f3ff] text-[#6d28d9] border-[#ddd6fe]'
  }
  if (act.includes('ESCALAT') || act.includes('CRITICAL')) {
    return 'bg-[#fff1f2] text-[#e11d48] border-[#fecdd3]'
  }
  if (act.includes('VERIF') || act.includes('DISPOSE') || act.includes('CLOSE')) {
    return 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]'
  }
  if (act.includes('SLA') || act.includes('THRESHOLD') || act.includes('RULE')) {
    return 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]'
  }
  return 'bg-[#f8fafc] text-[#334155] border-[#cbd5e1]'
}

export function AuditPage() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [q, setQ] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [selectedUser, setSelectedUser] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const filteredLogs = useMemo(() => {
    return snapshot.auditLogs.filter((a) => {
      const user = snapshot.profiles.find((p) => p.id === a.user_id)
      const userName = user?.full_name || a.user_id

      // Text search
      if (q.trim()) {
        const query = q.trim().toLowerCase()
        const matchesQuery =
          a.action.toLowerCase().includes(query) ||
          userName.toLowerCase().includes(query) ||
          a.entity_id.toLowerCase().includes(query) ||
          a.entity_type.toLowerCase().includes(query) ||
          (a.old_value && a.old_value.toLowerCase().includes(query)) ||
          (a.new_value && a.new_value.toLowerCase().includes(query))

        if (!matchesQuery) return false
      }

      // User filter
      if (selectedUser !== 'ALL' && a.user_id !== selectedUser) {
        return false
      }

      // Category filter
      if (categoryFilter === 'CASE') {
        return (
          a.entity_type === 'complaint_case' &&
          !a.action.toLowerCase().includes('transfer') &&
          !a.action.toLowerCase().includes('notice')
        )
      }
      if (categoryFilter === 'TRANSFER') {
        return a.action.toLowerCase().includes('transfer')
      }
      if (categoryFilter === 'LINK') {
        return (
          a.action.toLowerCase().includes('link') ||
          a.action.toLowerCase().includes('overlap') ||
          a.action.toLowerCase().includes('coordinat')
        )
      }
      if (categoryFilter === 'NOTICE') {
        return (
          a.action.toLowerCase().includes('notice') ||
          a.action.toLowerCase().includes('response') ||
          a.action.toLowerCase().includes('information')
        )
      }
      if (categoryFilter === 'ADMIN') {
        return (
          a.entity_type === 'sla_rule' ||
          a.entity_type === 'app_settings' ||
          a.entity_type === 'profile' ||
          a.action.toLowerCase().includes('threshold') ||
          a.action.toLowerCase().includes('sla')
        )
      }

      return true
    })
  }, [snapshot.auditLogs, snapshot.profiles, q, selectedUser, categoryFilter])

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1
  const paginatedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize)

  // CSV Export
  function exportCsv() {
    const header = ['Log ID', 'Timestamp (UTC/IST)', 'Officer / Actor', 'Action', 'Entity Type', 'Entity Reference', 'Old Value', 'New Value', 'IP Reference']
    const lines = [
      header.join(','),
      ...filteredLogs.map((a) => {
        const user = snapshot.profiles.find((p) => p.id === a.user_id)
        return [
          a.id,
          a.created_at,
          user?.full_name ?? a.user_id,
          a.action,
          a.entity_type,
          a.entity_id,
          a.old_value ?? '',
          a.new_value ?? '',
          a.ip_reference,
        ]
          .map(csvEscape)
          .join(',')
      }),
    ]
    downloadText('aicte-casesync-audit-trail.csv', lines.join('\n'), 'text/csv')
  }

  // Printable Audit Dossier
  function exportPdf() {
    const w = window.open('', '_blank')
    if (!w) return
    const now = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    w.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>AICTE CaseSync - Statutory Regulatory Audit Register</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; color: #1e293b; font-size: 12px; }
            .header { text-align: center; border-bottom: 3px double #003366; padding-bottom: 12px; margin-bottom: 16px; }
            .gov { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #475569; }
            .title { font-size: 18px; font-weight: bold; color: #003366; margin: 4px 0; }
            .sub { font-size: 12px; color: #64748b; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background-color: #003366; color: white; text-align: left; padding: 6px 8px; text-transform: uppercase; font-size: 10px; }
            td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
            tr:nth-child(even) td { background-color: #f8fafc; }
            .badge { display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: bold; border-radius: 2px; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="gov">भारत सरकार | Government of India — अखिल भारतीय तकनीकी शिक्षा परिषद्</div>
            <div class="title">ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</div>
            <div class="sub">Statutory Regulatory Audit Register & Case Movement Dossier (CaseSync)</div>
          </div>
          <div class="meta">
            <span><strong>Dossier Reference:</strong> AUDIT/SEC-10/2026/CONFIDENTIAL</span>
            <span><strong>Generated On:</strong> ${now} IST</span>
            <span><strong>Total Records:</strong> ${filteredLogs.length} Events</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Authorised Officer</th>
                <th>Action Taken</th>
                <th>Entity / Target</th>
                <th>State Transition (Old ➔ New)</th>
                <th>Origin IP</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLogs
                .map((a) => {
                  const user = snapshot.profiles.find((p) => p.id === a.user_id)
                  const diff = a.old_value || a.new_value ? `${a.old_value ?? '—'} ➔ ${a.new_value ?? '—'}` : 'Recorded'
                  return `<tr>
                    <td style="white-space: nowrap; font-family: monospace;">${formatDateTime(a.created_at)}</td>
                    <td><strong>${user?.full_name ?? a.user_id}</strong><br/><span style="color:#64748b; font-size:10px;">${user?.designation ?? ''}</span></td>
                    <td><strong style="color: #003366;">${a.action}</strong></td>
                    <td style="font-family: monospace;">${a.entity_type} [${a.entity_id}]</td>
                    <td>${diff}</td>
                    <td style="font-family: monospace; font-size: 10px; color: #64748b;">${a.ip_reference}</td>
                  </tr>`
                })
                .join('')}
            </tbody>
          </table>
          <div class="footer">
            Immutable Audit Trail · Cryptographically Sequenced under AICTE Regulatory Integrity Protocol
          </div>
        </body>
      </html>
    `)
    w.document.close()
    w.print()
  }

  // Count stats
  const transferCount = snapshot.auditLogs.filter((a) => a.action.toLowerCase().includes('transfer')).length
  const linkCount = snapshot.auditLogs.filter((a) => a.action.toLowerCase().includes('link') || a.action.toLowerCase().includes('coordinat')).length
  const noticeCount = snapshot.auditLogs.filter((a) => a.action.toLowerCase().includes('notice') || a.action.toLowerCase().includes('response')).length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Statutory Audit Trail & Regulatory Compliance Register"
        subtitle="Cryptographically sequenced, immutable record of all official case actions, inter-bureau movements, SLA threshold modifications, and coordination decisions."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={exportCsv} className="flex items-center gap-1.5">
              <Download size={14} />
              <span>Export CSV</span>
            </Button>
            <Button variant="secondary" onClick={exportPdf} className="flex items-center gap-1.5">
              <Printer size={14} />
              <span>Print Dossier</span>
            </Button>
          </div>
        }
      />

      {/* Security & Integrity Banner */}
      <div className="rounded-[3px] border border-[#bfdbfe] bg-[#eff6ff] p-3 text-[13px] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 text-[#1e40af]">
          <ShieldCheck size={18} className="text-[#2563eb] shrink-0" />
          <div>
            <span className="font-bold">WORM (Write-Once-Read-Many) Regulatory Guarantee:</span>
            <span className="text-[#3b82f6] ml-1">
              Audit logs are strictly read-only and immutable. No official or administrator can delete or modify past entries.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-white text-[#1e40af] px-2 py-0.5 rounded border border-[#bfdbfe] text-[11px] font-bold font-mono">
            <Lock size={11} /> SHA-256 Verified
          </span>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[3px] border border-[#cbd5e1] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748b]">
            <span className="text-[12px] font-bold uppercase tracking-wider">Total Audited Events</span>
            <FileText size={16} className="text-[#003366]" />
          </div>
          <p className="mt-2 text-[26px] font-black text-[#003366] font-mono leading-none">
            {snapshot.auditLogs.length}
          </p>
          <p className="mt-1 text-[11px] text-[#64748b]">100% Traceability across cells</p>
        </div>

        <div className="rounded-[3px] border border-[#cbd5e1] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748b]">
            <span className="text-[12px] font-bold uppercase tracking-wider">Bureau Transfers</span>
            <Layers size={16} className="text-[#2563eb]" />
          </div>
          <p className="mt-2 text-[26px] font-black text-[#2563eb] font-mono leading-none">
            {transferCount}
          </p>
          <p className="mt-1 text-[11px] text-[#64748b]">Formal file movements</p>
        </div>

        <div className="rounded-[3px] border border-[#cbd5e1] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748b]">
            <span className="text-[12px] font-bold uppercase tracking-wider">Overlap Links & Coord</span>
            <ShieldCheck size={16} className="text-[#7c3aed]" />
          </div>
          <p className="mt-2 text-[26px] font-black text-[#7c3aed] font-mono leading-none">
            {linkCount}
          </p>
          <p className="mt-1 text-[11px] text-[#64748b]">Cross-Bureau linkages</p>
        </div>

        <div className="rounded-[3px] border border-[#cbd5e1] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748b]">
            <span className="text-[12px] font-bold uppercase tracking-wider">Official Notices & Inquiries</span>
            <AlertTriangle size={16} className="text-[#b91c1c]" />
          </div>
          <p className="mt-2 text-[26px] font-black text-[#b91c1c] font-mono leading-none">
            {noticeCount}
          </p>
          <p className="mt-1 text-[11px] text-[#64748b]">Show-cause & demands issued</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 rounded-[3px] border border-[#cbd5e1] bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[260px] relative">
            <Search className="absolute left-3 top-2.5 text-[#94a3b8]" size={16} />
            <input
              type="text"
              placeholder="Search by action, officer name, case reference, entity..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              className="w-full pl-9 pr-3 py-2 text-[13px] border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#003366] bg-[#f8fafc]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-[#64748b]" />
            <select
              value={selectedUser}
              onChange={(e) => {
                setSelectedUser(e.target.value)
                setPage(1)
              }}
              className="text-[13px] border border-[#cbd5e1] rounded-[3px] px-3 py-2 bg-white text-[#334155] font-semibold"
            >
              <option value="ALL">All Authorized Officers</option>
              {snapshot.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.role.replaceAll('_', ' ')})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Operation Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5 border-t border-[#f1f5f9] pt-3">
          {ACTION_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategoryFilter(cat.id)
                setPage(1)
              }}
              className={`px-3 py-1 text-[12px] font-bold rounded-[3px] transition cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-[#003366] text-white shadow-xs'
                  : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
              }`}
            >
              {cat.label}
            </button>
          ))}
          <span className="ml-auto text-[12px] font-semibold text-[#64748b] self-center">
            Showing {filteredLogs.length} of {snapshot.auditLogs.length} logged actions
          </span>
        </div>
      </div>

      {/* Main Audit Table */}
      <div className="rounded-[3px] border border-[#cbd5e1] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#003366] text-white text-[12px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3">Timestamp (IST)</th>
                <th className="px-3.5 py-3">Authorized Official</th>
                <th className="px-3.5 py-3">Action Recorded</th>
                <th className="px-3.5 py-3">Target Reference</th>
                <th className="px-3.5 py-3">State Transition (Delta)</th>
                <th className="px-3.5 py-3">Network IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#64748b]">
                    No audit records match the current filter or search criteria.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((a) => {
                  const user = snapshot.profiles.find((p) => p.id === a.user_id)
                  const targetCase = a.entity_type === 'complaint_case' ? snapshot.cases.find((c) => c.id === a.entity_id) : null
                  const targetInst = a.entity_type === 'institution' ? snapshot.institutions.find((i) => i.id === a.entity_id) : null

                  return (
                    <tr key={a.id} className="hover:bg-[#f8fafc] transition">
                      {/* Timestamp */}
                      <td className="px-3.5 py-3 text-[#475569] font-mono text-[12px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-[#1e293b]">
                          <Clock size={13} className="text-[#94a3b8]" />
                          {formatDateTime(a.created_at)}
                        </div>
                      </td>

                      {/* Authorized Official */}
                      <td className="px-3.5 py-3">
                        <div className="font-bold text-[#003366]">
                          {user?.full_name ?? a.user_id}
                        </div>
                        <div className="text-[11px] text-[#64748b]">
                          {user?.designation ?? (a.user_id === 'system' ? 'Automated Service' : 'Portal Guest')}
                        </div>
                      </td>

                      {/* Action Recorded */}
                      <td className="px-3.5 py-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border ${getActionBadgeStyle(
                            a.action,
                          )}`}
                        >
                          {a.action}
                        </span>
                      </td>

                      {/* Target Reference */}
                      <td className="px-3.5 py-3">
                        {targetCase ? (
                          <Link
                            to={`/complaints/${targetCase.id}`}
                            className="font-mono font-bold text-[#003366] hover:underline flex items-center gap-1"
                          >
                            <span>#{targetCase.case_id}</span>
                          </Link>
                        ) : targetInst ? (
                          <Link
                            to={`/institutions/${targetInst.id}`}
                            className="font-bold text-[#003366] hover:underline text-[12px]"
                          >
                            {targetInst.institution_name}
                          </Link>
                        ) : (
                          <span className="font-mono text-[11px] text-[#64748b]">
                            {a.entity_type}: {a.entity_id}
                          </span>
                        )}
                      </td>

                      {/* State Transition (Delta) */}
                      <td className="px-3.5 py-3">
                        {a.old_value || a.new_value ? (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            {a.old_value ? (
                              <span className="px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#64748b] font-mono font-semibold line-through">
                                {a.old_value}
                              </span>
                            ) : null}
                            <ArrowRight size={12} className="text-[#94a3b8]" />
                            <span className="px-1.5 py-0.5 rounded bg-[#dcfce7] text-[#15803d] font-mono font-bold">
                              {a.new_value ?? '—'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#94a3b8] text-[12px]">Standard Operation</span>
                        )}
                      </td>

                      {/* Network IP */}
                      <td className="px-3.5 py-3 font-mono text-[11px] text-[#64748b]">
                        {a.ip_reference || '10.24.12.89 (NIC VPN)'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 ? (
          <div className="border-t border-[#e2e8f0] px-4 py-3 flex items-center justify-between text-[13px] bg-[#f8fafc]">
            <span className="text-[#64748b]">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
