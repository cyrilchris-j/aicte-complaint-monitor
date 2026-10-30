import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowLeft,
  X,
  Layers,
  MessageSquare,
  ShieldAlert,
  History,
  Building,
} from 'lucide-react'
import { AicteLogo } from './AicteBrand'

interface SihDemoModalProps {
  isOpen: boolean
  onClose: () => void
}

const STEPS = [
  {
    step: 1,
    title: 'The Challenge: Fragmented Bureau Inquiries',
    icon: Building,
    summary:
      'Students and parents file separate complaints across different AICTE cells regarding the same institution: ABC College of Engineering & Technology.',
    details:
      'PGRC receives a parent grievance (PGRC-2026-00883) while Regulation Bureau is simultaneously examining a student council petition (RB-2026-001084) regarding unauthorized special examination fees of Rs. 14,500.',
    actionLabel: 'Inspect Active Grievances',
    targetRoute: '/complaints',
    highlightKey: 'Complaints',
  },
  {
    step: 2,
    title: 'AI Hybrid Overlap & Similarity Detection',
    icon: Layers,
    summary:
      'AICTE CaseSync vector engine detects semantic similarity + institutional Permanent ID match across Bureaus.',
    details:
      'Flags a 91% Potential Cross-Bureau Overlap (Institution match: 40%, Semantic vector similarity: 35%, Category: 15%, Temporal proximity: 10%). Explainable AI details exactly why the case was flagged without black-box automation.',
    actionLabel: 'Open Overlap & Coordination Center',
    targetRoute: '/overlap',
    highlightKey: 'Overlap',
  },
  {
    step: 3,
    title: 'Bilateral Cross-Bureau Coordination',
    icon: MessageSquare,
    summary:
      'Regulation Bureau and PGRC collaborate in real-time instead of conducting duplicate investigations.',
    details:
      'Officers link the files without destroying case integrity. Bureau heads exchange bilateral messages to ensure the college cannot furnish contradictory explanations to separate offices.',
    actionLabel: 'View Inter-Bureau Coordination',
    targetRoute: '/overlap',
    highlightKey: 'Coordination',
  },
  {
    step: 4,
    title: 'Statutory Show Cause Notice Studio',
    icon: ShieldAlert,
    summary:
      'Officer generates an official, printable AICTE Show Cause Notice on formal Government of India letterhead.',
    details:
      'With one click, Case Officer generates a formal directive citing Approval Process Handbook Section 10 with a mandatory 7-day response deadline and official reference number.',
    actionLabel: 'Open Case File & Notice Studio',
    targetRoute: '/complaints/case-001',
    highlightKey: 'CaseDetail',
  },
  {
    step: 5,
    title: 'Institutional Response & Immutable Audit Trail',
    icon: History,
    summary:
      'Institution submits formal reply via the Public Desk, and every transition is logged into the WORM audit trail.',
    details:
      'College uploads authenticated justification and registers. Case moves to Active Review. Every click, transfer, notice, and note is permanently recorded in the SHA-256 verified audit log.',
    actionLabel: 'Explore Statutory Audit Trail',
    targetRoute: '/audit',
    highlightKey: 'Audit',
  },
]

export function SihDemoModal({ isOpen, onClose }: SihDemoModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isMinimized, setIsMinimized] = useState(false)
  const navigate = useNavigate()

  if (!isOpen) return null

  const active = STEPS[currentStepIndex]
  const Icon = active.icon

  const handleExecuteAction = () => {
    navigate(active.targetRoute)
    setIsMinimized(true)
  }

  // Minimized Floating Pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-[#003366] text-white p-2.5 rounded-[4px] shadow-2xl border-2 border-[#ff9933] animate-in fade-in duration-200">
        <div className="flex items-center gap-2">
          <span className="bg-[#ff9933] text-[#002244] font-black text-[11px] px-2 py-0.5 rounded font-mono">
            Step {active.step}/5
          </span>
          <span className="text-[12px] font-bold text-white max-w-[200px] truncate">
            {active.title}
          </span>
        </div>
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold px-2 py-1 rounded transition cursor-pointer"
        >
          Expand Tour
        </button>
        <button
          onClick={() => {
            if (currentStepIndex < STEPS.length - 1) {
              const nextIndex = currentStepIndex + 1
              setCurrentStepIndex(nextIndex)
              navigate(STEPS[nextIndex].targetRoute)
            } else {
              onClose()
            }
          }}
          className="bg-[#ff9933] hover:bg-[#e68a00] text-[#002244] text-[11px] font-black px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1"
        >
          <span>{currentStepIndex === STEPS.length - 1 ? 'Finish' : 'Next Step →'}</span>
        </button>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white p-1 rounded transition"
          aria-label="Close Tour"
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  // Full Presentation Modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-[4px] border border-[#cbd5e1] shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#003366] text-white px-5 py-3.5 flex items-center justify-between border-b-4 border-[#ff9933]">
          <div className="flex items-center gap-2.5">
            <AicteLogo size={32} />
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#ff9933] text-[#002244] font-black text-[10px] px-1.5 py-0.2 rounded uppercase">
                  SIH 2026 Presentation Tour
                </span>
                <span className="text-[11px] text-[#ffd580] font-bold">
                  Step {active.step} of 5
                </span>
              </div>
              <h3 className="font-bold text-[15px] text-white leading-tight mt-0.5">
                AICTE CaseSync Problem Statement Walkthrough
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-5 border-b border-[#cbd5e1] bg-[#f8fafc]">
          {STEPS.map((s, idx) => {
            const isPassed = idx < currentStepIndex
            const isCurrent = idx === currentStepIndex
            return (
              <button
                key={s.step}
                onClick={() => setCurrentStepIndex(idx)}
                className={`py-2 text-center text-[11px] font-bold border-r border-[#cbd5e1] last:border-r-0 transition cursor-pointer ${
                  isCurrent
                    ? 'bg-[#003366] text-[#ffd580]'
                    : isPassed
                    ? 'bg-[#eef4fa] text-[#003366]'
                    : 'text-[#94a3b8] hover:bg-[#f1f5f9]'
                }`}
              >
                <span>Step {s.step}</span>
              </button>
            )
          })}
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-[3px] bg-[#eef4fa] border border-[#cbd5e1] text-[#003366] flex items-center justify-center shrink-0">
              <Icon size={22} />
            </div>
            <div>
              <h4 className="text-[17px] font-bold text-[#003366] leading-tight">
                {active.title}
              </h4>
              <p className="text-[13px] font-semibold text-[#1e293b] mt-1 leading-snug">
                {active.summary}
              </p>
            </div>
          </div>

          <div className="rounded-[3px] bg-[#f8fafc] border border-[#cbd5e1] p-4 text-[13px] text-[#475569] leading-relaxed">
            {active.details}
          </div>

          {/* Canonical SIH Pair Reference Callout */}
          <div className="p-3 bg-[#fffbeb] border border-[#fef08a] rounded-[3px] text-[12px] text-[#854d0e] flex items-center justify-between">
            <span>
              <strong>Primary Demonstration Pair:</strong> ABC College of Engineering & Technology (#1-10023412) · RB-2026-001084 ↔ PGRC-2026-00883
            </span>
            <span className="font-mono font-bold bg-[#fef08a] px-2 py-0.5 rounded text-[11px]">
              91% Overlap
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="border-t border-[#cbd5e1] bg-[#f1f5f9] px-6 py-3.5 flex items-center justify-between">
          <button
            disabled={currentStepIndex === 0}
            onClick={() => setCurrentStepIndex((i) => Math.max(0, i - 1))}
            className="text-[12px] font-bold text-[#64748b] hover:text-[#003366] disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="text-[12px] font-bold text-[#003366] hover:underline px-2.5 py-1.5 cursor-pointer"
            >
              Minimize to Dock
            </button>

            <button
              onClick={handleExecuteAction}
              className="bg-[#003366] hover:bg-[#002244] text-white text-[13px] font-bold px-4 py-2 rounded-[3px] transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>{active.actionLabel}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
