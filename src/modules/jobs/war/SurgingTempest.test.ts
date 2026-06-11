import { describe, expect, it } from 'vitest'
import { WAR } from '../../../data/jobs/war/index.js'
import { buildJobData } from '../../../data/resolve.js'
import type { AnalysisContext } from '../../../parser/analyser.js'
import type { GameEvent } from '../../../fflogs/types.js'
import { SurgingTempest } from './SurgingTempest.js'

const ACTOR = 1
const ST = 2677

function ctx(level: number, fightEnd: number, downtime: Array<{ startMs: number; endMs: number }> = []): AnalysisContext {
	return {
		actorId: ACTOR,
		job: 'WAR',
		syncedLevel: level,
		data: buildJobData(WAR, level),
		fightStart: 0,
		fightEnd,
		downtime,
	}
}

function run(c: AnalysisContext, events: GameEvent[]) {
	const a = new SurgingTempest(c)
	for (const e of events) a.onEvent(e)
	return a.output()
}

const apply = (t: number, target = ACTOR): GameEvent => ({ type: 'applybuff', timestamp: t, sourceId: ACTOR, targetId: target, statusId: ST })
const remove = (t: number, target = ACTOR): GameEvent => ({ type: 'removebuff', timestamp: t, sourceId: ACTOR, targetId: target, statusId: ST })

describe('SurgingTempest uptime', () => {
	it('reports a strength when the buff is up almost all fight', () => {
		const c = ctx(90, 100_000)
		const out = run(c, [apply(0)]) // up from pull, still open at end → 100%
		expect(out).toHaveLength(1)
		expect(out[0]!.category).toBe('strong')
		expect(out[0]!.metric).toBe('100,0%')
	})

	it('flags a big gap as a big gain', () => {
		const c = ctx(90, 100_000)
		// up 0–80s only → 80% uptime → big gain
		const out = run(c, [apply(0), remove(80_000)])
		expect(out[0]!.category).toBe('big')
		expect(out[0]!.metric).toBe('80,0%')
	})

	it('treats a removebuff with no prior apply as up-since-pull', () => {
		const c = ctx(90, 100_000)
		const out = run(c, [remove(95_000)]) // up 0–95s → 95% → small gain
		expect(out[0]!.category).toBe('small')
	})

	it('ignores buffs on other actors', () => {
		const c = ctx(90, 100_000)
		const out = run(c, [apply(0, 2), remove(50_000, 2)])
		expect(out).toHaveLength(0) // no events for our actor → nothing to report
	})

	it('does not penalise buff drops that happen during downtime', () => {
		// fight 0–100s, boss untargetable 40–60s; buff up 0–40, down 40–60, up 60–end
		const c = ctx(90, 100_000, [{ startMs: 40_000, endMs: 60_000 }])
		const out = run(c, [remove(40_000), apply(60_000)])
		expect(out[0]!.metric).toBe('100,0%') // the only "down" was downtime → 100% active uptime
		expect(out[0]!.category).toBe('strong')
	})

	it('says nothing when the buff is unavailable at the synced level', () => {
		const c = ctx(40, 100_000) // below level 50
		const out = run(c, [apply(0), remove(50_000)])
		expect(out).toHaveLength(0)
	})
})
