import { useMemo, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSnapshot, subscribe } from '../demo/store'
import { computeAllIri, TIER_STYLES, type InstitutionRiskProfile } from '../lib/iri'
import { PageHeader } from '../components/ui'
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Download,
  Building,
  Clock,
  Layers,
} from 'lucide-react'

function getDossierDate(): string {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function IriPage() {
  const { profile } = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [tierFilter, setTierFilter] = useState<'ALL' | 'RED' | 'AMBER' | 'GREEN'>('ALL')
  const [q, setQ] = useState('')

  const profiles = useMemo(
    () => computeAllIri(snapshot.institutions, snapshot.cases, snapshot.links),
    [snapshot.institutions, snapshot.cases, snapshot.links],
  )

  const filtered = useMemo(() => {
    return profiles.filter(p => {
      if (tierFilter !== 'ALL' && p.tier !== tierFilter) return false
      if (q.trim()) {
        const query = q.trim().toLowerCase()
        if (
          !p.institution.institution_name.toLowerCase().includes(query) &&
          !p.institution.aicte_permanent_id.toLowerCase().includes(query) &&
          !p.institution.state.toLowerCase().includes(query)
        )
          return false
      }
      return true
    })
  }, [profiles, tierFilter, q])

  const redCount = profiles.filter(p => p.tier === 'RED').length
  const amberCount = profiles.filter(p => p.tier === 'AMBER').length
  const greenCount = profiles.filter(p => p.tier === 'GREEN').length

  if (!profile) return null

  const exportInspectionDossier = (p: InstitutionRiskProfile) => {
    const w = window.open('', '_blank')
    if (!w) return
    const now = getDossierDate()
    const inst = p.institution
    const cases = snapshot.cases.filter(c => c.institution_id === inst.id)
    const links = snapshot.links.filter(
      l => !l.dismissed && cases.some(c => c.id === l.source_case_id || c.id === l.target_case_id),
    )

    w.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>AICTE Inspection Briefing — ${inst.institution_name}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; color: #1e293b; font-size: 13px; }
            .header { text-align: center; border-bottom: 3px double #003366; padding-bottom: 12px; margin-bottom: 20px; }
            .gov { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #475569; }
            .title { font-size: 18px; font-weight: bold; color: #003366; margin: 4px 0; }
            .sub { font-size: 12px; color: #64748b; }
            .section { margin: 16px 0; }
            .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #003366; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; }
            .iri-box { background: ${p.tier === 'RED' ? '#fee2e2' : p.tier === 'AMBER' ? '#fef3c7' : '#dcfce7'}; border: 2px solid ${p.tier === 'RED' ? '#fca5a5' : p.tier === 'AMBER' ? '#fde68a' : '#bbf7d0'}; padding: 12px 16px; border-radius: 4px; margin: 12px 0; }
            .iri-score { font-size: 36px; font-weight: 900; color: ${p.tier === 'RED' ? '#b91c1c' : p.tier === 'AMBER' ? '#b45309' : '#15803d'}; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
            th { background: #003366; color: white; text-align: left; padding: 6px 8px; font-size: 11px; text-transform: uppercase; }
            td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
            tr:nth-child(even) td { background: #f8fafc; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
            .confidential { background: #b91c1c; color: white; display: inline-block; padding: 2px 10px; font-size: 10px; font-weight: bold; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="gov">भारत सरकार | Government of India — अखिल भारतीय तकनीकी शिक्षा परिषद्</div>
            <div class="title">ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</div>
            <div class="sub">Surprise Inspection Squad Briefing Dossier · Regulatory Intelligence Unit</div>
          </div>

          <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
            <span><strong>Dossier Ref:</strong> IRI/INSP/2026/${inst.aicte_permanent_id}</span>
            <span class="confidential">CONFIDENTIAL</span>
            <span><strong>Generated:</strong> ${now}</span>
          </div>

          <div class="section">
            <div class="section-title">Institution Profile</div>
            <table>
              <tr><td><strong>Name</strong></td><td>${inst.institution_name}</td><td><strong>AICTE Permanent ID</strong></td><td>${inst.aicte_permanent_id}</td></tr>
              <tr><td><strong>Type</strong></td><td>${inst.institution_type}</td><td><strong>Status</strong></td><td>${inst.status}</td></tr>
              <tr><td><strong>Address</strong></td><td colspan="3">${inst.address}, ${inst.city}, ${inst.district}, ${inst.state} — ${inst.pincode}</td></tr>
              <tr><td><strong>Region</strong></td><td>${inst.region}</td><td><strong>Contact</strong></td><td>${inst.contact_email} | ${inst.contact_phone}</td></tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Institutional Risk Index (IRI)</div>
            <div class="iri-box">
              <div class="iri-score">${p.iri}/100</div>
              <div style="font-weight:bold;font-size:15px;">Tier: ${p.tier} — ${p.riskLabel}</div>
              <div style="margin-top:6px;font-size:12px;">${p.actionRequired}</div>
            </div>
            <table>
              <tr><th>Metric</th><th>Score</th><th>Max</th><th>Notes</th></tr>
              <tr><td>Complaint Volume</td><td>${p.breakdown.volumeScore}</td><td>30</td><td>${p.totalActive} active cases</td></tr>
              <tr><td>SLA Overdue Rate</td><td>${p.breakdown.slaScore}</td><td>25</td><td>${p.overdueCount} overdue cases</td></tr>
              <tr><td>Category Severity</td><td>${p.breakdown.severityScore}</td><td>20</td><td>Dominant: ${p.dominantCategory ?? '—'}</td></tr>
              <tr><td>Institution Response Delay</td><td>${p.breakdown.responseScore}</td><td>15</td><td>Response pending analysis</td></tr>
              <tr><td>Cross-Bureau Overlap</td><td>${p.breakdown.overlapScore}</td><td>10</td><td>${p.crossBureauCount} active cross-bureau links</td></tr>
              <tr style="background:#003366;color:white;"><td><strong>TOTAL IRI</strong></td><td><strong>${p.iri}</strong></td><td>100</td><td>${p.riskLabel}</td></tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Active Complaint Cases (${cases.filter(c => !['DISPOSED','CLOSED'].includes(c.status)).length})</div>
            <table>
              <tr><th>Case ID</th><th>Category</th><th>Subject</th><th>Priority</th><th>Status</th><th>Received</th><th>Deadline</th></tr>
              ${cases.filter(c => !['DISPOSED','CLOSED'].includes(c.status)).map(c =>
                `<tr>
                  <td style="font-family:monospace;font-weight:bold;">${c.case_id}</td>
                  <td>${c.complaint_category}</td>
                  <td>${c.subject.slice(0, 60)}${c.subject.length > 60 ? '...' : ''}</td>
                  <td>${c.priority}</td>
                  <td>${c.status.replaceAll('_', ' ')}</td>
                  <td>${c.received_date.slice(0, 10)}</td>
                  <td>${c.expected_disposal_date}</td>
                </tr>`
              ).join('')}
            </table>
          </div>

          ${links.length > 0 ? `
          <div class="section">
            <div class="section-title">Cross-Bureau Overlap Flags (${links.length})</div>
            <table>
              <tr><th>Case A</th><th>Case B</th><th>Similarity</th><th>Type</th></tr>
              ${links.map(l => {
                const a = snapshot.cases.find(c => c.id === l.source_case_id)
                const b = snapshot.cases.find(c => c.id === l.target_case_id)
                return `<tr>
                  <td style="font-family:monospace;">${a?.case_id ?? l.source_case_id}</td>
                  <td style="font-family:monospace;">${b?.case_id ?? l.target_case_id}</td>
                  <td>${l.similarity_score}%</td>
                  <td>${l.relationship_type.replaceAll('_', ' ')}</td>
                </tr>`
              }).join('')}
            </table>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Inspection Directives</div>
            <ol style="line-height:1.8;">
              <li>Verify student fee collection registers and official fee notification for the last 3 academic years.</li>
              <li>Inspect grievance redressal register and anti-ragging committee composition.</li>
              <li>Record institution's response to each active AICTE complaint case listed above.</li>
              <li>Audit faculty service records, pay slips, and qualification certificates for randomly selected staff.</li>
              <li>Submit spot inspection report within 7 working days of visit.</li>
            </ol>
          </div>

          <div class="footer">
            AICTE CaseSync · Institutional Risk Intelligence · Generated for Internal Use Only · ${now}
          </div>
        </body>
      </html>
    `)
    w.document.close()
    w.print()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Institutional Risk Index (IRI)"
        subtitle="AI-weighted composite risk score (0–100) for each AICTE-approved institution based on complaint volume, SLA compliance, category severity, response delay, and cross-bureau overlap."
      />

      {/* KPI Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div
          className="rounded-[3px] border-l-4 border-l-[#b91c1c] border border-[#fecaca] bg-[#fee2e2] p-4 shadow-xs cursor-pointer"
          onClick={() => setTierFilter(tierFilter === 'RED' ? 'ALL' : 'RED')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#b91c1c]">🔴 High Risk (RED)</span>
            <ShieldAlert size={18} className="text-[#b91c1c]" />
          </div>
          <p className="mt-1 text-[32px] font-black text-[#b91c1c] leading-none">{redCount}</p>
          <p className="mt-1 text-[11px] text-[#991b1b] font-semibold">IRI ≥ 60 · Immediate attention required</p>
        </div>
        <div
          className="rounded-[3px] border-l-4 border-l-[#f59e0b] border border-[#fde68a] bg-[#fef3c7] p-4 shadow-xs cursor-pointer"
          onClick={() => setTierFilter(tierFilter === 'AMBER' ? 'ALL' : 'AMBER')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#b45309]">🟡 Under Watch (AMBER)</span>
            <AlertTriangle size={18} className="text-[#b45309]" />
          </div>
          <p className="mt-1 text-[32px] font-black text-[#b45309] leading-none">{amberCount}</p>
          <p className="mt-1 text-[11px] text-[#92400e] font-semibold">IRI 30–59 · Elevated monitoring</p>
        </div>
        <div
          className="rounded-[3px] border-l-4 border-l-[#22c55e] border border-[#bbf7d0] bg-[#dcfce7] p-4 shadow-xs cursor-pointer"
          onClick={() => setTierFilter(tierFilter === 'GREEN' ? 'ALL' : 'GREEN')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#15803d]">🟢 Compliant (GREEN)</span>
            <CheckCircle2 size={18} className="text-[#15803d]" />
          </div>
          <p className="mt-1 text-[32px] font-black text-[#15803d] leading-none">{greenCount}</p>
          <p className="mt-1 text-[11px] text-[#166534] font-semibold">IRI &lt; 30 · Standard monitoring</p>
        </div>
      </div>

      {/* IRI Formula Card */}
      <div className="rounded-[3px] border border-[#cbd5e1] bg-white p-4 shadow-xs text-[13px]">
        <p className="font-bold text-[#003366] mb-2 flex items-center gap-2">
          <TrendingUp size={16} className="text-[#003366]" />
          IRI Scoring Formula (Configurable Prototype Weights)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          {[
            { label: 'Complaint Volume', weight: '30%', icon: Building },
            { label: 'SLA Overdue Rate', weight: '25%', icon: Clock },
            { label: 'Category Severity', weight: '20%', icon: ShieldAlert },
            { label: 'Response Delay', weight: '15%', icon: AlertTriangle },
            { label: 'Cross-Bureau Overlap', weight: '10%', icon: Layers },
          ].map(({ label, weight }) => (
            <div key={label} className="rounded border border-[#e2e8f0] bg-[#f8fafc] p-2">
              <p className="text-[11px] text-[#64748b]">{label}</p>
              <p className="text-[18px] font-black text-[#003366]">{weight}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-[#64748b]">These are configurable prototype weights. Not official AICTE policy. Human regulatory determination required for all enforcement actions.</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by institution name, Permanent ID, or state..."
          value={q}
          onChange={e => setQ(e.target.value)}
          className="flex-1 min-w-[260px] rounded-[3px] border border-[#cbd5e1] px-3 py-1.5 text-[13px] outline-none focus:border-[#003366]"
        />
        <div className="flex gap-1.5">
          {(['ALL', 'RED', 'AMBER', 'GREEN'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-3 py-1 text-[12px] font-bold rounded-[3px] transition cursor-pointer ${
                tierFilter === t
                  ? 'bg-[#003366] text-white'
                  : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
              }`}
            >
              {t === 'ALL' ? 'All Tiers' : t}
            </button>
          ))}
        </div>
      </div>

      {/* IRI Table */}
      <div className="rounded-[3px] border border-[#cbd5e1] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#003366] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3">Institution</th>
                <th className="px-3 py-3">State / Region</th>
                <th className="px-3 py-3">IRI Score</th>
                <th className="px-3 py-3">Tier</th>
                <th className="px-3 py-3">Active Cases</th>
                <th className="px-3 py-3">Overdue</th>
                <th className="px-3 py-3">Cross-Bureau</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[#64748b]">
                    No institutions match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const styles = TIER_STYLES[p.tier]
                  const pct = p.iri
                  return (
                    <tr key={p.institution.id} className={`hover:bg-[#f8fafc] transition ${styles.row}`}>
                      <td className="px-3.5 py-3">
                        <Link
                          to={`/institutions/${p.institution.id}`}
                          className="font-bold text-[#003366] hover:underline block"
                        >
                          {p.institution.institution_name}
                        </Link>
                        <span className="text-[11px] font-mono text-[#64748b]">{p.institution.aicte_permanent_id}</span>
                        {p.dominantCategory && (
                          <span className="block text-[10px] text-[#94a3b8]">Top: {p.dominantCategory}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[#475569]">
                        <div>{p.institution.state}</div>
                        <div className="text-[11px] text-[#94a3b8]">{p.institution.region} Region</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${styles.bar}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-black text-[15px] text-[#1e293b]">{pct}</span>
                        </div>
                        <div className="mt-0.5 grid grid-cols-5 gap-0.5 text-[9px] text-[#94a3b8]">
                          <span>V:{p.breakdown.volumeScore}</span>
                          <span>S:{p.breakdown.slaScore}</span>
                          <span>C:{p.breakdown.severityScore}</span>
                          <span>R:{p.breakdown.responseScore}</span>
                          <span>O:{p.breakdown.overlapScore}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${styles.badge}`}>
                          {p.tier} — {p.riskLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-bold text-[#1e293b]">{p.totalActive}</td>
                      <td className="px-3 py-3">
                        {p.overdueCount > 0 ? (
                          <span className="font-bold text-[#b91c1c]">{p.overdueCount} 🔴</span>
                        ) : (
                          <span className="text-[#15803d] font-bold">0 ✓</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {p.crossBureauCount > 0 ? (
                          <span className="font-bold text-[#7c3aed]">{p.crossBureauCount}</span>
                        ) : (
                          <span className="text-[#94a3b8]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <Link
                            to={`/institutions/${p.institution.id}`}
                            className="text-[11px] font-bold text-[#003366] hover:underline"
                          >
                            360° View
                          </Link>
                          {(profile.role === 'SUPER_ADMIN' || profile.role === 'SENIOR_MANAGEMENT' || profile.role === 'BUREAU_HEAD') && (
                            <button
                              onClick={() => exportInspectionDossier(p)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#b45309] hover:text-[#92400e] cursor-pointer"
                            >
                              <Download size={10} />
                              Inspection Dossier
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[#e2e8f0] px-4 py-2 text-[12px] text-[#64748b] bg-[#f8fafc]">
          Showing {filtered.length} of {profiles.length} institutions · Last activity dates shown in 360° Institution view
        </div>
      </div>
    </div>
  )
}

