import { Analyser, type Suggestion, type SuggestionDetail } from '../../../parser/analyser.js'
import type { GameEvent } from '../../../fflogs/types.js'

const MAX = 100
const INNER_RELEASE_BUFF = 1177
const FELL_CLEAVE = 3549

/**
 * Beast Gauge efficiency: simulate the gauge from the player's casts (each
 * action's resolved gauge delta) and flag overcap — gauge generated while
 * already at 100 is wasted. Spenders cast during Inner Release are free, so
 * they're not counted as spends.
 *
 * Gauge deltas come from the level-resolved action data, so this is level-aware.
 */
export class BeastGauge extends Analyser {
	readonly id = 'war.beast-gauge'

	private gauge = 0
	private irActive = false
	private sawGauge = false
	private readonly points: Array<{ tMs: number; value: number }> = [{ tMs: 0, value: 0 }]
	private readonly overflows: Array<{ tMs: number; lost: number }> = []

	onEvent(e: GameEvent): void {
		if ((e.type === 'applybuff' || e.type === 'removebuff') && e.statusId === INNER_RELEASE_BUFF && e.targetId === this.ctx.actorId) {
			this.irActive = e.type === 'applybuff'
			return
		}
		if (e.type !== 'cast' || e.sourceId !== this.ctx.actorId) return

		const action = this.ctx.data.actions.get(e.actionId)
		const delta = action?.gauge
		if (delta == null || delta === 0) return
		// Fell Cleave is free under Inner Release — no gauge spent.
		if (delta < 0 && this.irActive && e.actionId === FELL_CLEAVE) return

		this.sawGauge = true
		if (delta > 0) {
			const next = this.gauge + delta
			if (next > MAX) {
				this.overflows.push({ tMs: e.timestamp, lost: next - MAX })
				this.gauge = MAX
			} else {
				this.gauge = next
			}
		} else {
			this.gauge = Math.max(0, this.gauge + delta)
		}
		this.points.push({ tMs: e.timestamp, value: this.gauge })
	}

	output(): Suggestion[] {
		if (!this.sawGauge) return []
		const wasted = this.overflows.reduce((s, o) => s + o.lost, 0)

		const detail: SuggestionDetail = {
			kind: 'gauge-fill',
			fightStartMs: this.ctx.fightStart,
			fightEndMs: this.ctx.fightEnd,
			max: MAX,
			points: this.points,
			overflows: this.overflows,
		}

		if (wasted <= 10) {
			return [
				{
					id: this.id,
					category: 'strong',
					title: 'Jauge Bête',
					metric: `${wasted}`,
					body: 'Tu dépenses bien ta jauge Bête — quasiment aucun gaspillage. Nickel.',
					detail,
				},
			]
		}
		return [
			{
				id: this.id,
				category: wasted <= 30 ? 'small' : 'big',
				title: 'Jauge Bête',
				metric: `${wasted}`,
				body:
					`${wasted} points de jauge Bête gaspillés (générés alors qu’elle était déjà pleine). ` +
					'Place un {{3549}} avant de la remplir à fond pour ne rien perdre.',
				detail,
			},
		]
	}
}
