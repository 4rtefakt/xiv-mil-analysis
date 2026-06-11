import type { GameEvent } from '../fflogs/types.js'
import type { ResolvedJobData } from '../data/resolve.js'
import { totalDowntime, type Window } from '../analysis/downtime.js'

/**
 * Gain-framed category (never judgy): a big improvement opportunity, a small
 * one, or a confirmed strength. Maps to the UI's "Gros gain / Petit gain /
 * Point fort".
 */
export type SuggestionCategory = 'big' | 'small' | 'strong'

/**
 * Structured drill-down data for a suggestion's expandable detail view. A
 * discriminated union — the UI renders each `kind` differently. New kinds are
 * added alongside the analysers that produce them.
 */
export type SuggestionDetail =
	| {
			kind: 'buff-timeline'
			/** Fight window (ms, same scale as event timestamps) for positioning. */
			fightStartMs: number
			fightEndMs: number
			uptimePct: number
			targetPct: number
			/** Spans where the buff was NOT active. */
			windows: Array<{ startMs: number; endMs: number }>
	  }
	| {
			kind: 'cooldown-drift'
			fightStartMs: number
			fightEndMs: number
			/** One row per tracked cooldown: each cast with how long it was held past availability. */
			rows: Array<{ spellId: number; recastMs: number; casts: Array<{ tMs: number; driftMs: number }> }>
	  }
	| {
			kind: 'gauge-fill'
			fightStartMs: number
			fightEndMs: number
			max: number
			/** Gauge value after each change, for the fill curve. */
			points: Array<{ tMs: number; value: number }>
			/** Moments gauge was generated while already full (wasted). */
			overflows: Array<{ tMs: number; lost: number }>
	  }
	| {
			kind: 'combo-breaks'
			fightStartMs: number
			fightEndMs: number
			/** Each combo action cast without its proper predecessor (combo bonus lost). */
			breaks: Array<{ tMs: number; spellId: number }>
	  }
	| {
			kind: 'dead-time'
			fightStartMs: number
			fightEndMs: number
			uptimePct: number
			/** Gaps between GCDs (beyond the GCD, excluding downtime) where nothing was cast. */
			windows: Array<{ startMs: number; endMs: number }>
	  }
	| {
			kind: 'burst-windows'
			fightStartMs: number
			fightEndMs: number
			windows: Array<{ tMs: number; ok: boolean; actionIds: number[]; missingIds: number[] }>
	  }

/**
 * A single finding surfaced to the player. `title` and `body` may contain
 * `{{spellId}}` tokens that the UI renders as icon + tooltip via the spell info
 * shipped with the response.
 */
export interface Suggestion {
	id: string
	category: SuggestionCategory
	title: string
	/** Glanceable headline value, e.g. "82,7%". */
	metric?: string
	body: string
	detail?: SuggestionDetail
}

/**
 * Context handed to every analyser. Crucially it carries `data`, the job kit
 * already resolved for the player's synced level, so an analyser never has to
 * think about levels — it just reads level-correct cooldowns/charges/availability.
 */
export interface AnalysisContext {
	/** FFLogs actor id of the player being analysed. */
	actorId: number
	job: string
	syncedLevel: number
	data: ResolvedJobData
	/** Fight window (same timestamp scale as the events). */
	fightStart: number
	fightEnd: number
	/** Boss-untargetable windows (inferred). Empty when unknown. */
	downtime: Window[]
}

/** Fight length in ms. */
export function fightDuration(ctx: AnalysisContext): number {
	return Math.max(0, ctx.fightEnd - ctx.fightStart)
}

/** Fight length minus downtime — the time you could actually be doing damage. */
export function activeDurationMs(ctx: AnalysisContext): number {
	return Math.max(0, fightDuration(ctx) - totalDowntime(ctx.downtime))
}

/**
 * Base class for analysers. Each one looks at a single statistic/feature (à la
 * xivanalysis modules), fed the event stream, and emits suggestions. Because it
 * reads `ctx.data` (level-resolved), the same analyser works at level 70 and 100.
 */
export abstract class Analyser {
	abstract readonly id: string
	protected readonly ctx: AnalysisContext

	constructor(ctx: AnalysisContext) {
		this.ctx = ctx
	}

	/** Called once per event, in timestamp order. */
	abstract onEvent(event: GameEvent): void

	/** Called after the stream ends; return any suggestions. */
	abstract output(): Suggestion[]
}
