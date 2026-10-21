import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PRODUCT_NAME } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { Button, Field, inputClass } from '../components/ui'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-canvas">
      <div className="flag-bar" />
      <div className="mx-auto max-w-md px-4 py-16">
        <p className="text-[12px] font-semibold tracking-wide text-brand uppercase">AICTE · {PRODUCT_NAME}</p>
        <h1 className="mt-2 font-display text-[28px] text-navy">Reset password</h1>
        <p className="mt-2 text-[14px] text-muted">
          Password reset is delivered through Supabase Auth when the project is connected. In Demo Data mode a reset message is recorded only.
        </p>
        <form
          className="mt-6 rounded-sm border border-line bg-white p-5 app-shadow"
          onSubmit={async (e) => {
            e.preventDefault()
            setError(null)
            if (supabase) {
              const { error: err } = await supabase.auth.resetPasswordForEmail(email)
              if (err) {
                setError(err.message)
                return
              }
            }
            setSent(true)
          }}
        >
          <Field label="Official email">
            <input className={inputClass} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error ? <p className="mt-2 text-[13px] text-danger">{error}</p> : null}
          {sent ? (
            <p className="mt-3 text-[13px] text-success">If the account exists, a reset instruction has been issued.</p>
          ) : (
            <Button type="submit" className="mt-4 w-full">
              Send reset link
            </Button>
          )}
        </form>
        <Link to="/login" className="mt-4 inline-block text-[13px] text-brand">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
