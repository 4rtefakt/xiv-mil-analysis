import { Analyser, type Suggestion, type SuggestionDetail } from '../../../parser/analyser.js'
import type { GameEvent } from '../../../fflogs/types.js'

const IR_BUFF = 1177 // Relâchement bestial (Inner Release) status
const FELL_CLEAVE = 3549
const UPHEAVAL = 7387
// Hard-hitters worth packing into the burst (those that exist at the level are
// kept by the available-check). Onslaught/Infuriate are tools, not requirements.
const BURST_ACTIONS = [3549, 7387, 7386, 52, 25753]

/**
 * Burst windows. WAR's burst sits under Inner Release (3 free guaranteed
 * crit/direct Fell Cleaves). A good window packs those 3 Fell Cleaves plus
 * Upheaval. Level-aware: tools that don't exist at the synced level (Primal
 * Rend < 90, …) aren't required, and at low level there are few raid buffs to
 * align with — the point is just to pack your kit.
 */
export class BurstWindow extends Analyser {
	readonly id = 'war.burst-window'
	private open: { start: number; casts: number[] } | undefined
	private readonly windows: Array<{ tMs: number; ok: boolean; actionIds: number[]; missingIds: number[] }> = []

	onEvent(e: GameEvent): void {
		if ((e.type === 'applybuff' || e.type === 'removebuff') && e.statusId === IR_BUFF && e.targetId === this.ctx.actorId) {
			if (e.type === 'applybuff') this.open = { start: e.timestamp, casts: [] }
			else this.close()
			return
		}
		if (e.type === 'cast' && e.sourceId === this.ctx.actorId && this.open && BURST_ACTIONS.includes(e.actionId)) {
			this.open.casts.push(e.actionId)
		}
	}

	private close(): void {
		if (!this.open) return
		const casts = this.open.casts
		const fellCleaves = casts.filter((c) => c === FELL_CLEAVE).length
		const upheavalAvailable = this.ctx.data.actions.get(UPHEAVAL)?.available ?? false
		const hasUpheaval = casts.includes(UPHEAVAL)

		const missingIds: number[] = []
		if (upheavalAvailable && !hasUpheaval) missingIds.push(UPHEAVAL)
		const ok = fellCleaves >= 3 && (!upheavalAvailable || hasUpheaval)

		this.windows.push({ tMs: this.open.start, ok, actionIds: [7389, ...new Set(casts)], missingIds })
		this.open = undefined
	}

	output(): Suggestion[] {
		if (this.open) this.close()
		if (this.windows.length === 0) return []

		const total = this.windows.length
		const okCount = this.windows.filter((w) => w.ok).length
		const detail: SuggestionDetail = {
			kind: 'burst-windows',
			fightStartMs: this.ctx.fightStart,
			fightEndMs: this.ctx.fightEnd,
			windows: this.windows,
		}
		const metric = `${okCount}/${total}`

		if (okCount === total) {
			return [
				{
					id: this.id,
					category: 'strong',
					title: 'Fenêtres de burst',
					metric,
					body: `Tes ${total} fenêtres de {{7389}} sont bien remplies — tes gros coups sont dedans. Solide.`,
					detail,
				},
			]
		}
		return [
			{
				id: this.id,
				category: okCount * 2 >= total ? 'small' : 'big',
				title: 'Fenêtres de burst',
				metric,
				body:
					'Sous {{7389}}, concentre tes plus gros coups : tes 3 {{3549}} et {{7387}}. ' +
					'À Nv.70 il y a peu de buffs de raid à aligner — l’enjeu est surtout de tout packer dans la fenêtre. Le détail montre chaque fenêtre.',
				detail,
			},
		]
	}
}
