import { resolveFlags } from "./flags"

export interface Env {
  DB: D1Database
  ENVIRONMENT: string
  FLAGS_FORCED_OFF?: string
  BUILD_SHA?: string
  BUNDLE_HASH?: string
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
  "access-control-allow-headers": "content-type",
}

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: CORS })

/**
 * The lab has no authentication. `?org=` stands in for the organisation of the
 * signed-in user, so that per-organisation feature flags and the permission
 * checks beside them are exercisable. Never do this in anything real: it lets
 * any caller claim any organisation.
 */
const orgOf = (url: URL) => {
  const n = Number(url.searchParams.get("org") ?? 1)
  return Number.isFinite(n) && n > 0 ? n : 1
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS })

    const url = new URL(req.url)
    const path = url.pathname.replace(/\/+$/, "") || "/"
    const orgId = orgOf(url)

    try {
      if (path === "/health") {
        return json({
          ok: true,
          env: env.ENVIRONMENT,
          build: env.BUILD_SHA ?? "local",
          bundle: env.BUNDLE_HASH ?? "local",
        })
      }

      if (path === "/config") {
        return json({
          env: env.ENVIRONMENT,
          build: env.BUILD_SHA ?? "local",
          bundle: env.BUNDLE_HASH ?? "local",
          flags: await resolveFlags(env, orgId),
        })
      }

      if (path === "/audits" && req.method === "GET") {
        const { results } = await env.DB
          .prepare("SELECT id, title, org_id FROM audit WHERE org_id = ?1 ORDER BY id")
          .bind(orgId)
          .all()
        return json(results)
      }

      const reqList = path.match(/^\/audits\/(\d+)\/requirements$/)
      if (reqList && req.method === "GET") {
        const auditId = Number(reqList[1])
        if (!(await auditBelongsToOrg(env, auditId, orgId))) return json({ error: "not found" }, 404)
        const { results } = await env.DB
          .prepare(
            "SELECT id, audit_id, clause, text, status, note FROM requirement " +
            "WHERE audit_id = ?1 ORDER BY id"
          )
          .bind(auditId)
          .all()
        return json(results)
      }

      const patch = path.match(/^\/requirements\/(\d+)$/)
      if (patch && req.method === "PATCH") {
        const id = Number(patch[1])
        const body = (await req.json()) as { status?: string; note?: string }
        if (body.status && !VALID_STATUS.has(body.status)) {
          return json({ error: `status must be one of ${[...VALID_STATUS].join(", ")}` }, 400)
        }
        if (!(await requirementBelongsToOrg(env, id, orgId))) return json({ error: "not found" }, 404)

        await env.DB
          .prepare(
            "UPDATE requirement SET status = COALESCE(?2, status), note = COALESCE(?3, note) " +
            "WHERE id = ?1"
          )
          .bind(id, body.status ?? null, body.note ?? null)
          .run()
        return json({ ok: true, id })
      }

      const csv = path.match(/^\/audits\/(\d+)\/export\.csv$/)
      if (csv && req.method === "GET") {
        const auditId = Number(csv[1])
        // Permission first, and independently of any flag.
        if (!(await auditBelongsToOrg(env, auditId, orgId))) return json({ error: "not found" }, 404)

        const { results } = await env.DB
          .prepare("SELECT clause, text, status, note FROM requirement WHERE audit_id = ?1 ORDER BY id")
          .bind(auditId)
          .all<{ clause: string; text: string; status: string; note: string | null }>()

        const esc = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`
        const body = ["clause,text,status,note"]
          .concat(results.map((r) => [r.clause, r.text, r.status, r.note].map(esc).join(",")))
          .join("\n")

        return new Response(body, {
          headers: {
            ...CORS,
            "content-type": "text/csv; charset=utf-8",
            "content-disposition": `attachment; filename="audit-${auditId}.csv"`,
          },
        })
      }

      return json({ error: "not found", path }, 404)
    } catch (err) {
      // Deliberately terse: the lab is public and error bodies are a classic
      // way to leak schema. The detail goes to the Worker log instead.
      console.error(err)
      return json({ error: "internal error" }, 500)
    }
  },
}

const VALID_STATUS = new Set(["unknown", "compliant", "non_compliant", "not_applicable"])

async function auditBelongsToOrg(env: Env, auditId: number, orgId: number): Promise<boolean> {
  const row = await env.DB
    .prepare("SELECT 1 AS ok FROM audit WHERE id = ?1 AND org_id = ?2")
    .bind(auditId, orgId)
    .first<{ ok: number }>()
  return !!row
}

async function requirementBelongsToOrg(env: Env, reqId: number, orgId: number): Promise<boolean> {
  const row = await env.DB
    .prepare(
      "SELECT 1 AS ok FROM requirement r JOIN audit a ON a.id = r.audit_id " +
      "WHERE r.id = ?1 AND a.org_id = ?2"
    )
    .bind(reqId, orgId)
    .first<{ ok: number }>()
  return !!row
}
