import type { Env } from "./index"

interface FlagRow {
  key: string
  enabled: number
  org_ids: string | null
}

/**
 * Flag state for this request.
 *
 * Three rules, and the order matters:
 *  1. A row's `enabled` is the global state.
 *  2. `org_ids` is a pilot ALLOW list: it can turn a flag on for those
 *     organisations, and never off for anybody. An allow list that can also
 *     deny is two features sharing one name, and nobody remembers which.
 *  3. FLAGS_FORCED_OFF is the emergency brake and outranks the table, so a
 *     kill switch still works if the table is wrong or being edited.
 *
 * A flag decides whether a capability is OFFERED. It must never be the thing
 * deciding whether a caller MAY use it -- every flagged endpoint keeps its own
 * permission check.
 */
export async function resolveFlags(env: Env, orgId?: number): Promise<Record<string, boolean>> {
  const { results } = await env.DB
    .prepare("SELECT key, enabled, org_ids FROM flag")
    .all<FlagRow>()

  const out: Record<string, boolean> = {}
  for (const row of results) {
    let orgs: number[] = []
    if (row.org_ids) {
      try {
        orgs = JSON.parse(row.org_ids)
      } catch {
        // A malformed pilot list must not turn a flag on for everyone.
        console.error(`flag ${row.key}: org_ids is not valid JSON`)
      }
    }
    out[row.key] = orgId != null && orgs.includes(orgId) ? true : row.enabled === 1
  }

  for (const key of (env.FLAGS_FORCED_OFF ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    out[key] = false
  }
  return out
}
