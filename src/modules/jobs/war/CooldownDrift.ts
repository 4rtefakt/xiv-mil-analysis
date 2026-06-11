import { Analyser, type Suggestion, type SuggestionDetail } from '../../../parser/analyser.js'
import { overlapMs, type Window } from '../../../analysis/downtime.js'
import type { GameEvent } from '../../../fflogs/types.js'

/**
 * Cooldown drift: how long each oGCD was held past the moment it became
 * available. Level-correct by construction — it reads the cooldown/charges
 * resolved for the player's synced level (35s vs 30s, 1 vs 2 charges, …).
 *
 * The opener is not penalised: the first cast of each ability carries no drift
 * (you intentionally hold oGCDs a few GCDs into the fight). Drift is the time an
 * ability sat at full charges between your casts.
 */
/**
 * Damage oGCDs to grade on availability. The charge-aware drift model reads each
 * one's resolved charge count at the synced level — drift only accrues at MAX
 * charges, so one held charge is free.
 *
 * Onslaught (7386) is gated on `minCharges: 2`: from Nv.88 Enhanced Onslaught
 * brings it to 3 charges and it's a real damage oGCD ("don't overcap, keep one
 * for movement"). Below that it's a single-charge gap-closer players hold for
 * mobility — not a loss — so it isn't graded.
 */
const TRACKED: Array<{ id: number; minCharges?: number }> = [
	{ id: 52 }, // Cri de guerre (Infuriate)
	{ id: 7387 }, // Révolte (Upheaval)
	{ id: 7389 }, // Relâchement bestial (Inner Release)
	{ id: 7386, minCharges: 2 }, // Assaut violent (Onslaught) — graded only at 2 charges (Nv.88+)
]

function driftForCasts(times: number[], cooldownMs: number, maxCharges: number, downtime: Window[]): Array<{ tMs: number; driftMs: number }> {
	const out: Array<{ tMs: number; driftMs: number }> = []
	if (times.length === 0 || cooldownMs <= 0) return out
	out.push({ tMs: times[0]!, driftMs: 0 })
	let charges = maxCharges - 1
	let lastT = times[0]!
	let capSince: number | undefined
	for (let i = 1; i < times.length; i++) {
		const t = times[i]!
		if (charges < maxCharges) {
			const reachFull = lastT + (maxCharges - charges) * cooldownMs
			if (reachFull <= t) {
				charges = maxCharges
				capSince = reachFull
			} else {
				charges += (t - lastT) / cooldownMs
				capSince = undefined
			}
		}
		// Held time at cap, minus any downtime in that span (you can't use it then).
		const drift = capSince !== undefined ? Math.max(0, t - capSince - overlapMs(capSince, t, downtime)) : 0
		out.push({ tMs: t, driftMs: drift })
		charges = Math.max(0, charges - 1)
		capSince = undefined
		lastT = t
	}
	return out
}

export class CooldownDrift extends Analyser {
	readonly id = 'war.cooldown-drift'
	private readonly castsBy = new Map<number, number[]>()

	onEvent(e: GameEvent): void {
		if (e.type !== 'cast' || e.sourceId !== this.ctx.actorId) return
		if (!TRACKED.some((t) => t.id === e.actionId)) return
		const arr = this.castsBy.get(e.actionId) ?? []
		arr.push(e.timestamp)
		this.castsBy.set(e.actionId, arr)
	}

	output(): Suggestion[] {
		const rows: Array<{ spellId: number; recastMs: number; casts: Array<{ tMs: number; driftMs: number }> }> = []
		let totalDriftMs = 0
		let worst: { id: number; drift: number } | undefined

		for (const { id, minCharges } of TRACKED) {
			const action = this.ctx.data.actions.get(id)
			if (!action?.available || !action.cooldown) continue
			if (minCharges && (action.charges ?? 1) < minCharges) continue // e.g. Onslaught below Nv.88
			const times = (this.castsBy.get(id) ?? []).slice().sort((a, b) => a - b)
			if (times.length === 0) continue
			const casts = driftForCasts(times, action.cooldown, action.charges ?? 1, this.ctx.downtime)
			const drift = casts.reduce((s, c) => s + c.driftMs, 0)
			totalDriftMs += drift
			if (!worst || drift > worst.drift) worst = { id, drift }
			rows.push({ spellId: id, recastMs: action.cooldown, casts })
		}

		if (rows.length === 0) return [] // no tracked cooldowns used → nothing to say

		const totalSec = Math.round(totalDriftMs / 1000)
		const detail: SuggestionDetail = {
			kind: 'cooldown-drift',
			fightStartMs: this.ctx.fightStart,
			fightEndMs: this.ctx.fightEnd,
			rows,
		}

		if (totalSec <= 5) {
			return [
				{
					id: this.id,
					category: 'strong',
					title: 'Utilisation des cooldowns',
					metric: `+${totalSec}s`,
					body: 'Tu lances bien tes cooldowns dès qu’ils sont prêts — très peu de temps perdu. Solide.',
					detail,
				},
			]
		}
		const worstToken = worst ? ` — surtout {{${worst.id}}}` : ''
		return [
			{
				id: this.id,
				category: totalSec <= 20 ? 'small' : 'big',
				title: 'Utilisation des cooldowns',
				metric: `+${totalSec}s`,
				body:
					`Tes cooldowns rapportent le plus lancés dès qu’ils sont prêts. Ici quelques-uns ont été tenus un peu trop longtemps${worstToken}` +
					` — environ ${totalSec}s de retard cumulé. Le détail montre le retard de chaque utilisation.`,
				detail,
			},
		]
	}
}
