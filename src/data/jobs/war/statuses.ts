import type { LeveledStatus } from '../../types.js'

/**
 * Warrior statuses. Unlock levels verified against Trait.csv where applicable.
 * Status *durations* are not in the data sheets (they are applied by the action,
 * engine-side) so they are gameplay-sourced — flagged below for confirmation.
 */
export const WAR_STATUSES: LeveledStatus[] = [
	{
		id: 2677,
		name: 'Surging Tempest',
		unlockLevel: 50, // applied by Storm's Eye (verified unlock 50)
		// 30s per application, extendable to a 60s cap. Confirmed by user (WAR main).
		duration: 30000,
		notes: 'Damage-up buff; uptime is a key WAR metric at every level. 60s max.',
	},
	{
		id: 1177,
		name: 'Inner Release',
		unlockLevel: 70,
		duration: 15000, // confirmed by user
	},
	{
		id: 1897,
		name: 'Nascent Chaos',
		unlockLevel: 72, // verified: Nascent Chaos trait, level 72
	},
]
