import { activeDurationMs, Analyser, fightDuration, type Suggestion, type SuggestionDetail } from '../../../parser/analyser.js'
import { overlapMs, subtract } from '../../../analysis/downtime.js'
import type { GameEvent } from '../../../fflogs/types.js'

const SURGING_TEMPEST_ID = 2677

/**
 * Surging Tempest uptime — the canonical Warrior metric. Watches the buff's
 * apply/remove events on the player and reports the fraction of the fight it was
 * up. Level-aware: the buff comes from Storm's Eye at level 50, so below that
 * (very low sync) there is nothing to judge.
 *
 * Known limitation: if the buff is up for the entire fight with no apply/remove
 * event inside the window (perfectly refreshed prepull buff), event-based
 * accounting can't see it. Handled by reporting "no data" rather than a false 0%.
 */
export class SurgingTempest extends Analyser {
	readonly id = 'war.surging-tempest'

	private readonly intervals: Array<{ start: number; end: number }> = []
	private openSince: number | undefined
	private sawEvent = false

	onEvent(e: GameEvent): void {
		if (e.type !== 'applybuff' && e.type !== 'removebuff') return
		if (e.statusId !== SURGING_TEMPEST_ID || e.targetId !== this.ctx.actorId) return
		this.sawEvent = true

		if (e.type === 'applybuff') {
			if (this.openSince === undefined) this.openSince = e.timestamp
			return
		}
		// removebuff: close the interval. If we never saw the apply, the buff was
		// up since the pull.
		this.intervals.push({ start: this.openSince ?? this.ctx.fightStart, end: e.timestamp })
		this.openSince = undefined
	}

	output(): Suggestion[] {
		const status = this.ctx.data.statuses.get(SURGING_TEMPEST_ID)
		if (!status?.available) return [] // not available at this synced level

		const duration = fightDuration(this.ctx)
		if (duration <= 0 || !this.sawEvent) return [] // nothing reliable to report

		const { downtime } = this.ctx
		const ints = [...this.intervals]
		if (this.openSince !== undefined) ints.push({ start: this.openSince, end: this.ctx.fightEnd })
		ints.sort((a, b) => a.start - b.start)

		// Uptime measured over ACTIVE time (excluding boss-untargetable windows):
		// you can't keep the buff up on a boss you can't hit.
		const upTotal = ints.reduce((s, iv) => s + Math.max(0, iv.end - iv.start), 0)
		const upDuringDowntime = ints.reduce((s, iv) => s + overlapMs(iv.start, iv.end, downtime), 0)
		const activeDur = activeDurationMs(this.ctx)
		const activeUp = upTotal - upDuringDowntime
		const pct = activeDur > 0 ? Math.min(100, Math.round((activeUp / activeDur) * 1000) / 10) : 100
		const metric = `${pct.toFixed(1).replace('.', ',')}%`

		// Down windows = gaps between up-intervals, with downtime removed so red
		// bands only mark drops that were actually your fault (boss targetable).
		const gaps: Array<{ startMs: number; endMs: number }> = []
		let cursor = this.ctx.fightStart
		for (const iv of ints) {
			if (iv.start > cursor + 500) gaps.push({ startMs: cursor, endMs: iv.start })
			cursor = Math.max(cursor, iv.end)
		}
		if (cursor < this.ctx.fightEnd - 500) gaps.push({ startMs: cursor, endMs: this.ctx.fightEnd })
		const windows = gaps.flatMap((g) => subtract(g.startMs, g.endMs, downtime, 1000))

		const detail: SuggestionDetail = {
			kind: 'buff-timeline',
			fightStartMs: this.ctx.fightStart,
			fightEndMs: this.ctx.fightEnd,
			uptimePct: pct,
			targetPct: 97,
			windows,
		}

		if (pct >= 97) {
			return [
				{
					id: this.id,
					category: 'strong',
					title: 'Garder {{2677}} actif',
					metric,
					body: `${metric} d'uptime sur {{2677}} — du beau travail, rien à redire.`,
					detail,
				},
			]
		}
		return [
			{
				id: this.id,
				category: pct >= 90 ? 'small' : 'big',
				title: 'Garder {{2677}} actif',
				metric,
				body:
					'{{2677}}, c’est ~10% de dégâts tant qu’il est actif — un de tes plus gros leviers. ' +
					`Tu es à ${metric} : pose {{45}} dès l’ouverture et réapplique-le avant qu’il expire pour approcher du plein.`,
				detail,
			},
		]
	}
}
