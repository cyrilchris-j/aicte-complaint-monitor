import { useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createCase, createInstitution, expectedDisposal, getSnapshot, subscribe } from '../demo/store'
import { CATEGORIES, COMPLAINANT_TYPES, PRIORITIES, type Category, type ComplainantType, type Priority } from '../types'
import { Button, Field, PageHeader, inputClass } from '../components/ui'
import { suggestCategory } from '../lib/overlap'
import { nowIso } from '../lib/utils'
import { Building2, Plus } from 'lucide-react'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Delhi', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu',
  'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Other',
]

const AICTE_REGIONS = [
  'Central', 'Eastern', 'Northern', 'North-West', 'South-Central', 'Southern', 'South-West', 'Western',
]

export function NewComplaintPage() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [institutionId, setInstitutionId] = useState(snapshot.institutions[0]?.id ?? '')
  const [bureauId, setBureauId] = useState(profile?.bureau_id ?? snapshot.bureaus[1]?.id ?? snapshot.bureaus[0]?.id ?? '')
  const [category, setCategory] = useState<Category>('Fees')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('HIGH')
  const [complainantType, setComplainantType] = useState<ComplainantType>('Student')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Quick add institution state
  const [showAddInst, setShowAddInst] = useState(false)
  const [newInstName, setNewInstName] = useState('')
  const [newInstPermId, setNewInstPermId] = useState('')
  const [newInstCity, setNewInstCity] = useState('')
  const [newInstState, setNewInstState] = useState('Tamil Nadu')
  const [newInstRegion, setNewInstRegion] = useState('Southern')

  if (!profile) return null

  const textForSuggestion = `${subject} ${description}`.trim()
  const suggestion = textForSuggestion ? suggestCategory(textForSuggestion) : null

  const handleQuickAddInst = () => {
    if (!newInstName.trim() || !newInstPermId.trim() || !newInstCity.trim()) return
    const inst = createInstitution(
      {
        institution_name: newInstName,
        aicte_permanent_id: newInstPermId,
        city: newInstCity,
        state: newInstState,
        region: newInstRegion,
      },
      profile,
    )
    setInstitutionId(inst.id)
    setShowAddInst(false)
    setNewInstName('')
    setNewInstPermId('')
    setNewInstCity('')
  }

  return (
    <div>
      <PageHeader
        title="Register complaint case"
        subtitle="Creating a case indexes the grievance across AICTE Bureaus and searches for cross-bureau overlap. Official human determination required."
      />
      <form
        className="max-w-3xl space-y-3.5 rounded-sm border border-line bg-white p-5 app-shadow"
        onSubmit={(e) => {
          e.preventDefault()
          const currentInstId = institutionId || snapshot.institutions[0]?.id
          if (!currentInstId) {
            setError('Please register or select an institution first.')
            return
          }
          if (!subject.trim() || !description.trim()) {
            setError('Subject and description are required.')
            return
          }
          const received = nowIso()
          const c = createCase(
            {
              institution_id: currentInstId,
              bureau_id: bureauId || snapshot.bureaus[0]?.id,
              assigned_officer_id: profile.role === 'CASE_OFFICER' ? profile.id : null,
              complainant_type: complainantType,
              complainant_name: name.trim() || 'Confidential Complainant',
              complainant_reference: `REF-${Date.now()}`,
              complaint_category: category,
              subject: subject.trim(),
              description: description.trim(),
              priority,
              status: 'NEW',
              received_date: received,
              expected_disposal_date: expectedDisposal(category, priority, received),
              source: 'AICTE Case Intake',
              verification_status: 'UNVERIFIED',
              mobile_verified: false,
              documents_received: false,
              institution_response_received: false,
            },
            profile,
          )
          nav(`/complaints/${c.id}`)
        }}
      >
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[12px] font-bold uppercase tracking-wider text-[#003366]">Institution</label>
            <button
              type="button"
              onClick={() => setShowAddInst(!showAddInst)}
              className="text-[12px] font-semibold text-brand hover:underline flex items-center gap-1"
            >
              <Plus size={14} />
              <span>{showAddInst ? 'Cancel' : 'Register New Institution'}</span>
            </button>
          </div>

          {showAddInst ? (
            <div className="p-3 mb-3 bg-[#f0f4f8] border border-[#cbd5e1] rounded space-y-2">
              <p className="font-bold text-[13px] text-[#003366] flex items-center gap-1.5">
                <Building2 size={16} /> Quick Add Institution
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  className={inputClass}
                  placeholder="AICTE Permanent ID (e.g., 1-10023)"
                  value={newInstPermId}
                  onChange={(e) => setNewInstPermId(e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="Institution Name"
                  value={newInstName}
                  onChange={(e) => setNewInstName(e.target.value)}
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-2">
                <input
                  className={inputClass}
                  placeholder="City"
                  value={newInstCity}
                  onChange={(e) => setNewInstCity(e.target.value)}
                />
                <select className={inputClass} value={newInstState} onChange={(e) => setNewInstState(e.target.value)}>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className={inputClass} value={newInstRegion} onChange={(e) => setNewInstRegion(e.target.value)}>
                  {AICTE_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <Button type="button" onClick={handleQuickAddInst} className="text-[12px] py-1">
                Save & Select Institution
              </Button>
            </div>
          ) : (
            <select
              className={inputClass}
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
            >
              {snapshot.institutions.length === 0 ? (
                <option value="">No institutions registered — Click &quot;Register New Institution&quot; above</option>
              ) : (
                snapshot.institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.institution_name} ({i.aicte_permanent_id}) — {i.city}, {i.state}
                  </option>
                ))
              )}
            </select>
          )}
        </div>

        <Field label="Receiving Bureau / Cell">
          <select className={inputClass} value={bureauId} onChange={(e) => setBureauId(e.target.value)}>
            {snapshot.bureaus.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Complaint Category">
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>

        {suggestion && (
          <p className="text-[12px] text-muted">
            AI-assisted category suggestion: <strong>{suggestion.category}</strong> ({Math.round(suggestion.confidence * 100)}% lexical confidence) — officer decision required.{' '}
            <button type="button" className="text-brand font-semibold hover:underline" onClick={() => setCategory(suggestion.category)}>
              Apply suggestion
            </button>
          </p>
        )}

        <Field label="Complaint Subject">
          <input
            className={inputClass}
            placeholder="Brief summary of the complaint..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </Field>

        <Field label="Detailed Grievance Description">
          <textarea
            className={inputClass}
            rows={5}
            placeholder="Detailed narrative of the representation or grievance received..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Complainant type">
            <select className={inputClass} value={complainantType} onChange={(e) => setComplainantType(e.target.value as ComplainantType)}>
              {COMPLAINANT_TYPES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Complainant Name (Confidential / Internal)">
            <input
              className={inputClass}
              placeholder="e.g., Student Representative / Confidential"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </div>

        {error ? <p className="text-[13px] text-danger font-semibold">{error}</p> : null}
        <Button type="submit">Register case and run overlap search</Button>
      </form>
    </div>
  )
}
