import { activeDurationMs, Analyser, type Suggestion, type SuggestionDetail } from '../../parser/analyser.js'
import { subtract, type Window } from '../../analysis/downtime.js'
import type { GameEvent } from '../../fflogs/types.js'

const EXPECTED_GCD = 2500 // ms; a touch generous so weaving/clipping isn't flagged
const TOLERANCE = 150

/**
 * Always Be Casting — GCD uptime. Job-agnostic: it only asks the resolved kit
 * "is this a GCD?". Counts the gaps between GCDs that exceed one GCD as dead
 * time, excluding boss downtime (you can't cast on an untargetable boss).
 */
export class AlwaysBeCasting extends Analyser {
	readonly id = 'core.always-be-casting'
	private readonly gcdTimes: number[] = []

	onEvent(e: GameEvent): void {
		if (e.type !== 'cast' || e.sourceId !== this.ctx.actorId) return
		if (this.ctx.data.actions.get(e.actionId)?.onGcd) this.gcdTimes.push(e.timestamp)
	}

	output(): Suggestion[] {
		if (this.gcdTimes.length < 3) return []
		const times = [...this.gcdTimes].sort((a, b) => a - b)

		// Dead windows = the part of each between-GCD gap beyond one GCD…
		const gaps: Window[] = []
		for (let i = 1; i < times.length; i++) {
			const deadStart = times[i - 1]! + EXPECTED_GCD
			if (times[i]! - deadStart > TOLERANCE) gaps.push({ startMs: deadStart, endMs: times[i]! })
		}
		// …minus downtime (untargetable boss isn't your fault).
		const windows = gaps.flatMap((g) => subtract(g.startMs, g.endMs, this.ctx.downtime, 300))
		const deadMs = windows.reduce((s, w) => s + (w.endMs - w.startMs), 0)

		const activeDur = activeDurationMs(this.ctx)
		const pct = activeDur > 0 ? Math.max(0, Math.min(100, Math.round((1 - deadMs / activeDur) * 1000) / 10)) : 100
		const metric = `${pct.toFixed(1).replace('.', ',')}%`
		const detail: SuggestionDetail = {
			kind: 'dead-time',
			fightStartMs: this.ctx.fightStart,
			fightEndMs: this.ctx.fightEnd,
			uptimePct: pct,
			windows,
		}

		if (pct >= 97) {
			return [{ id: this.id, category: 'strong', title: 'Uptime GCD', metric, body: 'Tu enchaînes bien tes GCD, très peu de temps mort sur le combat. Solide.', detail }]
		}
		return [
			{
				id: this.id,
				category: pct >= 92 ? 'small' : 'big',
				title: 'Uptime GCD',
				metric,
				body:
					`${Math.round(deadMs / 1000)}s de temps mort hors mécaniques — du DPS qui part en fumée. ` +
					'Anticipe tes déplacements et garde un GCD instantané sous la main pour bouger sans t’arrêter de taper.',
				detail,
			},
		]
	}
}
