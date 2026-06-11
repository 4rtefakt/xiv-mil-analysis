import { describe, expect, it } from 'vitest'
import { WAR } from '../../../data/jobs/war/index.js'
import { buildJobData } from '../../../data/resolve.js'
import type { AnalysisContext } from '../../../parser/analyser.js'
import type { GameEvent } from '../../../fflogs/types.js'
import { BurstWindow } from './BurstWindow.js'

const ACTOR = 1
const cast = (actionId: number, t: number): GameEvent => ({ type: 'cast', timestamp: t, sourceId: ACTOR, actionId })
const ir = (type: 'applybuff' | 'removebuff', t: number): GameEvent => ({ type, timestamp: t, sourceId: ACTOR, targetId: ACTOR, statusId: 1177 })

const ctx = (): AnalysisContext => ({ actorId: ACTOR, job: 'WAR', syncedLevel: 70, data: buildJobData(WAR, 70), fightStart: 0, fightEnd: 300_000, downtime: [] })

function run(events: GameEvent[]) {
	const a = new BurstWindow(ctx())
	for (const e of events) a.onEvent(e)
	return a.output()
}

// 3549 Fell Cleave, 7387 Upheaval
describe('BurstWindow', () => {
	it('marks a window optimal with 3 Fell Cleaves + Upheaval', () => {
		const out = run([ir('applybuff', 0), cast(3549, 1000), cast(7387, 1500), cast(3549, 3000), cast(3549, 5000), ir('removebuff', 6000)])
		expect(out[0]!.metric).toBe('1/1')
		expect(out[0]!.category).toBe('strong')
	})

	it('flags a window missing Upheaval', () => {
		const out = run([ir('applybuff', 0), cast(3549, 1000), cast(3549, 3000), cast(3549, 5000), ir('removebuff', 6000)])
		expect(out[0]!.metric).toBe('0/1')
		const detail = out[0]!.detail as { windows: { missingIds: number[] }[] }
		expect(detail.windows[0]!.missingIds).toContain(7387)
	})

	it('says nothing without any Inner Release window', () => {
		expect(run([cast(3549, 1000)])).toHaveLength(0)
	})
})
