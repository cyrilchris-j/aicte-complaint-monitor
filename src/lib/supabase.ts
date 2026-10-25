import { createClient } from '@supabase/supabase-js'

const env = (typeof import.meta !== 'undefined' && import.meta.env) || (typeof globalThis !== 'undefined' && (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env) || {}
const url = env.VITE_SUPABASE_URL as string | undefined
const anon = env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseEnabled = Boolean(url && anon)

export const supabase = supabaseEnabled && url && anon ? createClient(url, anon) : null
