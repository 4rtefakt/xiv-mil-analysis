import type {
	JobDefinition,
	LeveledAction,
	LeveledStatus,
	LevelScaled,
	ResolvedAction,
	ResolvedStatus,
} from './types.js'

/**
 * Collapse a level-scaled value for a concrete level by picking the highest
 * breakpoint whose level is <= `level`. Returns undefined if the field is
 * absent or no breakpoint applies yet at this level.
 */
export function resolveScaled<T>(scaled: LevelScaled<T> | undefined, level: number): T | undefined {
	if (scaled === undefined) return undefined
	if (!Array.isArray(scaled)) return scaled

	let chosen: T | undefined
	let chosenLevel = -Infinity
	for (const bp of scaled) {
		if (bp.level <= level && bp.level > chosenLevel) {
			chosenLevel = bp.level
			chosen = bp.value
		}
	}
	return chosen
}

export function resolveAction(action: LeveledAction, level: number): ResolvedAction {
	return {
		id: action.id,
		name: action.name,
		available: level >= action.unlockLevel,
		onGcd: action.onGcd ?? false,
		cooldown: resolveScaled(action.cooldown, level),
		charges: resolveScaled(action.charges, level),
		castTime: resolveScaled(action.castTime, level),
		gauge: resolveScaled(action.gauge, level),
		appliesStatuses: action.appliesStatuses ?? [],
	}
}

export function resolveStatus(status: LeveledStatus, level: number): ResolvedStatus {
	return {
		id: status.id,
		name: status.name,
		available: level >= (status.unlockLevel ?? 1),
		duration: resolveScaled(status.duration, level),
	}
}

/** Everything an analyser needs, pre-resolved for one player's synced level. */
export interface ResolvedJobData {
	code: string
	level: number
	actions: Map<number, ResolvedAction>
	statuses: Map<number, ResolvedStatus>
	/** Is this action unlocked at the resolved level? */
	isAvailable(actionId: number): boolean
}

export function buildJobData(job: JobDefinition, level: number): ResolvedJobData {
	const actions = new Map<number, ResolvedAction>()
	for (const a of job.actions) actions.set(a.id, resolveAction(a, level))

	const statuses = new Map<number, ResolvedStatus>()
	for (const s of job.statuses) statuses.set(s.id, resolveStatus(s, level))

	return {
		code: job.code,
		level,
		actions,
		statuses,
		isAvailable: (id) => actions.get(id)?.available ?? false,
	}
}
