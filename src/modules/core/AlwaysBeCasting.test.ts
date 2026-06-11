import { describe, expect, it } from 'vitest'
import { WAR } from '../../data/jobs/war/index.js'
import { buildJobData } from '../../data/resolve.js'
import type { AnalysisContext } from '../../parser/analyser.js'
import type { GameEvent } from '../../fflogs/types.js'
import { AlwaysBeCasting } from './AlwaysBeCasting.js'

const ACTOR = 1
const gcd = (t: number): GameEvent => ({ type: 'cast', timestamp: t, sourceId: ACTOR, actionId: 31 }) // Heavy Swing (GCD)

const ctx = (fightEnd: number, downtime: AnalysisContext['downtime'] = []): AnalysisContext => ({
	actorId: ACTOR, job: 'WAR', syncedLevel: 70, data: buildJobData(WAR, 70), fightStart: 0, fightEnd, downtime,
})

function run(c: AnalysisContext, events: GameEvent[]) {
	const a = new AlwaysBeCasting(c)
	for (const e of events) a.onEvent(e)
	return a.output()
}

describe('AlwaysBeCasting', () => {
	it('reports full uptime when GCDs are back-to-back', () => {
		const casts = [0, 2500, 5000, 7500, 10000, 12500].map(gcd)
		const out = run(ctx(15_000), casts)
		expect(out[0]!.category).toBe('strong')
		expect(out[0]!.metric).toBe('100,0%')
	})

	it('counts a long gap between GCDs as dead time', () => {
		// casts 0,2.5,5, then a 10s gap to 15, 17.5 → dead [7.5s, 15s] = 7.5s of 20s
		const out = run(ctx(20_000), [0, 2500, 5000, 15_000, 17_500].map(gcd))
		expect(out[0]!.category).toBe('big')
		expect(out[0]!.metric).toBe('62,5%')
	})

	it('does not count dead time that falls in downtime', () => {
		const out = run(ctx(20_000, [{ startMs: 7500, endMs: 15_000 }]), [0, 2500, 5000, 15_000, 17_500].map(gcd))
		expect(out[0]!.metric).toBe('100,0%')
		expect(out[0]!.category).toBe('strong')
	})
})
