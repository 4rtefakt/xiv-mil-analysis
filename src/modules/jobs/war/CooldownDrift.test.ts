import { describe, expect, it } from 'vitest'
import { WAR } from '../../../data/jobs/war/index.js'
import { buildJobData } from '../../../data/resolve.js'
import type { AnalysisContext } from '../../../parser/analyser.js'
import type { GameEvent } from '../../../fflogs/types.js'
import { CooldownDrift } from './CooldownDrift.js'

const ACTOR = 1
const cast = (actionId: number, t: number): GameEvent => ({ type: 'cast', timestamp: t, sourceId: ACTOR, actionId })

function ctx(level: number, fightEnd: number): AnalysisContext {
	return { actorId: ACTOR, job: 'WAR', syncedLevel: level, data: buildJobData(WAR, level), fightStart: 0, fightEnd, downtime: [] }
}

function run(c: AnalysisContext, events: GameEvent[]) {
	const a = new CooldownDrift(c)
	for (const e of events) a.onEvent(e)
	return a.output()
}

// Upheaval (7387): 30s recast, 1 charge at every supported level.
describe('CooldownDrift', () => {
	it('does not penalise the opener and measures held time between casts', () => {
		const c = ctx(70, 300_000)
		// casts at 0s, 30s (on cd), 70s (held 10s past the 60s ready), 100s (on cd)
		const out = run(c, [cast(7387, 0), cast(7387, 30_000), cast(7387, 70_000), cast(7387, 100_000)])
		expect(out).toHaveLength(1)
		const row = (out[0]!.detail as { rows: { spellId: number; recastMs: number; casts: { driftMs: number }[] }[] }).rows.find((r) => r.spellId === 7387)!
		expect(row.recastMs).toBe(30_000) // level-resolved cooldown
		expect(row.casts[0]!.driftMs).toBe(0) // opener
		expect(row.casts[1]!.driftMs).toBe(0) // exactly on cooldown
		expect(row.casts[2]!.driftMs).toBe(10_000) // held 10s
		expect(out[0]!.metric).toBe('+10s')
		expect(out[0]!.category).toBe('small')
	})

	it('says nothing when no tracked cooldown was used', () => {
		expect(run(ctx(70, 300_000), [cast(31, 0)])).toHaveLength(0)
	})
})
