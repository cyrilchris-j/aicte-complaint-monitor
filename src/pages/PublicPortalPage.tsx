import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { GovernmentTopBar, OfficialAicteHeader } from '../components/AicteBrand'
import { Button } from '../components/ui'
import { getSnapshot, requestOTP, submitPublicComplaint, subscribe, verifyOTP, getPublicTracking, getCaseForInstitution, submitPublicInstitutionResponse } from '../demo/store'
import { CATEGORIES, COMPLAINANT_TYPES, PRIORITIES, type Category, type ComplainantType, type Priority, type Institution } from '../types'
import { CATEGORY_SUB_CATEGORIES } from '../lib/constants'
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Send,
  Building,
  Upload,
  Search,
  ArrowRight,
  FileText,
  AlertTriangle,
  RotateCw,
  Lock,
  Check,
  UserCheck
} from 'lucide-react'

const FORM_STEPS = [
  { step: 1, label: 'Step 1', title: 'Complainant' },
  { step: 2, label: 'Step 2', title: 'Dual OTP' },
  { step: 3, label: 'Step 3', title: 'Institution' },
  { step: 4, label: 'Step 4', title: 'Grievance Details' },
  { step: 5, label: 'Step 5', title: 'Confirmation' },
] as const

export function PublicPortalPage() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [activeTab, setActiveTab] = useState<'lodge' | 'track' | 'institution'>('lodge')

  // Step state for lodging a complaint
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const stepsContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll active step box into view on mobile
  useEffect(() => {
    if (stepsContainerRef.current) {
      const activeEl = stepsContainerRef.current.children[step - 1] as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        })
      }
    }
  }, [step])

  // Step 1: Complainant Details
  const [complainantType, setComplainantType] = useState<ComplainantType>('Student')
  const [complainantName, setComplainantName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')

  // Step 2: OTP Verification
  const [emailOtp, setEmailOtp] = useState('')
  const [mobileOtp, setMobileOtp] = useState('')
  const [dispEmailOtp, setDispEmailOtp] = useState('')
  const [dispMobileOtp, setDispMobileOtp] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [mobileVerified, setMobileVerified] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [simulatedNotice, setSimulatedNotice] = useState<string | null>(null)
  
  // 5-minute countdown (300 seconds)
  const [timer, setTimer] = useState(300)
  const [cooldown, setCooldown] = useState(0)

  // Step 3: Institution Details
  const [selectedInstId, setSelectedInstId] = useState(snapshot.institutions[0]?.id || '')
  const [permIdSearch, setPermIdSearch] = useState('')
  const [matchedInst, setMatchedInst] = useState<Institution | null>(snapshot.institutions[0] || null)

  // Step 4: Complaint Info
  const [category, setCategory] = useState<Category>('Fees / Financial Issues')
  const [subCategory, setSubCategory] = useState(CATEGORY_SUB_CATEGORIES['Fees / Financial Issues'][0] || '')
  const [incidentDate, setIncidentDate] = useState('2026-10-22')
  const [priority, setPriority] = useState<Priority>('HIGH')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [documents, setDocuments] = useState<{ name: string; type: string; dataUrl?: string }[]>([])
  const [uploadedFileNotice, setUploadedFileNotice] = useState<string | null>(null)

  // Step 5: Confirmation Result
  const [submittedCase, setSubmittedCase] = useState<{
    case_id: string
    complainant_reference: string
    target_bureau: string
    received_date: string
    expected_disposal_date: string
  } | null>(null)

  // Tracking state
  const [trackCaseId, setTrackCaseId] = useState('')
  const [trackContact, setTrackContact] = useState('')
  const [trackError, setTrackError] = useState<string | null>(null)
  const [trackingResult, setTrackingResult] = useState<any | null>(null)

  // Institution Response Desk state
  const [instPermId, setInstPermId] = useState('1-10023412')
  const [instCaseRef, setInstCaseRef] = useState('RB-2026-001084')
  const [instLookupResult, setInstLookupResult] = useState<any | null>(null)
  const [instLookupError, setInstLookupError] = useState<string | null>(null)
  const [respondentName, setRespondentName] = useState('')
  const [respondentDesignation, setRespondentDesignation] = useState('Principal / Director')
  const [respondentEmail, setRespondentEmail] = useState('')
  const [respondentPhone, setRespondentPhone] = useState('')
  const [instExplanation, setInstExplanation] = useState('')
  const [instDocs, setInstDocs] = useState<{ name: string; type: string }[]>([])
  const [instCertified, setInstCertified] = useState(false)
  const [instSubmitSuccess, setInstSubmitSuccess] = useState<any | null>(null)
  const [instSubmitError, setInstSubmitError] = useState<string | null>(null)

  // Timer countdown hook for 5-minute OTP
  useEffect(() => {
    let interval: any = null
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [step, timer])

  // Cooldown countdown hook
  useEffect(() => {
    let interval: any = null
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [cooldown])

  // Institution Permanent ID Auto-Lookup
  const handlePermIdLookup = (val: string) => {
    setPermIdSearch(val)
    const found = snapshot.institutions.find(
      (i) => i.aicte_permanent_id.toLowerCase() === val.trim().toLowerCase()
    )
    if (found) {
      setSelectedInstId(found.id)
      setMatchedInst(found)
    }
  }

  // Handle Institution Select Change
  const handleInstSelect = (id: string) => {
    setSelectedInstId(id)
    const found = snapshot.institutions.find((i) => i.id === id) || null
    setMatchedInst(found)
    if (found) {
      setPermIdSearch(found.aicte_permanent_id)
    }
  }

  // Generate & Dispatch OTPs for Step 2
  const handleSendOTPs = () => {
    if (!email || !mobile) {
      setOtpError('Please provide both a valid email and 10-digit mobile number.')
      return
    }
    const eRes = requestOTP(email, 'email')
    const mRes = requestOTP(mobile, 'mobile')

    if (!eRes.ok || !mRes.ok) {
      setOtpError(eRes.error || mRes.error || 'Rate limit in effect.')
      return
    }

    setTimer(300)
    setCooldown(30)
    setOtpError(null)
    setDispEmailOtp(eRes.code || '')
    setDispMobileOtp(mRes.code || '')
    setSimulatedNotice(`[Simulated Gateway] Email OTP: ${eRes.code} | Mobile SMS OTP: ${mRes.code}`)
    setStep(2)
  }

  // Resend OTP
  const handleResend = () => {
    if (cooldown > 0) return
    handleSendOTPs()
  }

  // Auto Fill & Verify both OTPs for instant demo evaluation
  const handleAutoFillAndVerify = () => {
    if (dispEmailOtp && dispMobileOtp) {
      setEmailOtp(dispEmailOtp)
      setMobileOtp(dispMobileOtp)
      const eRes = verifyOTP(email, dispEmailOtp)
      const mRes = verifyOTP(mobile, dispMobileOtp)
      if (eRes.ok && mRes.ok) {
        setEmailVerified(true)
        setMobileVerified(true)
        setOtpError(null)
      } else {
        setOtpError(eRes.error || mRes.error || 'Verification failed.')
      }
    }
  }

  // Verify Email OTP
  const handleVerifyEmail = () => {
    const res = verifyOTP(email, emailOtp)
    if (res.ok) {
      setEmailVerified(true)
      setOtpError(null)
    } else {
      setOtpError(res.error || 'Failed to verify email OTP.')
    }
  }

  // Verify Mobile OTP
  const handleVerifyMobile = () => {
    const res = verifyOTP(mobile, mobileOtp)
    if (res.ok) {
      setMobileVerified(true)
      setOtpError(null)
    } else {
      setOtpError(res.error || 'Failed to verify mobile OTP.')
    }
  }

  // Final Submit Complaint
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailVerified || !mobileVerified) {
      setOtpError('Both Email and Mobile verifications must be verified before submission.')
      setStep(2)
      return
    }
    if (!subject.trim() || !description.trim() || !selectedInstId) {
      setOtpError('Please fill in all mandatory complaint fields.')
      return
    }

    try {
      const created = submitPublicComplaint({
        complainant_name: complainantName || 'Concerned Citizen / Student',
        complainant_type: complainantType,
        complainant_email: email,
        complainant_mobile: mobile,
        institution_id: selectedInstId,
        complaint_category: category,
        sub_category: subCategory,
        incident_date: incidentDate,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        documents,
      })

      const targetB = snapshot.bureaus.find((b) => b.id === created.bureau_id)?.name || 'Regulation Bureau'

      setSubmittedCase({
        case_id: created.case_id,
        complainant_reference: created.complainant_reference,
        target_bureau: targetB,
        received_date: created.received_date,
        expected_disposal_date: created.expected_disposal_date,
      })
      setStep(5)
    } catch (err: any) {
      setOtpError(err.message || 'Error submitting complaint.')
    }
  }

  // Public Tracking Search
  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTrackError(null)
    setTrackingResult(null)

    if (!trackCaseId.trim()) {
      setTrackError('Please enter a Complaint ID or Case Reference.')
      return
    }

    const res = getPublicTracking(trackCaseId, trackContact)
    if (res.ok) {
      setTrackingResult(res.case)
    } else {
      setTrackError(res.error || 'No matching case record found.')
    }
  }

  // Institution Response Desk Handlers
  const handleInstitutionLookup = (e: React.FormEvent) => {
    e.preventDefault()
    setInstLookupError(null)
    setInstLookupResult(null)
    setInstSubmitSuccess(null)

    if (!instPermId.trim() || !instCaseRef.trim()) {
      setInstLookupError('Please enter both AICTE Permanent ID and Inquiry Reference / Case ID.')
      return
    }

    const res = getCaseForInstitution(instPermId, instCaseRef)
    if (res.ok) {
      setInstLookupResult(res)
      setRespondentEmail(res.institution.contact_email)
      setRespondentPhone(res.institution.contact_phone)
    } else {
      setInstLookupError(res.error)
    }
  }

  const handleInstitutionSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setInstSubmitError(null)

    if (!respondentName.trim() || !instExplanation.trim()) {
      setInstSubmitError('Please provide respondent name and full written explanation.')
      return
    }

    if (!instCertified) {
      setInstSubmitError('You must solemnly affirm the statutory certification checkbox.')
      return
    }

    const res = submitPublicInstitutionResponse({
      permanentId: instPermId,
      caseIdOrRef: instCaseRef,
      respondentName: respondentName.trim(),
      respondentDesignation: respondentDesignation.trim(),
      officialEmail: respondentEmail.trim(),
      officialPhone: respondentPhone.trim(),
      explanation: instExplanation.trim(),
      documentNames: instDocs.map((d) => d.name),
    })

    if (res.ok) {
      setInstSubmitSuccess({
        case_id: res.case_id,
        institution_name: res.institution_name,
        timestamp: new Date().toISOString(),
        ack_number: `ACK-INST-${Math.floor(100000 + Math.random() * 900000)}`,
      })
      setInstLookupResult(null)
    } else {
      setInstSubmitError(res.error)
    }
  }

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex flex-col font-sans">
      {/* 1. Official Government of India Top Bar */}
      <GovernmentTopBar />

      {/* 2. Official AICTE Brand Masthead */}
      <OfficialAicteHeader />

      {/* 3. Official Navigation Ribbon with Two Entry Points Highlight */}
      <div className="bg-[#003366] text-white border-b-4 border-[#ff9933] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-[#ff9933] text-[#002244] font-black text-[11px] px-2 py-0.5 rounded uppercase tracking-wider">
              Public Grievance Portal
            </span>
            <div>
              <p className="text-[14px] sm:text-[16px] font-bold text-white tracking-wide">
                AICTE CaseSync — Public Complaint Redressal System
              </p>
              <p className="text-[11px] text-white/80">
                Online Single Window for Students, Faculty, Parents & Institutional Stakeholders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('lodge')}
              className={`px-3.5 py-1.5 rounded-[3px] text-[13px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'lodge'
                  ? 'bg-[#ff9933] text-[#002244] shadow-xs'
                  : 'bg-[#002244] text-white/90 hover:bg-[#002a54]'
              }`}
            >
              <FileText size={15} />
              <span>Raise a Complaint</span>
            </button>
            <button
              onClick={() => setActiveTab('track')}
              className={`px-3.5 py-1.5 rounded-[3px] text-[13px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'track'
                  ? 'bg-[#ff9933] text-[#002244] shadow-xs'
                  : 'bg-[#002244] text-white/90 hover:bg-[#002a54]'
              }`}
            >
              <Search size={15} />
              <span>Track Complaint Status</span>
            </button>
            <button
              onClick={() => setActiveTab('institution')}
              className={`px-3.5 py-1.5 rounded-[3px] text-[13px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'institution'
                  ? 'bg-[#ff9933] text-[#002244] shadow-xs'
                  : 'bg-[#002244] text-white/90 hover:bg-[#002a54]'
              }`}
            >
              <Building size={15} />
              <span>Institution Response Desk</span>
            </button>
            <Link
              to="/login"
              className="px-3.5 py-1.5 rounded-[3px] text-[13px] font-bold transition cursor-pointer bg-white text-[#003366] hover:bg-[#f1f5f9] flex items-center gap-1.5 ml-2 border border-white/80"
            >
              <Lock size={14} className="text-[#ff9933]" />
              <span>Official Admin Gateway</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Main Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* PUBLIC COMPLAINT LODGING FLOW */}
        {activeTab === 'lodge' ? (
          <div className="space-y-6">
            {/* Header info card */}
            <div className="bg-white rounded-[3px] border border-[#cbd5e1] p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3 mb-4">
                <div className="flex items-center gap-2 text-[#003366]">
                  <ShieldCheck size={24} className="text-[#003366]" />
                  <div>
                    <h2 className="text-[17px] font-bold tracking-tight">
                      Lodge Institution-Related Grievance / Complaint
                    </h2>
                    <p className="text-[12px] text-[#64748b]">
                      AICTE Regulation Bureau & Public Grievance Redressal Cell (PGRC) Single Window
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-block bg-[#f0f4f8] text-[#003366] font-bold text-[11px] px-2.5 py-1 rounded border border-[#cbd5e1]">
                  Citizens&apos; Charter Resolution SLA Applicable
                </span>
              </div>

              {/* Multi-step progress tracker */}
              <div className="mb-2">
                {/* Mobile Step Status Header */}
                <div className="sm:hidden flex items-center justify-between text-[11px] text-[#64748b] mb-2 px-1">
                  <span className="font-medium">
                    Step {step} of 5: <strong className="text-[#003366] font-bold">{FORM_STEPS[step - 1]?.title}</strong>
                  </span>
                  <span className="text-[10px] text-[#94a3b8] flex items-center gap-0.5">Swipe steps →</span>
                </div>

                {/* Steps Container: fixed length dimensions for mobile view with horizontal scroll, 5-col grid for tablet/desktop */}
                <div
                  ref={stepsContainerRef}
                  className="flex sm:grid sm:grid-cols-5 gap-2 overflow-x-auto pb-2 sm:pb-0 scroll-smooth no-scrollbar sm:overflow-visible"
                >
                  {FORM_STEPS.map((s) => {
                    const isActive = step === s.step
                    const isCompleted = step > s.step

                    let boxStyles = 'border-[#cbd5e1] bg-[#f8fafc] text-[#64748b]'
                    let labelStyles = 'text-[#94a3b8]'
                    let titleStyles = 'text-[#475569]'

                    if (isActive) {
                      if (s.step === 5) {
                        boxStyles = 'border-emerald-600 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200'
                      } else {
                        boxStyles = 'border-[#003366] bg-[#003366] text-white shadow-sm ring-2 ring-blue-100'
                      }
                      labelStyles = 'text-white/80'
                      titleStyles = 'text-white'
                    } else if (isCompleted) {
                      boxStyles = 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      labelStyles = 'text-emerald-700 font-semibold'
                      titleStyles = 'text-emerald-900'
                    }

                    return (
                      <div
                        key={s.step}
                        className={`w-[130px] min-w-[130px] sm:w-auto sm:min-w-0 h-[60px] shrink-0 sm:shrink flex flex-col items-center justify-center px-2 py-1.5 rounded-[3px] border text-center transition-all duration-150 select-none overflow-hidden ${boxStyles} ${
                          isCompleted && step !== 5 ? 'cursor-pointer hover:opacity-90' : ''
                        }`}
                        onClick={() => {
                          if (isCompleted && step !== 5) {
                            setStep(s.step as any)
                          }
                        }}
                      >
                        <span className={`text-[10px] uppercase tracking-wider block leading-none mb-1 flex items-center justify-center gap-1 ${labelStyles}`}>
                          {isCompleted ? <Check size={11} className="stroke-[3]" /> : null}
                          {s.label}
                        </span>
                        <span className={`text-[12px] font-bold block leading-tight break-words max-w-full ${titleStyles}`}>
                          {s.title}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Simulated Banner for Easy Evaluation / Demo Testing */}
            {simulatedNotice && (
              <div className="bg-[#fffbeb] border border-[#fef3c7] p-3 rounded-[3px] text-[13px] text-[#92400e] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-mono font-bold break-all sm:break-normal">{simulatedNotice}</span>
                <span className="text-[11px] bg-[#d97706] text-white px-2 py-0.5 rounded font-sans font-bold shrink-0 self-start sm:self-auto">
                  Demo Gateway Active
                </span>
              </div>
            )}

            {/* Error banner */}
            {otpError && (
              <div className="bg-[#fef2f2] border border-[#fecdd3] p-3 rounded-[3px] text-[13px] text-[#b91c1c] flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>{otpError}</span>
              </div>
            )}

            {/* STEP 1: COMPLAINANT INFORMATION */}
            {step === 1 && (
              <div className="bg-white rounded-[3px] border border-[#cbd5e1] p-6 shadow-sm space-y-5">
                <div className="border-b border-[#e2e8f0] pb-2">
                  <h3 className="text-[15px] font-bold text-[#003366] uppercase tracking-wide">
                    Step 1 — Complainant Information
                  </h3>
                  <p className="text-[12px] text-[#64748b]">
                    AICTE requires verified contact details to authenticate grievances and prevent anonymous frivolous filings.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-bold text-[#003366] mb-1">
                      Complainant Category / Stakeholder Type *
                    </label>
                    <select
                      className="w-full rounded-[3px] border border-[#cbd5e1] bg-white p-2 text-[13px] outline-none focus:border-[#003366]"
                      value={complainantType}
                      onChange={(e) => setComplainantType(e.target.value as ComplainantType)}
                    >
                      {COMPLAINANT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[#003366] mb-1">
                      Full Name of Complainant *
                    </label>
                    <input
                      className="w-full rounded-[3px] border border-[#cbd5e1] p-2 text-[13px] outline-none focus:border-[#003366]"
                      placeholder="e.g. Anand Sharma / Confidential Student"
                      value={complainantName}
                      onChange={(e) => setComplainantName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[#003366] mb-1">
                      Email Address (for 6-digit OTP verification) *
                    </label>
                    <input
                      type="email"
                      className="w-full rounded-[3px] border border-[#cbd5e1] p-2 text-[13px] outline-none focus:border-[#003366]"
                      placeholder="citizen.student@domain.in"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setEmailVerified(false)
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[#003366] mb-1">
                      Mobile Number (10 digits for SMS OTP verification) *
                    </label>
                    <input
                      type="tel"
                      className="w-full rounded-[3px] border border-[#cbd5e1] p-2 text-[13px] outline-none focus:border-[#003366]"
                      placeholder="98XXXXXXXX"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => {
                        setMobile(e.target.value)
                        setMobileVerified(false)
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#e2e8f0] flex justify-end">
                  <button
                    type="button"
                    onClick={handleSendOTPs}
                    className="bg-[#003366] hover:bg-[#002244] text-white font-bold text-[13px] px-6 py-2.5 rounded-[3px] transition flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Proceed to OTP Verification</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: DEDICATED EMAIL + MOBILE OTP VERIFICATION SCREEN */}
            {step === 2 && (
              <div className="bg-white rounded-[3px] border-2 border-[#003366] p-6 shadow-sm space-y-6">
                <div className="border-b border-[#e2e8f0] pb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[16px] font-bold text-[#003366] uppercase tracking-wide flex items-center gap-2">
                      <Lock size={18} className="text-[#ff9933]" />
                      Step 2 — Dual Email & Mobile OTP Verification
                    </h3>
                    <p className="text-[12px] text-[#475569]">
                      Mandatory under AICTE Security Policy: Both contact channels must be independently verified before filing.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-[#fee2e2] text-[#991b1b] border border-[#fecdd3] px-3 py-1 rounded text-[13px] font-mono font-bold">
                    <Clock size={16} />
                    <span>OTP expires in {formatTime(timer)}</span>
                  </div>
                </div>

                {/* Demo Evaluation Helper Banner with Auto-Fill */}
                <div className="bg-[#eff6ff] border border-[#bfdbfe] p-3.5 rounded-[3px] flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-bold text-[#1e40af] text-[13px] flex items-center gap-1.5">
                      <ShieldCheck size={16} /> Prototype / Demo Verification Gateway Active
                    </p>
                    <p className="text-[12px] text-[#475569]">
                      Since telecom cellular SMS requires a paid DLT TRAI carrier gateway, 6-digit test codes are generated on-screen and securely tracked:
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-[12px]">
                      <span className="bg-white px-2.5 py-1 border border-[#bfdbfe] rounded text-[#1e40af]">
                        Email OTP: <strong className="font-bold text-[14px] text-[#003366]">{dispEmailOtp || '123456'}</strong>
                      </span>
                      <span className="bg-white px-2.5 py-1 border border-[#bbf7d0] rounded text-[#166534]">
                        Mobile SMS OTP: <strong className="font-bold text-[14px] text-[#15803d]">{dispMobileOtp || '654321'}</strong>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoFillAndVerify}
                    className="bg-[#003366] hover:bg-[#002244] text-white font-bold text-[12px] px-4 py-2 rounded-[3px] transition cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>Auto-Fill & Verify Both</span>
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Email OTP Verification Box */}
                  <div className="border border-[#cbd5e1] rounded-[3px] p-4 bg-[#f8fafc] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[13px] text-[#003366]">1. Email OTP Verification</span>
                      {emailVerified ? (
                        <span className="bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0] px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1">
                          <Check size={13} /> Email ✓ Verified
                        </span>
                      ) : (
                        <span className="bg-[#fef3c7] text-[#b45309] px-2 py-0.5 rounded text-[11px] font-bold">
                          Pending Verification
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#64748b]">Sent to: <strong>{email}</strong></p>
                    {dispEmailOtp && !emailVerified && (
                      <div className="bg-[#f0f9ff] border border-[#bae6fd] p-2 rounded text-[11px] text-[#0369a1] flex items-center justify-between">
                        <span>Generated OTP: <strong className="font-mono text-[13px]">{dispEmailOtp}</strong></span>
                        <button
                          type="button"
                          onClick={() => setEmailOtp(dispEmailOtp)}
                          className="text-[#003366] font-bold underline cursor-pointer"
                        >
                          Click to insert
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        className="w-full rounded-[3px] border border-[#cbd5e1] p-2 text-[14px] font-mono text-center tracking-widest font-bold outline-none focus:border-[#003366] bg-white"
                        placeholder="6-digit OTP"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value)}
                        disabled={emailVerified}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyEmail}
                        disabled={emailVerified || emailOtp.length < 6}
                        className="bg-[#003366] disabled:bg-gray-400 text-white font-bold text-[12px] px-4 py-2 rounded-[3px] transition cursor-pointer"
                      >
                        {emailVerified ? 'Verified' : 'Verify'}
                      </button>
                    </div>
                  </div>

                  {/* Mobile SMS OTP Verification Box */}
                  <div className="border border-[#cbd5e1] rounded-[3px] p-4 bg-[#f8fafc] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[13px] text-[#003366]">2. Mobile SMS OTP Verification</span>
                      {mobileVerified ? (
                        <span className="bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0] px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1">
                          <Check size={13} /> Mobile ✓ Verified
                        </span>
                      ) : (
                        <span className="bg-[#fef3c7] text-[#b45309] px-2 py-0.5 rounded text-[11px] font-bold">
                          Pending Verification
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#64748b]">Sent to: <strong>+91-{mobile}</strong></p>
                    {dispMobileOtp && !mobileVerified && (
                      <div className="bg-[#f0fdf4] border border-[#bbf7d0] p-2 rounded text-[11px] text-[#15803d] flex items-center justify-between">
                        <span>Generated OTP: <strong className="font-mono text-[13px]">{dispMobileOtp}</strong></span>
                        <button
                          type="button"
                          onClick={() => setMobileOtp(dispMobileOtp)}
                          className="text-[#15803d] font-bold underline cursor-pointer"
                        >
                          Click to insert
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        className="w-full rounded-[3px] border border-[#cbd5e1] p-2 text-[14px] font-mono text-center tracking-widest font-bold outline-none focus:border-[#003366] bg-white"
                        placeholder="6-digit OTP"
                        value={mobileOtp}
                        onChange={(e) => setMobileOtp(e.target.value)}
                        disabled={mobileVerified}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyMobile}
                        disabled={mobileVerified || mobileOtp.length < 6}
                        className="bg-[#003366] disabled:bg-gray-400 text-white font-bold text-[12px] px-4 py-2 rounded-[3px] transition cursor-pointer"
                      >
                        {mobileVerified ? 'Verified' : 'Verify'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#e2e8f0] pt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={cooldown > 0}
                      className="text-[12px] font-bold text-[#003366] hover:underline flex items-center gap-1 disabled:text-gray-400 cursor-pointer"
                    >
                      <RotateCw size={14} className={cooldown > 0 ? 'animate-spin' : ''} />
                      <span>{cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}</span>
                    </button>
                    <span className="text-[#cbd5e1]">|</span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-[12px] font-semibold text-[#64748b] hover:text-[#003366] underline cursor-pointer"
                    >
                      Change Contact Details
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!emailVerified || !mobileVerified}
                    onClick={() => setStep(3)}
                    className="bg-[#15803d] disabled:bg-gray-400 hover:bg-[#166534] text-white font-bold text-[13px] px-6 py-2.5 rounded-[3px] transition flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Proceed to Institution Selection</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: INSTITUTION INFORMATION & PERMANENT ID LOOKUP */}
            {step === 3 && (
              <div className="bg-white rounded-[3px] border border-[#cbd5e1] p-6 shadow-sm space-y-5">
                <div className="border-b border-[#e2e8f0] pb-2">
                  <h3 className="text-[15px] font-bold text-[#003366] uppercase tracking-wide">
                    Step 3 — Institution Particulars (AICTE Permanent ID Lookup)
                  </h3>
                  <p className="text-[12px] text-[#64748b]">
                    Search using the AICTE Permanent ID or select the institution from the official national directory.
                  </p>
                </div>

                {/* Permanent ID Lookup bar */}
                <div className="p-4 bg-[#f0f4f8] border border-[#cbd5e1] rounded-[3px] space-y-2">
                  <label className="block text-[13px] font-bold text-[#003366]">
                    Lookup by AICTE Permanent ID (e.g. 1-10023412 or 1-20045189)
                  </label>
                  <div className="flex gap-2">
                    <input
                      className="w-full rounded-[3px] border border-[#cbd5e1] p-2 text-[13px] font-mono outline-none focus:border-[#003366] bg-white"
                      placeholder="Type AICTE Permanent ID..."
                      value={permIdSearch}
                      onChange={(e) => handlePermIdLookup(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handlePermIdLookup(permIdSearch)}
                      className="bg-[#003366] text-white px-4 py-2 rounded-[3px] text-[12px] font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Search size={14} />
                      <span>Lookup</span>
                    </button>
                  </div>
                </div>

                {/* Directory Dropdown Select */}
                <div>
                  <label className="block text-[13px] font-bold text-[#003366] mb-1">
                    Or Select Institution from Directory:
                  </label>
                  <select
                    className="w-full rounded-[3px] border border-[#cbd5e1] p-2.5 text-[13px] outline-none focus:border-[#003366] bg-white font-medium"
                    value={selectedInstId}
                    onChange={(e) => handleInstSelect(e.target.value)}
                  >
                    {snapshot.institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.institution_name} ({inst.aicte_permanent_id}) — {inst.city}, {inst.state} [{inst.region} Region]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto-populated Institutional Information Card */}
                {matchedInst && (
                  <div className="p-4 rounded-[3px] border-l-4 border-l-[#003366] border border-[#cbd5e1] bg-[#f8fafc]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-[#003366] text-[14px] flex items-center gap-1.5">
                        <Building size={16} /> {matchedInst.institution_name}
                      </p>
                      <span className="font-mono bg-[#e2e8f0] text-[#003366] font-bold text-[11px] px-2 py-0.5 rounded">
                        Permanent ID: {matchedInst.aicte_permanent_id}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-2 text-[12px] text-[#475569]">
                      <div>
                        <strong>State & Region:</strong> {matchedInst.state} ({matchedInst.region})
                      </div>
                      <div>
                        <strong>District / City:</strong> {matchedInst.district || matchedInst.city}
                      </div>
                      <div>
                        <strong>Institution Category:</strong> {matchedInst.institution_type}
                      </div>
                      <div className="sm:col-span-3 text-[11px] text-[#64748b]">
                        Address: {matchedInst.address}, Pincode: {matchedInst.pincode}
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-[#e2e8f0] pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="border border-[#cbd5e1] hover:bg-gray-100 text-[#475569] font-bold text-[13px] px-5 py-2 rounded-[3px] cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="bg-[#003366] hover:bg-[#002244] text-white font-bold text-[13px] px-6 py-2.5 rounded-[3px] transition flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Proceed to Grievance Details</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: COMPLAINT INFORMATION & EVIDENCE UPLOAD */}
            {step === 4 && (
              <form onSubmit={handleFinalSubmit} className="bg-white rounded-[3px] border border-[#cbd5e1] p-6 shadow-sm space-y-5">
                <div className="border-b border-[#e2e8f0] pb-2">
                  <h3 className="text-[15px] font-bold text-[#003366] uppercase tracking-wide">
                    Step 4 — Grievance Details & Evidence Upload
                  </h3>
                  <p className="text-[12px] text-[#64748b]">
                    Provide accurate facts, dates, and attach supporting documentation for expedited processing.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-bold text-[#003366] mb-1">
                      Complaint Category *
                    </label>
                    <select
                      className="w-full rounded-[3px] border border-[#cbd5e1] p-2 text-[13px] outline-none focus:border-[#003366] bg-white"
                      value={category}
                      onChange={(e) => {
                        const newCat = e.target.value as Category
                        setCategory(newCat)
                        setSubCategory(CATEGORY_SUB_CATEGORIES[newCat]?.[0] || 'General')
                      }}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[#003366] mb-1">
                      Sub-Category *
                    </label>
                    <select
                      className="w-full rounded-[3px] border border-[#cbd5e1] p-2 text-[13px] outline-none focus:border-[#003366] bg-white"
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                    >
                      {(CATEGORY_SUB_CATEGORIES[category] || ['General']).map((sub: string) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[#003366] mb-1">
                      Date of Incident / Grievance *
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-[3px] border border-[#cbd5e1] p-2 text-[13px] outline-none focus:border-[#003366] bg-white"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[#003366] mb-1">
                      Urgency / Priority Level *
                    </label>
                    <select
                      className="w-full rounded-[3px] border border-[#cbd5e1] p-2 text-[13px] outline-none focus:border-[#003366] bg-white font-semibold"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-[#003366] mb-1">
                    Complaint Subject / Summary *
                  </label>
                  <input
                    className="w-full rounded-[3px] border border-[#cbd5e1] p-2 text-[13px] outline-none focus:border-[#003366]"
                    placeholder="Clear single-sentence summary of the grievance..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-[#003366] mb-1">
                    Comprehensive Narrative / Factual Description *
                  </label>
                  <textarea
                    rows={6}
                    className="w-full rounded-[3px] border border-[#cbd5e1] p-3 text-[13px] outline-none focus:border-[#003366] font-sans"
                    placeholder="Explain the entire grievance chronologically, including names of college officials involved, receipts/notices cited, and relief sought..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                {/* Evidence Upload Section */}
                <div className="border border-[#cbd5e1] rounded-[3px] p-4 bg-[#f8fafc] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[13px] text-[#003366] flex items-center gap-1.5">
                      <Upload size={16} /> Supporting Documents & Evidence (PDF / Images, Max 10MB)
                    </span>
                    <span className="text-[11px] text-[#64748b]">Encrypted AICTE Document Vault</span>
                  </div>

                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="text-[12px] text-[#475569] file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-[#cbd5e1] file:text-[12px] file:font-bold file:bg-[#003366] file:text-white cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files) {
                        const newDocs = Array.from(e.target.files).map((f) => ({
                          name: f.name,
                          type: f.type || 'Document Evidence',
                        }))
                        setDocuments(newDocs)
                        setUploadedFileNotice(`Attached ${newDocs.length} evidence file(s).`)
                      }
                    }}
                  />

                  {uploadedFileNotice && (
                    <p className="text-[12px] text-emerald-700 font-semibold">{uploadedFileNotice}</p>
                  )}
                </div>

                {/* Verification confirmation tags */}
                <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-[3px] text-[12px] text-[#15803d] flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1.5">
                    <UserCheck size={16} /> Complainant Identity Authenticated
                  </span>
                  <span className="font-mono text-[11px] font-bold">
                    Email ✓ Verified | Mobile ✓ Verified
                  </span>
                </div>

                <div className="border-t border-[#e2e8f0] pt-4 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="border border-[#cbd5e1] hover:bg-gray-100 text-[#475569] font-bold text-[13px] px-5 py-2 rounded-[3px] cursor-pointer"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    className="bg-[#003366] hover:bg-[#002244] text-white font-bold text-[14px] px-8 py-2.5 rounded-[3px] transition flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Send size={16} className="text-[#ff9933]" />
                    <span>Submit Official Complaint to AICTE</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 5: COMPLAINT SUBMISSION SUCCESS CONFIRMATION */}
            {step === 5 && submittedCase && (
              <div className="bg-white rounded-[3px] border-2 border-emerald-600 p-8 shadow-md text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>

                <div>
                  <h3 className="text-[20px] font-bold text-[#003366]">Complaint Submitted Successfully</h3>
                  <p className="text-[13px] text-[#475569] mt-1">
                    Your complaint has been accepted into the AICTE CaseSync system and routed for official inquiry.
                  </p>
                </div>

                {/* Primary Case ID Badge */}
                <div className="bg-[#f0f4f8] border border-[#cbd5e1] p-4 rounded-[3px] max-w-md mx-auto">
                  <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                    Official AICTE Complaint ID
                  </p>
                  <p className="text-[24px] font-black font-mono text-[#003366] mt-0.5 tracking-wider">
                    {submittedCase.case_id}
                  </p>
                  <p className="text-[11px] text-[#475569] font-mono mt-1">
                    Reference: {submittedCase.complainant_reference}
                  </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 text-left max-w-2xl mx-auto text-[13px] p-4 bg-[#f8fafc] rounded border border-[#e2e8f0]">
                  <div>
                    <span className="text-[#64748b] text-[11px] font-bold block uppercase">Current Status</span>
                    <span className="font-bold text-[#003366]">NEW / Pending Bureau Review</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] text-[11px] font-bold block uppercase">Assigned Bureau</span>
                    <span className="font-bold text-[#003366]">{submittedCase.target_bureau}</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] text-[11px] font-bold block uppercase">Expected Next Action</span>
                    <span className="font-bold text-[#15803d]">Document Review & Case Officer Assignment</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTrackCaseId(submittedCase.case_id)
                      setTrackContact(email)
                      setActiveTab('track')
                      setStep(1)
                    }}
                    className="bg-[#003366] hover:bg-[#002244] text-white font-bold text-[13px] px-6 py-2.5 rounded-[3px] transition flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Search size={16} className="text-[#ff9933]" />
                    <span>Track Status of this Complaint</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep(1)
                      setSubject('')
                      setDescription('')
                      setEmailVerified(false)
                      setMobileVerified(false)
                    }}
                    className="border border-[#cbd5e1] hover:bg-gray-100 text-[#475569] font-bold text-[13px] px-5 py-2.5 rounded-[3px] cursor-pointer"
                  >
                    Lodge Another Grievance
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* PUBLIC COMPLAINT TRACKING PORTAL (SECTION 8) */
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-[3px] border border-[#cbd5e1] p-6 shadow-xs">
              <div className="border-b border-[#e2e8f0] pb-3 mb-4">
                <h2 className="text-[18px] font-bold text-[#003366] tracking-tight flex items-center gap-2">
                  <Search size={20} className="text-[#003366]" />
                  Public Complaint Status Tracking
                </h2>
                <p className="text-[12px] text-[#64748b]">
                  Secure citizen portal. Enter your verified Complaint ID and either your verified Email or Mobile number.
                </p>
              </div>

              <form onSubmit={handleTrackSubmit} className="grid sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5">
                  <label className="block text-[12px] font-bold text-[#003366] mb-1">
                    AICTE Complaint ID / Reference Number *
                  </label>
                  <input
                    className="w-full rounded-[3px] border border-[#cbd5e1] p-2 text-[13px] font-mono outline-none focus:border-[#003366]"
                    placeholder="e.g. RB-2026-001084 or PGRC-2026-00883"
                    value={trackCaseId}
                    onChange={(e) => setTrackCaseId(e.target.value)}
                    required
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[12px] font-bold text-[#003366] mb-1">
                    Verified Email ID or Mobile Number *
                  </label>
                  <input
                    className="w-full rounded-[3px] border border-[#cbd5e1] p-2 text-[13px] outline-none focus:border-[#003366]"
                    placeholder="email@domain.com or 10-digit mobile"
                    value={trackContact}
                    onChange={(e) => setTrackContact(e.target.value)}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full bg-[#003366] hover:bg-[#002244] text-white font-bold text-[13px] py-2 rounded-[3px] transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Search size={15} />
                    <span>Track</span>
                  </button>
                </div>
              </form>

              {trackError && (
                <div className="mt-4 p-3 bg-[#fef2f2] border border-[#fecdd3] text-[#b91c1c] text-[13px] rounded-[3px] flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{trackError}</span>
                </div>
              )}
            </div>

            {/* Tracking Result Display (Section 8 Format) */}
            {trackingResult && (
              <div className="bg-white rounded-[3px] border-2 border-[#003366] p-6 shadow-md space-y-6">
                <div className="flex flex-wrap items-center justify-between border-b border-[#e2e8f0] pb-4 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block">
                      Case Tracking Record
                    </span>
                    <h3 className="text-[22px] font-black font-mono text-[#003366]">
                      {trackingResult.case_id}
                    </h3>
                    <p className="text-[12px] font-semibold text-[#1e293b]">
                      {trackingResult.institution_name} ({trackingResult.aicte_permanent_id})
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="bg-[#003366] text-white text-[12px] font-bold px-3 py-1 rounded">
                      Status: {trackingResult.status}
                    </span>
                    <p className="text-[11px] text-[#64748b] mt-1 font-semibold">
                      Current Stage: <span className="text-[#b45309]">{trackingResult.current_stage}</span>
                    </p>
                  </div>
                </div>

                {/* Overview metadata grid */}
                <div className="grid sm:grid-cols-4 gap-4 text-[13px] p-4 bg-[#f8fafc] rounded border border-[#e2e8f0]">
                  <div>
                    <span className="text-[#64748b] text-[11px] font-bold block uppercase">Category</span>
                    <span className="font-semibold text-[#003366]">{trackingResult.category}</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] text-[11px] font-bold block uppercase">Target Bureau</span>
                    <span className="font-semibold text-[#003366]">{trackingResult.target_bureau}</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] text-[11px] font-bold block uppercase">Submitted Date</span>
                    <span className="font-semibold text-[#1e293b]">
                      {new Date(trackingResult.submitted_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748b] text-[11px] font-bold block uppercase">Last Updated</span>
                    <span className="font-semibold text-[#1e293b]">
                      {new Date(trackingResult.last_updated).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Subject and Next Action */}
                <div className="p-4 bg-[#fffbeb] border-l-4 border-l-[#ff9933] border border-[#fef3c7] rounded-[3px]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#92400e]">Next Expected Action</p>
                  <p className="text-[14px] font-bold text-[#003366] mt-0.5">{trackingResult.next_action}</p>
                  <p className="text-[12px] text-[#475569] mt-2">
                    Subject: <em>&quot;{trackingResult.subject}&quot;</em>
                  </p>
                </div>

                {/* Sanitized Public Progress Timeline */}
                <div>
                  <h4 className="text-[14px] font-bold text-[#003366] uppercase tracking-wide border-b border-[#e2e8f0] pb-2 mb-4">
                    Public Inquiry Progression Milestone
                  </h4>
                  <ol className="relative border-l border-[#003366]/40 ml-3 space-y-6">
                    {trackingResult.timeline.map((step: any, idx: number) => (
                      <li key={idx} className="ml-6">
                        <span
                          className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full text-white text-[11px] font-bold ${
                            step.completed ? 'bg-emerald-600' : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          {step.completed ? '✓' : idx + 1}
                        </span>
                        <h5 className="font-bold text-[13px] text-[#003366]">{step.title}</h5>
                        <p className="text-[12px] text-[#475569] mt-0.5">{step.description}</p>
                        {step.date && (
                          <span className="text-[10px] text-[#64748b] font-mono">
                            {new Date(step.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="bg-[#f8fafc] border border-[#e2e8f0] p-3 rounded-[3px] text-[11px] text-[#64748b] text-center">
                  Confidential internal officer remarks and intra-bureau communications are protected under AICTE administrative regulations.
                </div>
              </div>
            )}
          </div>
        )}

        {/* INSTITUTION RESPONSE DESK FLOW */}
        {activeTab === 'institution' && (
          <div className="space-y-6">
            <div className="bg-white rounded-[3px] border border-[#cbd5e1] p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3 mb-4">
                <div className="flex items-center gap-2.5 text-[#003366]">
                  <Building size={24} className="text-[#003366]" />
                  <div>
                    <h2 className="text-[17px] font-bold tracking-tight">
                      Institution Compliance & Clarification Desk
                    </h2>
                    <p className="text-[12px] text-[#64748b]">
                      Official Single Window for Colleges & Universities to Furnish Clarifications & Action Taken Reports (ATRs)
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-block bg-[#eff6ff] text-[#1e40af] font-bold text-[11px] px-2.5 py-1 rounded border border-[#bfdbfe]">
                  Statutory Non-Repudiation Gateway
                </span>
              </div>

              {/* Inquiry Lookup Section */}
              <form onSubmit={handleInstitutionLookup} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-[#003366] uppercase tracking-wide mb-1">
                      AICTE Permanent Institution ID *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-[13px] border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#003366] font-mono"
                      placeholder="e.g. 1-10023412"
                      value={instPermId}
                      onChange={(e) => setInstPermId(e.target.value)}
                      required
                    />
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#64748b]">
                      <span>Quick Demo Preset:</span>
                      <button
                        type="button"
                        onClick={() => setInstPermId('1-10023412')}
                        className="text-[#003366] underline font-bold cursor-pointer"
                      >
                        1-10023412 (ABC College)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[#003366] uppercase tracking-wide mb-1">
                      Inquiry Reference / Case ID *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-[13px] border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#003366] font-mono"
                      placeholder="e.g. RB-2026-001084 or REF-2026-TN-00184"
                      value={instCaseRef}
                      onChange={(e) => setInstCaseRef(e.target.value)}
                      required
                    />
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#64748b]">
                      <span>Quick Demo Preset:</span>
                      <button
                        type="button"
                        onClick={() => setInstCaseRef('RB-2026-001084')}
                        className="text-[#003366] underline font-bold cursor-pointer"
                      >
                        RB-2026-001084
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-[12px] text-[#64748b]">
                    Only authorized institutional heads or liaison officers are permitted to file statutory clarifications.
                  </p>
                  <button
                    type="submit"
                    className="bg-[#003366] hover:bg-[#002244] text-white font-bold text-[13px] px-5 py-2 rounded-[3px] transition flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Search size={15} />
                    <span>Retrieve Inquiry File</span>
                  </button>
                </div>
              </form>

              {/* Error Banner */}
              {instLookupError && (
                <div className="mt-4 bg-[#fef2f2] border border-[#fecdd3] p-3 rounded-[3px] text-[13px] text-[#b91c1c] flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{instLookupError}</span>
                </div>
              )}
            </div>

            {/* Submission Success Receipt */}
            {instSubmitSuccess && (
              <div className="bg-white rounded-[3px] border-2 border-emerald-600 p-6 shadow-md space-y-4">
                <div className="flex items-center gap-3 text-emerald-700">
                  <CheckCircle2 size={32} className="shrink-0" />
                  <div>
                    <h3 className="text-[18px] font-black text-emerald-800">
                      Formal Institutional Explanation Received & Recorded
                    </h3>
                    <p className="text-[12px] text-emerald-600">
                      Acknowledgment Generated · Bureau Examination Proceeding Initiated
                    </p>
                  </div>
                </div>

                <div className="bg-[#f0fdf4] border border-emerald-200 rounded-[3px] p-4 text-[13px] space-y-2 font-mono">
                  <div className="flex justify-between border-b border-emerald-200 pb-2">
                    <span className="text-[#64748b]">Acknowledgment Receipt No:</span>
                    <strong className="text-[#003366]">{instSubmitSuccess.ack_number}</strong>
                  </div>
                  <div className="flex justify-between border-b border-emerald-200 pb-2">
                    <span className="text-[#64748b]">Institution Name:</span>
                    <strong>{instSubmitSuccess.institution_name}</strong>
                  </div>
                  <div className="flex justify-between border-b border-emerald-200 pb-2">
                    <span className="text-[#64748b]">Grievance Case Reference:</span>
                    <strong className="text-[#003366]">#{instSubmitSuccess.case_id}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Submission Timestamp:</span>
                    <span>{new Date(instSubmitSuccess.timestamp).toLocaleString('en-IN')} IST</span>
                  </div>
                </div>

                <div className="text-[12px] text-[#475569] leading-relaxed">
                  Your formal response has been placed in the official AICTE Case Dossier and dispatched to the assigned Bureau Case Officer. The case state has been advanced to <strong>Active Regulatory Review</strong>.
                </div>
              </div>
            )}

            {/* Active Inquiry File Found & Response Form */}
            {instLookupResult && (
              <div className="bg-white rounded-[3px] border border-[#cbd5e1] p-6 shadow-sm space-y-5">
                {/* Inquiry Overview Card */}
                <div className="rounded-[3px] bg-[#f8fafc] border border-[#cbd5e1] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e8f0] pb-2">
                    <div>
                      <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                        Active Statutory Inquiry
                      </span>
                      <h4 className="text-[16px] font-black text-[#003366]">
                        {instLookupResult.institution.institution_name}
                      </h4>
                    </div>
                    <span className="bg-[#003366] text-white text-[12px] font-mono font-bold px-2.5 py-1 rounded">
                      CASE #{instLookupResult.case.case_id}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 text-[12px]">
                    <div>
                      <span className="text-[#64748b] block">Jurisdiction Bureau:</span>
                      <strong className="text-[#003366]">{instLookupResult.bureau?.name} ({instLookupResult.bureau?.code})</strong>
                    </div>
                    <div>
                      <span className="text-[#64748b] block">Complaint Category:</span>
                      <strong className="text-[#1e293b]">{instLookupResult.case.complaint_category}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748b] block">Current Verification Status:</span>
                      <span className="inline-block bg-[#fef3c7] text-[#92400e] px-2 py-0.5 rounded font-bold text-[11px]">
                        {instLookupResult.case.verification_status.replaceAll('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded border border-[#e2e8f0]">
                    <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wide block mb-1">
                      Alleged Grievance Matter on Record:
                    </span>
                    <p className="font-bold text-[#003366] text-[13px]">{instLookupResult.case.subject}</p>
                    <p className="text-[12px] text-[#475569] mt-1 italic">
                      "{instLookupResult.case.description}"
                    </p>
                  </div>
                </div>

                {/* Response Submission Form */}
                <form onSubmit={handleInstitutionSubmit} className="space-y-4">
                  <h3 className="font-bold text-[15px] text-[#003366] border-b border-[#e2e8f0] pb-2">
                    Furnish Institutional Explanation & Supporting Records
                  </h3>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-bold text-[#003366] uppercase mb-1">
                        Respondent Officer Full Name *
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-[13px] border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#003366]"
                        placeholder="e.g. Dr. K. S. Rajan"
                        value={respondentName}
                        onChange={(e) => setRespondentName(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-[#003366] uppercase mb-1">
                        Official Designation *
                      </label>
                      <select
                        className="w-full px-3 py-2 text-[13px] border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#003366] bg-white font-semibold"
                        value={respondentDesignation}
                        onChange={(e) => setRespondentDesignation(e.target.value)}
                      >
                        <option value="Principal">Principal</option>
                        <option value="Director">Director</option>
                        <option value="Dean (Academic Affairs)">Dean (Academic Affairs)</option>
                        <option value="Registrar">Registrar</option>
                        <option value="Authorized Legal Counsel">Authorized Legal Counsel</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-[#003366] uppercase mb-1">
                        Official Institutional Email *
                      </label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 text-[13px] border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#003366]"
                        value={respondentEmail}
                        onChange={(e) => setRespondentEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-[#003366] uppercase mb-1">
                        Contact Phone Number *
                      </label>
                      <input
                        type="tel"
                        className="w-full px-3 py-2 text-[13px] border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#003366]"
                        value={respondentPhone}
                        onChange={(e) => setRespondentPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[#003366] uppercase mb-1">
                      Comprehensive Written Explanation / Action Taken Report (ATR) *
                    </label>
                    <textarea
                      rows={5}
                      className="w-full px-3 py-2 text-[13px] border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#003366] leading-relaxed"
                      placeholder="Detail the factual background, institution's explanation against the allegations, relevant Approval Process Handbook clauses, resolution passed by governing body, or redressal provided to complainant..."
                      value={instExplanation}
                      onChange={(e) => setInstExplanation(e.target.value)}
                      required
                    />
                  </div>

                  {/* Supporting Evidence Documents */}
                  <div>
                    <label className="block text-[12px] font-bold text-[#003366] uppercase mb-1">
                      Attach Official Supporting Evidence / Resolutions
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {instDocs.map((doc, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#f1f5f9] border border-[#cbd5e1] text-[12px] text-[#003366] font-semibold"
                        >
                          <FileText size={13} />
                          <span>{doc.name}</span>
                          <button
                            type="button"
                            onClick={() => setInstDocs(instDocs.filter((_, i) => i !== idx))}
                            className="text-[#94a3b8] hover:text-[#b91c1c] ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          const mockFiles = [
                            'Fee_Regulatory_Committee_Order_2026.pdf',
                            'Governing_Council_Resolution_Oct2026.pdf',
                            'Student_Receipt_Ledger_Extract.pdf',
                            'Institutional_Circular_Refunds.pdf',
                          ]
                          const randomFile = mockFiles[instDocs.length % mockFiles.length]
                          setInstDocs([...instDocs, { name: randomFile, type: 'Evidence' }])
                        }}
                        className="text-[12px] flex items-center gap-1.5"
                      >
                        <Upload size={14} />
                        <span>Upload Authenticated PDF Evidence</span>
                      </Button>
                      <span className="text-[11px] text-[#64748b]">
                        PDF, DOCX formats supported up to 10 MB per file.
                      </span>
                    </div>
                  </div>

                  {/* Statutory Certification */}
                  <div className="bg-[#fffbeb] border border-[#fef08a] p-3 rounded-[3px]">
                    <label className="flex items-start gap-2.5 cursor-pointer text-[12px] text-[#854d0e]">
                      <input
                        type="checkbox"
                        checked={instCertified}
                        onChange={(e) => setInstCertified(e.target.checked)}
                        className="mt-0.5 rounded text-[#003366]"
                      />
                      <span className="leading-relaxed">
                        <strong>Statutory Institutional Certification:</strong> I solemnly affirm that the facts and records furnished above are true and authenticated extracts from official institutional registers. I am aware that submitting misleading or fraudulent information to AICTE constitutes a violation of the AICTE Approval Process Regulations.
                      </span>
                    </label>
                  </div>

                  {instSubmitError && (
                    <div className="bg-[#fef2f2] border border-[#fecdd3] p-3 rounded-[3px] text-[13px] text-[#b91c1c] flex items-center gap-2">
                      <AlertTriangle size={16} />
                      <span>{instSubmitError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setInstLookupResult(null)}
                    >
                      Cancel
                    </Button>
                    <button
                      type="submit"
                      className="bg-[#003366] hover:bg-[#002244] text-white font-bold text-[13px] px-6 py-2.5 rounded-[3px] transition flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Send size={15} />
                      <span>Submit Official Explanation to AICTE</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 5. Official Government Footer */}
      <footer className="bg-[#002244] text-white/80 border-t-4 border-[#ff9933] text-[12px] mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-6 mb-6">
            <div>
              <p className="font-bold text-white text-[13px] mb-2 uppercase tracking-wide">
                AICTE Head Office
              </p>
              <p className="text-[12px] text-white/70 leading-relaxed">
                Nelson Mandela Marg, Vasant Kunj,<br />
                New Delhi - 110070<br />
                Toll Free: 1800-11-2026<br />
                Phone: 011-26131576-78
              </p>
            </div>
            <div>
              <p className="font-bold text-white text-[13px] mb-2 uppercase tracking-wide">
                Bureaus / Cells
              </p>
              <ul className="space-y-1 text-white/70 text-[12px]">
                <li>• Regulation Bureau (RB)</li>
                <li>• Public Grievance Redressal Cell (PGRC)</li>
                <li>• Approval Bureau</li>
                <li>• Regional Offices & Centers</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-white text-[13px] mb-2 uppercase tracking-wide">
                Citizen Support
              </p>
              <ul className="space-y-1 text-white/70 text-[12px]">
                <li>• Dual 5-Minute OTP Verification</li>
                <li>• Automated Permanent ID Institution Mapping</li>
                <li>• AI-Assisted Bureau Routing</li>
                <li>• Real-Time Case Stage Tracking</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-white text-[13px] mb-2 uppercase tracking-wide">
                Administrative Access
              </p>
              <p className="text-[12px] text-white/70 leading-relaxed mb-2">
                Restricted to authorized AICTE Bureau Heads, Case Officers, and Headquarters management.
              </p>
              <Link
                to="/login"
                className="inline-block bg-[#ff9933] text-[#002244] font-bold px-3 py-1.5 rounded text-[11px] uppercase tracking-wide"
              >
                Official Sign In →
              </Link>
            </div>
          </div>

          <div className="border-t border-white/20 pt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-white/60">
            <p>© 2026 All India Council for Technical Education (AICTE). All Rights Reserved.</p>
            <p>Designed for AICTE Internal Administration & Public Redressal · Government of India</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
