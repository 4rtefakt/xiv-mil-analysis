/**
 * Diagnostic: dump what FFLogs actually returns for a fight, so we can see the
 * real event shape + which status/ability ids show up for our WAR players.
 *
 * Usage:
 *   FFLOGS_CLIENT_ID=... FFLOGS_CLIENT_SECRET=... \
 *   npm run debug-events -- <reportCode> <fightId>
 */
import { credentialsFromEnv } from '../fflogs/auth.js'
import { FflogsClient } from '../fflogs/client.js'
import { jobFromSubType } from '../data/jobs/index.js'

async function main() {
	const [code, fightArg] = process.argv.slice(2)
	if (!code || !fightArg) {
		console.error('Usage: npm run debug-events -- <reportCode> <fightId>')
		process.exit(1)
	}
	const client = new FflogsClient(credentialsFromEnv())
	const { actors, pulls } = await client.getReport(code)
	const pull = pulls.find((p) => p.id === Number(fightArg))
	if (!pull) throw new Error(`Fight ${fightArg} not found`)

	const warActorIds = new Set(actors.filter((a) => jobFromSubType(a.job)).map((a) => a.id))
	const nameById = new Map(actors.map((a) => [a.id, a.name]))

	const rawBuffs = await client.getRawEvents(code, pull, 'Buffs')
	const rawCasts = await client.getRawEvents(code, pull, 'Casts')

	console.log(`\nFight ${pull.id} — ${rawBuffs.length} buff events, ${rawCasts.length} cast events`)
	console.log('\nSample raw buff event keys:', rawBuffs[0] ? Object.keys(rawBuffs[0]) : '(none)')
	console.log('Sample raw buff event:', JSON.stringify(rawBuffs[0] ?? null))
	console.log('Sample raw cast event:', JSON.stringify(rawCasts[0] ?? null))

	for (const id of warActorIds) {
		console.log(`\n=== WAR actor ${id} (${nameById.get(id)}) ===`)

		const buffTypes = new Map<string, number>()
		const statusOnActor = new Map<number, number>()
		for (const e of rawBuffs) {
			if (e.targetID !== id) continue
			buffTypes.set(e.type, (buffTypes.get(e.type) ?? 0) + 1)
			const sid = e.abilityGameID
			if (typeof sid === 'number') statusOnActor.set(sid, (statusOnActor.get(sid) ?? 0) + 1)
		}
		console.log('  buff event types on actor:', Object.fromEntries(buffTypes))
		console.log('  distinct status ids applied to actor:', [...statusOnActor.keys()].sort((a, b) => a - b).join(', ') || '(none)')

		const castIds = new Set<number>()
		for (const e of rawCasts) {
			if (e.sourceID === id && typeof e.abilityGameID === 'number') castIds.add(e.abilityGameID)
		}
		console.log('  distinct cast ability ids:', [...castIds].sort((a, b) => a - b).join(', ') || '(none)')
	}
	console.log()
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err)
	process.exit(1)
})
