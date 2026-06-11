import type { LeveledAction } from '../../types.js'

/**
 * Warrior (WAR) action data — pilot job.
 *
 * Verified against xivapi/ffxiv-datamining (csv/en, Dawntrail 7.x) for unlock
 * level, recast/cooldown, and max charges; trait breakpoint *levels* come from
 * the matching "Enhanced X" rows in Trait.csv:
 *   - Enhanced Infuriate → level 66 (2nd charge)
 *   - Enhanced Onslaught → level 88 (2nd charge; max charges = 2 in DT)
 *
 * Beast Gauge deltas are NOT in the sheets (engine-defined) — they are
 * gameplay-sourced and marked with `// gauge:` notes. Potencies are omitted
 * for now (damage-loss estimation comes later).
 */
export const WAR_ACTIONS: LeveledAction[] = [
	// --- Single-target combo (GCD, 2.5s recast) ---
	{ id: 31, name: 'Heavy Swing', unlockLevel: 1, onGcd: true, cooldown: 2500 },
	{ id: 37, name: 'Maim', unlockLevel: 4, onGcd: true, cooldown: 2500, gauge: 10 },
	{ id: 42, name: "Storm's Path", unlockLevel: 26, onGcd: true, cooldown: 2500, gauge: 20 },
	{
		id: 45,
		name: "Storm's Eye",
		unlockLevel: 50,
		onGcd: true,
		cooldown: 2500,
		gauge: 10,
		appliesStatuses: ['SURGING_TEMPEST'],
		notes: 'Applies Surging Tempest from level 50 — present well below cap.',
	},

	// --- Gauge spenders (GCD). Fell Cleave replaces Inner Beast at 54. ---
	{ id: 49, name: 'Inner Beast', unlockLevel: 35, onGcd: true, cooldown: 2500, gauge: -50 },
	{
		id: 3549,
		name: 'Fell Cleave',
		unlockLevel: 54,
		onGcd: true,
		cooldown: 2500,
		gauge: -50,
		upgrades: { replaces: 49, from: 54 },
	},

	// --- Cooldowns (oGCD) ---
	{
		id: 52,
		name: 'Infuriate',
		unlockLevel: 50,
		cooldown: 60000,
		gauge: 50,
		// 1 charge from 50, 2nd charge at 66 (Enhanced Infuriate).
		charges: [
			{ level: 50, value: 1 },
			{ level: 66, value: 2 },
		],
	},
	{
		id: 7386,
		name: 'Onslaught',
		unlockLevel: 62,
		cooldown: 30000,
		// 1 charge from 62; Enhanced Onslaught at 88 brings it to 3 (in-game tooltip).
		// NOTE: ffxiv-datamining Action.MaxCharges read 2 here but is STALE — the
		// live game shows 3 (Trait "Enhanced Onslaught" Value = 3 corroborates).
		charges: [
			{ level: 62, value: 1 },
			{ level: 88, value: 3 },
		],
	},
	{ id: 7387, name: 'Upheaval', unlockLevel: 64, cooldown: 30000 },

	// Berserk (38) becomes Inner Release (7389) at 70 (Berserk Mastery trait).
	{ id: 38, name: 'Berserk', unlockLevel: 6, cooldown: 60000 },
	{
		id: 7389,
		name: 'Inner Release',
		unlockLevel: 70,
		cooldown: 60000,
		upgrades: { replaces: 38, from: 70 },
		appliesStatuses: ['INNER_RELEASE'],
	},

	// --- Higher-level additions (absent when synced low) ---
	{ id: 25752, name: 'Orogeny', unlockLevel: 86, cooldown: 30000 },
	{ id: 25753, name: 'Primal Rend', unlockLevel: 90, onGcd: true, cooldown: 2500 },
]
