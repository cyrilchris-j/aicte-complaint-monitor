/**
 * SHA-256 Cryptographic Audit Chain for AICTE CaseSync
 * Implements a genuine hash-chained append-only audit log.
 * Each entry's hash is: SHA-256(prevHash + timestamp + userId + action + entityId + oldValue + newValue)
 * The genesis block has prevHash = '0000000000000000000000000000000000000000000000000000000000000000'
 */

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000'

export interface ChainedAuditEntry {
  id: string
  prevHash: string
  hash: string
  seq: number
  timestamp: string
  userId: string
  action: string
  entityType: string
  entityId: string
  oldValue: string | null
  newValue: string | null
  ipReference: string
}

/** Encode text to Uint8Array for WebCrypto */
function encode(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

/** Convert ArrayBuffer to hex string */
function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Compute SHA-256 hash for one audit entry.
 * Payload = prevHash|timestamp|userId|action|entityType|entityId|oldValue|newValue
 */
export async function hashEntry(
  prevHash: string,
  timestamp: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValue: string | null,
  newValue: string | null,
): Promise<string> {
  const payload = [prevHash, timestamp, userId, action, entityType, entityId, oldValue ?? '', newValue ?? ''].join('|')
  const buffer = await crypto.subtle.digest('SHA-256', encode(payload) as unknown as BufferSource)
  return bufToHex(buffer)
}

/**
 * Build a full chained audit log from raw audit entries (sorted by created_at asc).
 * Returns ChainedAuditEntry[] with prevHash and hash populated.
 */
export async function buildAuditChain(
  entries: {
    id: string
    created_at: string
    user_id: string
    action: string
    entity_type: string
    entity_id: string
    old_value: string | null
    new_value: string | null
    ip_reference?: string
  }[],
): Promise<ChainedAuditEntry[]> {
  const sorted = [...entries].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const chained: ChainedAuditEntry[] = []
  let prevHash = GENESIS_HASH

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]
    const hash = await hashEntry(
      prevHash,
      e.created_at,
      e.user_id,
      e.action,
      e.entity_type,
      e.entity_id,
      e.old_value,
      e.new_value,
    )
    chained.push({
      id: e.id,
      prevHash,
      hash,
      seq: i + 1,
      timestamp: e.created_at,
      userId: e.user_id,
      action: e.action,
      entityType: e.entity_type,
      entityId: e.entity_id,
      oldValue: e.old_value,
      newValue: e.new_value,
      ipReference: e.ip_reference ?? '10.20.0.12',
    })
    prevHash = hash
  }
  return chained
}

export interface ChainVerificationResult {
  valid: boolean
  totalEntries: number
  verifiedEntries: number
  firstBrokenSeq: number | null
  firstBrokenId: string | null
  finalHash: string
  verifiedAt: string
}

/**
 * Verify the integrity of a pre-built ChainedAuditEntry[].
 * Re-derives each hash from its inputs and checks that it matches the stored hash.
 */
export async function verifyAuditChain(
  chain: ChainedAuditEntry[],
): Promise<ChainVerificationResult> {
  const sorted = [...chain].sort((a, b) => a.seq - b.seq)
  let verified = 0
  let firstBrokenSeq: number | null = null
  let firstBrokenId: string | null = null

  for (const entry of sorted) {
    const expected = await hashEntry(
      entry.prevHash,
      entry.timestamp,
      entry.userId,
      entry.action,
      entry.entityType,
      entry.entityId,
      entry.oldValue,
      entry.newValue,
    )
    if (expected !== entry.hash) {
      if (firstBrokenSeq === null) {
        firstBrokenSeq = entry.seq
        firstBrokenId = entry.id
      }
    } else {
      verified++
    }
  }

  return {
    valid: firstBrokenSeq === null,
    totalEntries: sorted.length,
    verifiedEntries: verified,
    firstBrokenSeq,
    firstBrokenId,
    finalHash: sorted.at(-1)?.hash ?? GENESIS_HASH,
    verifiedAt: new Date().toISOString(),
  }
}

/**
 * Lightweight localStorage cache for chain snapshots.
 * Stores the pre-built chain so we don't re-hash on every render.
 */
const CHAIN_CACHE_KEY = 'aicte-audit-chain-v1'

export function saveChainCache(chain: ChainedAuditEntry[]): void {
  try {
    localStorage.setItem(CHAIN_CACHE_KEY, JSON.stringify(chain))
  } catch { /* quota */ }
}

export function loadChainCache(): ChainedAuditEntry[] | null {
  try {
    const raw = localStorage.getItem(CHAIN_CACHE_KEY)
    return raw ? (JSON.parse(raw) as ChainedAuditEntry[]) : null
  } catch {
    return null
  }
}

