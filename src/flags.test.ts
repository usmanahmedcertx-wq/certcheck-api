import { describe, it, expect } from "vitest"
import { resolveFlags } from "./flags"

const envWith = (rows: unknown[], forcedOff = "") =>
  ({
    FLAGS_FORCED_OFF: forcedOff,
    DB: { prepare: () => ({ all: async () => ({ results: rows }) }) },
  }) as never

describe("resolveFlags", () => {
  it("reads the global state", async () => {
    const flags = await resolveFlags(envWith([{ key: "A", enabled: 1, org_ids: null }]), 1)
    expect(flags.A).toBe(true)
  })

  it("turns a flag on for a piloted organisation only", async () => {
    const rows = [{ key: "A", enabled: 0, org_ids: "[7]" }]
    expect((await resolveFlags(envWith(rows), 7)).A).toBe(true)
    expect((await resolveFlags(envWith(rows), 1)).A).toBe(false)
  })

  it("never lets a pilot list turn a flag off", async () => {
    const rows = [{ key: "A", enabled: 1, org_ids: "[7]" }]
    expect((await resolveFlags(envWith(rows), 1)).A).toBe(true)
  })

  it("lets the emergency brake outrank the table", async () => {
    const rows = [{ key: "A", enabled: 1, org_ids: "[7]" }]
    expect((await resolveFlags(envWith(rows, "A"), 7)).A).toBe(false)
  })

  it("does not turn a flag on when the pilot list is malformed", async () => {
    const rows = [{ key: "A", enabled: 0, org_ids: "not json" }]
    expect((await resolveFlags(envWith(rows), 1)).A).toBe(false)
  })
})
