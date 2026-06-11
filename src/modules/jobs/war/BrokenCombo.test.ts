import { describe, expect, it } from 'vitest'
import { WAR } from '../../../data/jobs/war/index.js'
import { buildJobData } from '../../../data/resolve.js'
import type { AnalysisContext } from '../../../parser/analyser.js'
import type { GameEvent } from '../../../fflogs/types.js'
import { BrokenCombo } from './BrokenCombo.js'

const ACTOR = 1
let clock = 0
const cast = (actionId: number): GameEvent => ({ type: 'cast', timestamp: (clock += 2500), sourceId: ACTOR, actionId })

const ctx = (): AnalysisContext => ({ actorId: ACTOR, job: 'WAR', syncedLevel: 70, data: buildJobData(WAR, 70), fightStart: 0, fightEnd: 300_000, downtime: [] })

function run(events: GameEvent[]) {
	clock = 0
	const a = new BrokenCombo(ctx())
	for (const e of events) a.onEvent(e)
	return a.output()
}

// 31 Heavy Swing, 37 Maim, 42 Storm's Path (GCDs); 3549 Fell Cleave (GCD); 52 Infuriate (oGCD)
describe('BrokenCombo', () => {
	it('reports no break for a clean combo', () => {
		const out = run([cast(31), cast(37), cast(42)])
		clock = 0
		expect(out[0]!.category).toBe('strong')
		expect(out[0]!.metric).toBe('0')
	})

	it('flags a continuer cast off-combo as a break', () => {
		clock = 0
		const out = run([cast(31), cast(3549), cast(37)]) // Fell Cleave between Heavy Swing and Maim
		const detail = out[0]!.detail as { breaks: { spellId: number }[] }
		expect(detail.breaks).toHaveLength(1)
		expect(detail.breaks[0]!.spellId).toBe(37)
	})

	it('does not break the combo on an oGCD weave', () => {
		clock = 0
		const out = run([cast(31), cast(52), cast(37), cast(42)]) // Infuriate (oGCD) woven in
		expect(out[0]!.metric).toBe('0')
	})
})
