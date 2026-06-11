/**
 * Core of the project: a data model where an action/status's properties change
 * with character level, so the analysis can be resolved for whatever level a
 * player was *synced* to — not a hardcoded level cap.
 *
 * FFXIV level sync = the player keeps their CURRENT (modern) kit, truncated to
 * the synced level: abilities/traits above the sync level are disabled, traits
 * at or below it apply with their modern values. So a single source of truth
 * (the current kit) is scaled DOWN. That is what this module expresses.
 */

/** A breakpoint: `value` takes effect at character level `level` and above. */
export interface LevelBreakpoint<T> {
	level: number
	value: T
}

/**
 * A value that may change with level. Either a constant (same at every level),
 * or a list of breakpoints. `resolveScaled` picks the highest breakpoint whose
 * `level` is <= the character's level.
 *
 * Example — Infuriate's charges (1 base, 2 once its enhancing trait is learned):
 *   charges: [{ level: 1, value: 1 }, { level: 78, value: 2 }]
 */
export type LevelScaled<T> = T | Array<LevelBreakpoint<T>>

export interface LeveledAction {
	id: number
	name: string
	/** Lowest level at which this action (or its synced-down base form) is usable. */
	unlockLevel: number
	onGcd?: boolean
	/** Recast (GCD) or cooldown (oGCD), in milliseconds. Pre-speed for GCDs. */
	cooldown?: LevelScaled<number>
	charges?: LevelScaled<number>
	/** Cast time in ms (0 / absent = instant). */
	castTime?: LevelScaled<number>
	/** Job-gauge delta this action grants (+) or spends (-), e.g. Beast Gauge. */
	gauge?: LevelScaled<number>
	/** Keys (see statuses file) of statuses this action applies. */
	appliesStatuses?: string[]
	/**
	 * Action-upgrade chain: at/above `from` this action replaces `replaces`
	 * (e.g. Fell Cleave replaces Inner Beast at 54). When synced below `from`,
	 * the player presses the `replaces` action instead.
	 */
	upgrades?: { replaces: number; from: number }
	/** True while the listed numbers still need checking vs authoritative game data. */
	unverified?: boolean
	notes?: string
}

export interface LeveledStatus {
	id: number
	name: string
	/** Duration in ms. */
	duration?: LevelScaled<number>
	unlockLevel?: number
	unverified?: boolean
	notes?: string
}

export interface JobDefinition {
	/** Job abbreviation, e.g. 'WAR'. */
	code: string
	actions: LeveledAction[]
	statuses: LeveledStatus[]
}

/** An action with every level-scaled field collapsed for one concrete level. */
export interface ResolvedAction {
	id: number
	name: string
	/** Unlocked at the resolved level. */
	available: boolean
	onGcd: boolean
	cooldown?: number
	charges?: number
	castTime?: number
	gauge?: number
	appliesStatuses: string[]
}

export interface ResolvedStatus {
	id: number
	name: string
	available: boolean
	duration?: number
}

/**
 * Display info for a spell/buff, used by the UI's spell helper (icon + tooltip).
 * Names are localised (French for now). `icon` is the game icon number; the
 * client builds the image URL from it. `locked` marks a spell unavailable at the
 * analysed level (e.g. Orogenèse at Nv.70) — shown with a lock, no icon needed.
 */
export interface SpellInfo {
	id: number
	name: string
	icon: number
	/** e.g. "Aptitude · oGCD". */
	type: string
	/** e.g. "Recast 60s · Nv. 70". */
	sub: string
	desc: string
	locked?: boolean
}
