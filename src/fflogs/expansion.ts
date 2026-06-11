/**
 * FFLogs doesn't expose a player's synced level directly. The reliable proxy
 * (as used by xiv-cd-planner) is the report's zone → expansion → that
 * expansion's level cap. We match on the expansion *name* (stable) rather than
 * its numeric id (undocumented, historically reshuffled).
 *
 * This gives the CONTENT's level cap. Whether a given player was actually
 * synced to it (vs running unsynced with their full modern kit) is decided
 * separately in syncedLevel.ts by checking for above-cap ability usage.
 */
export function expansionNameToLevel(name: string | undefined | null): number | undefined {
	if (!name) return undefined
	const n = name.toLowerCase()
	if (n.includes('dawntrail')) return 100
	if (n.includes('endwalker')) return 90
	if (n.includes('shadowbringers')) return 80
	if (n.includes('stormblood')) return 70
	if (n.includes('heavensward')) return 60
	if (n.includes('realm reborn')) return 50
	return undefined
}
