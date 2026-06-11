import type { JobDefinition, SpellInfo } from '../types.js'
import { WAR } from './war/index.js'
import { WAR_SPELL_INFO } from './war/spells.js'

/** All job definitions we have data for, keyed by job code. */
export const JOBS: Record<string, JobDefinition> = {
	WAR,
}

/** Spell display info (icons/tooltips) per job code, for the UI spell helper. */
const SPELL_INFO: Record<string, SpellInfo[]> = {
	WAR: WAR_SPELL_INFO,
}

export function spellInfoFor(jobCode: string): SpellInfo[] {
	return SPELL_INFO[jobCode] ?? []
}

/**
 * Map FFLogs' `subType` (full English job name) to our job code.
 * Extend as jobs are added. Returns undefined for jobs we don't model yet.
 */
const SUBTYPE_TO_CODE: Record<string, string> = {
	Warrior: 'WAR',
}

export function jobFromSubType(subType: string): JobDefinition | undefined {
	const code = SUBTYPE_TO_CODE[subType]
	return code ? JOBS[code] : undefined
}
