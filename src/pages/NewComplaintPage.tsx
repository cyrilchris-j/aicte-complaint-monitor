import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createCase, expectedDisposal, getSnapshot } from '../demo/store'
import { CATEGORIES, COMPLAINANT_TYPES, PRIORITIES, type Category, type ComplainantType, type Priority } from '../types'
import { Button, Field, PageHeader, inputClass } from '../components/ui'
import { suggestCategory } from '../lib/overlap'
import { nowIso } from '../lib/utils'

export function NewComplaintPage() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const snapshot = getSnapshot()
  const [institutionId, setInstitutionId] = useState(snapshot.institutions[0]?.id ?? '')
  const [bureauId, setBureauId] = useState(profile?.bureau_id ?? snapshot.bureaus[1]?.id ?? '')
  const [category, setCategory] = useState<Category>('Fees')
  const [subject, setSubject] = useState('The institution is collecting additional fees from students beyond the stated fee structure.')
  const [description, setDescription] = useState(
    'The institution is collecting additional fees from students beyond the stated fee structure. This representation is filed for verification and coordination if a related file already exists.',
  )
  const [priority, setPriority] = useState<Priority>('HIGH')
  const [complainantType, setComplainantType] = useState<ComplainantType>('Student')
  const [name, setName] = useState('Confidential student')
  const [error, setError] = useState<string | null>(null)
  if (!profile) return null

  const suggestion = suggestCategory(`${subject} ${description}`)

  return (
    <div>
      <PageHeader title="Register complaint case" subtitle="Creating a case generates an embedding and searches existing files for overlap. AI never merges cases." />
      <form
        className="max-w-3xl space-y-3 rounded-sm border border-line bg-white p-5 app-shadow"
        onSubmit={(e) => {
          e.preventDefault()
          if (!institutionId || !subject.trim() || !description.trim()) {
            setError('Institution, subject and description are required.')
            return
          }
          const received = nowIso()
          const c = createCase(
            {
              institution_id: institutionId,
              bureau_id: bureauId,
              assigned_officer_id: profile.role === 'CASE_OFFICER' ? profile.id : null,
              complainant_type: complainantType,
              complainant_name: name,
              complainant_reference: `REF-${Date.now()}`,
              complaint_category: category,
              subject,
              description,
              priority,
              status: 'NEW',
              received_date: received,
              expected_disposal_date: expectedDisposal(category, priority, received),
              source: 'CaseSync intake',
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
        <Field label="Institution">
          <select className={inputClass} value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
            {snapshot.institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.institution_name} ({i.aicte_permanent_id})
              </option>
            ))}
          </select>
        </Field>
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
          <Field label="Category (demo classification)">
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
        <p className="text-[12px] text-muted">
          AI-assisted category suggestion: <strong>{suggestion.category}</strong> ({Math.round(suggestion.confidence * 100)}% lexical confidence) — officer decision required.{' '}
          <button type="button" className="text-brand font-semibold" onClick={() => setCategory(suggestion.category)}>
            Apply suggestion
          </button>
        </p>
        <Field label="Subject">
          <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea className={inputClass} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Complainant type">
            <select className={inputClass} value={complainantType} onChange={(e) => setComplainantType(e.target.value as ComplainantType)}>
              {COMPLAINANT_TYPES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Complainant name (not published)">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        {error ? <p className="text-[13px] text-danger">{error}</p> : null}
        <Button type="submit">Create case and run overlap search</Button>
      </form>
    </div>
  )
}
