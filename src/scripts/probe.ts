/**
 * Live probe for FFLogs step 1. Validates auth + report fetch + the content
 * level derived from the report's expansion, against a REAL report.
 *
 * Usage:
 *   FFLOGS_CLIENT_ID=... FFLOGS_CLIENT_SECRET=... \
 *   npm run probe -- <reportCode> [fightId]
 */
import { credentialsFromEnv } from '../fflogs/auth.js'
import { FflogsClient } from '../fflogs/client.js'
import { jobFromSubType } from '../data/jobs/index.js'

async function main() {
	const [code, fightArg] = process.argv.slice(2)
	if (!code) {
		console.error('Usage: npm run probe -- <reportCode> [fightId]')
		process.exit(1)
	}

	const client = new FflogsClient(credentialsFromEnv())
	const { actors, pulls, level } = await client.getReport(code)

	console.log(`\nReport ${code} — ${actors.length} players, ${pulls.length} fights, content level ${level ?? 'unknown'}\n`)

	const targetPulls = fightArg ? pulls.filter((p) => p.id === Number(fightArg)) : pulls
	for (const pull of targetPulls) {
		console.log(`Fight ${pull.id}: ${pull.encounterName} (encounterId=${pull.encounterId}, zoneId=${pull.zoneId ?? '?'})`)
	}

	console.log('\nPlayers on modelled jobs:')
	for (const actor of actors) {
		const job = jobFromSubType(actor.job)
		if (!job) continue
		console.log(`  ${actor.name.padEnd(20)} ${actor.job.padEnd(10)} → synced level ${level ?? '?'}`)
	}
	console.log()
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err)
	process.exit(1)
})
