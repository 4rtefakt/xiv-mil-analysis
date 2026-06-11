import { describe, expect, it } from 'vitest'
import { WAR } from '../../../data/jobs/war/index.js'
import { buildJobData } from '../../../data/resolve.js'
import type { AnalysisContext } from '../../../parser/analyser.js'
import type { GameEvent } from '../../../fflogs/types.js'
import { BeastGauge } from './BeastGauge.js'

const ACTOR = 1
const cast = (actionId: number, t: number): GameEvent => ({ type: 'cast', timestamp: t, sourceId: ACTOR, actionId })
const buff = (type: 'applybuff' | 'removebuff', statusId: number, t: number): GameEvent => ({ type, timestamp: t, sourceId: ACTOR, targetId: ACTOR, statusId })

const ctx = (): AnalysisContext => ({ actorId: ACTOR, job: 'WAR', syncedLevel: 70, data: buildJobData(WAR, 70), fightStart: 0, fightEnd: 300_000, downtime: [] })

function run(events: GameEvent[]) {
	const a = new BeastGauge(ctx())
	for (const e of events) a.onEvent(e)
	return a.output()
}

// Infuriate (52) +50, Storm's Path (42) +20, Fell Cleave (3549) -50.
describe('BeastGauge', () => {
	it('detects overcap (gauge generated while full)', () => {
		const out = run([cast(52, 0), cast(42, 1000), cast(42, 2000), cast(42, 3000)]) // 50,70,90,→110 clamp
		const detail = out[0]!.detail as { overflows: { lost: number }[] }
		expect(detail.overflows).toHaveLength(1)
		expect(detail.overflows[0]!.lost).toBe(10)
		expect(out[0]!.metric).toBe('10')
	})

	it('treats Fell Cleave under Inner Release as free (no spend)', () => {
		// fill to 100, enter Inner Release, Fell Cleave (free), then generate → overflow
		const withIR = run([cast(52, 0), cast(52, 1000), buff('applybuff', 1177, 1500), cast(3549, 2000), cast(42, 3000)])
		const withoutIR = run([cast(52, 0), cast(52, 1000), cast(3549, 2000), cast(42, 3000)])
		const lost = (out: typeof withIR) => (out[0]!.detail as { overflows: { lost: number }[] }).overflows.reduce((s, o) => s + o.lost, 0)
		expect(lost(withIR)).toBe(20) // Fell Cleave free → gauge stayed 100, +20 wasted
		expect(lost(withoutIR)).toBe(0) // Fell Cleave spent → no overcap
	})
})
