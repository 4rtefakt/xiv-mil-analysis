import { Analyser, type Suggestion, type SuggestionDetail } from '../../../parser/analyser.js'
import type { GameEvent } from '../../../fflogs/types.js'

/**
 * Broken combos. WAR's single-target combo is Coup puissant (31) → Mutilation
 * (37) → Couperet de justice (42) or Œil de la tempête (45). A combo continuer
 * cast without its proper predecessor as the previous GCD lost its combo bonus
 * (and its Beast Gauge / Surging Tempest) — that's a break.
 *
 * oGCDs don't affect the combo, so only on-GCD weaponskills update the chain.
 */
const COMBO_PREDECESSOR: Record<number, number> = {
	37: 31, // Mutilation needs Coup puissant
	42: 37, // Couperet de justice needs Mutilation
	45: 37, // Œil de la tempête needs Mutilation
}

export class BrokenCombo extends Analyser {
	readonly id = 'war.broken-combo'
	private lastGcd: number | undefined
	private readonly breaks: Array<{ tMs: number; spellId: number }> = []
	private sawCombo = false

	onEvent(e: GameEvent): void {
		if (e.type !== 'cast' || e.sourceId !== this.ctx.actorId) return
		const action = this.ctx.data.actions.get(e.actionId)
		if (!action?.onGcd) return // oGCDs don't touch the combo

		const required = COMBO_PREDECESSOR[e.actionId]
		if (required !== undefined) {
			this.sawCombo = true
			if (this.lastGcd !== required) this.breaks.push({ tMs: e.timestamp, spellId: e.actionId })
		}
		this.lastGcd = e.actionId
	}

	output(): Suggestion[] {
		if (!this.sawCombo) return []
		const n = this.breaks.length
		const detail: SuggestionDetail = {
			kind: 'combo-breaks',
			fightStartMs: this.ctx.fightStart,
			fightEndMs: this.ctx.fightEnd,
			breaks: this.breaks,
		}

		if (n === 0) {
			return [
				{
					id: this.id,
					category: 'strong',
					title: 'Continuité des combos',
					metric: '0',
					body: 'Aucun combo cassé — ta chaîne {{31}} → {{37}} → {{42}} tourne proprement. Solide.',
					detail,
				},
			]
		}
		return [
			{
				id: this.id,
				category: n <= 3 ? 'small' : 'big',
				title: 'Continuité des combos',
				metric: `${n}`,
				body:
					`${n} combo${n > 1 ? 's' : ''} cassé${n > 1 ? 's' : ''} — chaque coupure relance la chaîne et te fait perdre du gain de jauge et d’uptime. ` +
					'Finir ton combo avant de bouger pour une mécanique t’en fait récupérer pas mal.',
				detail,
			},
		]
	}
}
