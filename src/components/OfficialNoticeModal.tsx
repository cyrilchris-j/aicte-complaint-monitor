import { useState } from 'react'
import { AicteLogo } from './AicteBrand'
import { Button, Field, inputClass } from './ui'
import { Printer, X, Send, AlertTriangle } from 'lucide-react'
import type { Bureau, ComplaintCase, Institution, Profile } from '../types'

interface OfficialNoticeModalProps {
  isOpen: boolean
  onClose: () => void
  caseData: ComplaintCase
  institution: Institution
  bureau: Bureau
  officer: Profile
  onNoticeIssued: (noticeType: string, noticeNumber: string, subject: string, days: number) => void
}

const NOTICE_TYPES = [
  {
    id: 'SHOW_CAUSE',
    label: 'Show Cause Notice (AICTE Reg. Sec 10)',
    title: 'SHOW CAUSE NOTICE UNDER AICTE APPROVAL PROCESS REGULATIONS',
    defaultDays: 7,
  },
  {
    id: 'INQUIRY_DIRECTIVE',
    label: 'Formal Inquiry & Fact-Finding Directive',
    title: 'DIRECTIVE FOR SUBMISSION OF CLARIFICATION & FACTUAL RECORDS',
    defaultDays: 7,
  },
  {
    id: 'URGENT_EXPLANATION',
    label: 'Urgent Clarification Notice (Immediate Effect)',
    title: 'URGENT ADMINISTRATIVE INQUIRY NOTICE',
    defaultDays: 3,
  },
  {
    id: 'HEARING_SUMMONS',
    label: 'Summons for Personal Hearing / Appearance',
    title: 'NOTICE FOR APPEARANCE BEFORE STANDING HEARING COMMITTEE (SHC)',
    defaultDays: 14,
  },
]

export function OfficialNoticeModal({
  isOpen,
  onClose,
  caseData,
  institution,
  bureau,
  officer,
  onNoticeIssued,
}: OfficialNoticeModalProps) {
  const [selectedType, setSelectedType] = useState(NOTICE_TYPES[0].id)
  const [deadlineDays, setDeadlineDays] = useState(7)
  const [customSubject, setCustomSubject] = useState(
    `Allegation of violation in ${caseData.complaint_category}: ${caseData.subject}`,
  )
  const [customDirectives, setCustomDirectives] = useState(
    `1. Furnish para-wise comments supported by authenticated copies of relevant institutional records, Fee Regulatory Committee sanctions, and student notifications.\n2. Submit authenticated student registers and fee collection receipts pertaining to the academic period under question.\n3. Depute an authorized representative not below the rank of Vice Principal / Dean if summoned by the Bureau.`,
  )

  if (!isOpen) return null

  const noticeConfig = NOTICE_TYPES.find((n) => n.id === selectedType) || NOTICE_TYPES[0]
  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const noticeNumber = `AICTE/${bureau.code}/ENF/2026/${caseData.case_id}-N`

  const handlePrint = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${noticeNumber} - ${institution.institution_name}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.5; font-size: 13pt; margin: 25px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
            .gov { font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
            .council { font-size: 17pt; font-weight: bold; margin: 5px 0; color: #003366; }
            .dept { font-size: 11pt; font-weight: bold; }
            .address { font-size: 10pt; color: #333; }
            .ref-row { display: flex; justify-content: space-between; margin-top: 15px; margin-bottom: 20px; font-size: 12pt; font-weight: bold; }
            .to-block { margin-bottom: 20px; line-height: 1.4; }
            .subject-block { font-weight: bold; text-decoration: underline; margin: 20px 0; text-align: justify; }
            .body-text { text-align: justify; text-indent: 30px; margin-bottom: 15px; }
            .directive-block { margin-left: 20px; margin-bottom: 20px; white-space: pre-line; }
            .sig-block { margin-top: 50px; float: right; text-align: left; width: 260px; line-height: 1.3; }
            .seal-box { border: 1px dashed #666; width: 140px; height: 70px; margin-top: 20px; text-align: center; font-size: 9pt; color: #666; padding-top: 25px; }
            .copy-to { clear: both; margin-top: 180px; font-size: 10pt; border-top: 1px solid #ccc; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="gov">भारत सरकार | Government of India</div>
            <div class="gov">शिक्षा मंत्रालय | Ministry of Education</div>
            <div class="council">अखिल भारतीय तकनीकी शिक्षा परिषद्</div>
            <div class="council" style="font-size: 15pt;">ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</div>
            <div class="dept">${bureau.name} (${bureau.code})</div>
            <div class="address">Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070 · Website: www.aicte-india.org</div>
          </div>

          <div class="ref-row">
            <span><strong>F. No. ${noticeNumber}</strong></span>
            <span>Date: ${todayStr}</span>
          </div>

          <div class="to-block">
            To,<br />
            <strong>The Principal / Director / Chairman,</strong><br />
            ${institution.institution_name}<br />
            AICTE Permanent ID: <strong>${institution.aicte_permanent_id}</strong><br />
            ${institution.address}, ${institution.city}, ${institution.district}, ${institution.state} - ${institution.pincode}
          </div>

          <div class="subject-block">
            SUBJECT: ${noticeConfig.title} — ${customSubject.toUpperCase()}
          </div>

          <p class="body-text">
            WHEREAS, the All India Council for Technical Education (AICTE) has received an official grievance / petition registered under Reference <strong>${caseData.case_id}</strong>, alleging non-compliance with the Approval Process Handbook and statutory norms:
          </p>

          <blockquote style="background: #f9f9f9; border-left: 4px solid #333; padding: 10px 15px; font-style: italic; margin: 15px 0;">
            "${caseData.description}"
          </blockquote>

          <p class="body-text">
            AND WHEREAS, the competent authority has taken cognizance of the aforesaid matter and directed an inquiry into the allegations to ensure institutional integrity and protection of students/stakeholders.
          </p>

          <p class="body-text">
            NOW THEREFORE, you are hereby called upon to show cause within <strong>${deadlineDays} (seven) days</strong> from the receipt of this communication as to why appropriate punitive / regulatory action under Chapter VII of the AICTE Approval Process Regulations should not be initiated against your institution. You are specifically directed to:
          </p>

          <div class="directive-block">
            ${customDirectives}
          </div>

          <p class="body-text">
            Please take note that in the event of failure to furnish the requisite explanation within the stipulated timeline of ${deadlineDays} days, it shall be presumed that the institution has no justification to offer, and the Council shall proceed ex-parte under statutory regulations.
          </p>

          <div class="sig-block">
            Yours faithfully,<br /><br /><br />
            <strong>(${officer.full_name})</strong><br />
            ${officer.designation}<br />
            ${bureau.name}<br />
            All India Council for Technical Education
          </div>

          <div class="copy-to">
            <strong>Copy for information and necessary coordination to:</strong><br />
            1. Regional Officer, AICTE ${institution.region} Regional Office.<br />
            2. Member Secretary, AICTE Headquarters, New Delhi.<br />
            3. Case File Record #${caseData.case_id} [CaseSync Repository].
          </div>
        </body>
      </html>
    `)
    w.document.close()
    w.print()
  }

  const handleIssueNotice = () => {
    onNoticeIssued(noticeConfig.label, noticeNumber, customSubject, deadlineDays)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-[4px] border border-[#cbd5e1] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="bg-[#003366] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-[#ff9933]">
          <div className="flex items-center gap-2.5">
            <AicteLogo size={32} />
            <div>
              <h3 className="font-bold text-[15px] leading-tight text-[#ffd580]">
                Official Notice Drafting Studio
              </h3>
              <p className="text-[11px] text-white/80">
                Statutory Show Cause & Inquiry Notices · AICTE Regulation Bureau
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Two Columns (Form Controls + Live Letterhead Preview) */}
        <div className="grid md:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left Column: Notice Configuration */}
          <div className="md:col-span-5 p-4 border-r border-[#cbd5e1] space-y-3 bg-[#f8fafc]">
            <Field label="Statutory Notice Type">
              <select
                className={inputClass}
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value)
                  const n = NOTICE_TYPES.find((x) => x.id === e.target.value)
                  if (n) setDeadlineDays(n.defaultDays)
                }}
              >
                {NOTICE_TYPES.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Response Mandate">
                <select
                  className={inputClass}
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(Number(e.target.value))}
                >
                  <option value={3}>3 Business Days</option>
                  <option value={7}>7 Days (Standard)</option>
                  <option value={10}>10 Days</option>
                  <option value={14}>14 Days (Hearing)</option>
                </select>
              </Field>

              <Field label="Reference No.">
                <input
                  className={`${inputClass} font-mono text-[11px] bg-white`}
                  readOnly
                  value={noticeNumber}
                />
              </Field>
            </div>

            <Field label="Notice Subject Title">
              <input
                className={inputClass}
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
              />
            </Field>

            <Field label="Specific Directives to Institution">
              <textarea
                className={`${inputClass} text-[12px] font-mono`}
                rows={5}
                value={customDirectives}
                onChange={(e) => setCustomDirectives(e.target.value)}
              />
            </Field>

            <div className="rounded-[3px] bg-[#fffbeb] border border-[#fef08a] p-2.5 text-[12px] text-[#854d0e] flex items-start gap-2">
              <AlertTriangle size={16} className="text-[#d97706] shrink-0 mt-0.5" />
              <span>
                Issuing this notice will update case status to <strong>PENDING INFORMATION</strong> and mark the verification queue as <strong>INSTITUTION RESPONSE REQUIRED</strong>.
              </span>
            </div>
          </div>

          {/* Right Column: Live Letterhead Preview */}
          <div className="md:col-span-7 p-5 bg-white overflow-y-auto space-y-4 text-[#1e293b]">
            <div className="border border-[#cbd5e1] rounded-[3px] p-6 shadow-sm bg-white text-[12px] leading-relaxed relative">
              {/* Header */}
              <div className="text-center border-b border-[#003366] pb-3 mb-4">
                <div className="flex justify-center items-center gap-3 mb-1">
                  <AicteLogo size={36} />
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-bold text-[#64748b] leading-tight">
                      अखिल भारतीय तकनीकी शिक्षा परिषद्
                    </p>
                    <p className="text-[13px] font-black text-[#003366] leading-tight">
                      ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
                    </p>
                    <p className="text-[10px] text-[#475569]">
                      (A Statutory Body of the Government of India)
                    </p>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-[#003366] uppercase mt-1">
                  {bureau.name} ({bureau.code}) · Nelson Mandela Marg, New Delhi
                </p>
              </div>

              {/* Ref and Date */}
              <div className="flex justify-between font-mono text-[11px] font-bold mb-3 text-[#475569]">
                <span>F. No. {noticeNumber}</span>
                <span>Date: {todayStr}</span>
              </div>

              {/* Addressee */}
              <div className="mb-3">
                <p className="font-bold">To,</p>
                <p className="font-bold text-[#003366]">{institution.institution_name}</p>
                <p className="text-[#64748b]">AICTE Permanent ID: <strong>{institution.aicte_permanent_id}</strong></p>
                <p className="text-[#64748b]">{institution.city}, {institution.state} - {institution.pincode}</p>
              </div>

              {/* Subject */}
              <div className="bg-[#f8fafc] border-l-3 border-[#003366] p-2 font-bold text-[#003366] text-[11px] mb-3">
                SUB: {noticeConfig.title} — {customSubject.toUpperCase()}
              </div>

              {/* Body */}
              <p className="text-[#334155] mb-2 text-justify">
                WHEREAS, a formal complaint was lodged against your institution registered as <strong>#{caseData.case_id}</strong> regarding <em>"{caseData.subject}"</em>.
              </p>
              <div className="bg-[#f1f5f9] p-2.5 rounded text-[11px] text-[#475569] italic mb-3">
                "{caseData.description.slice(0, 180)}..."
              </div>

              <p className="text-[#334155] mb-2">
                NOW THEREFORE, you are directed to submit your comprehensive factual explanation within <strong>{deadlineDays} days</strong>:
              </p>
              <pre className="text-[11px] font-mono text-[#1e293b] whitespace-pre-line bg-[#f8fafc] p-2.5 rounded border border-[#e2e8f0] mb-4">
                {customDirectives}
              </pre>

              {/* Signoff */}
              <div className="text-right pt-2 border-t border-[#f1f5f9]">
                <p className="font-bold text-[#003366]">({officer.full_name})</p>
                <p className="text-[11px] text-[#64748b]">{officer.designation}</p>
                <p className="text-[11px] text-[#64748b]">{bureau.name}, AICTE</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="border-t border-[#cbd5e1] bg-[#f1f5f9] px-5 py-3 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handlePrint} className="flex items-center gap-1.5">
              <Printer size={15} />
              <span>Print Official PDF</span>
            </Button>
            <Button onClick={handleIssueNotice} className="flex items-center gap-1.5">
              <Send size={15} />
              <span>Issue Notice & Log in Case Diary</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
