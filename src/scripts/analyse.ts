/**
 * Step 3 end-to-end run: report → fight → events → analysers → suggestions,
 * against a REAL log.
 *
 * Usage:
 *   FFLOGS_CLIENT_ID=... FFLOGS_CLIENT_SECRET=... \
 *   npm run analyse -- <reportCode> <fightId>
 */
import { credentialsFromEnv } from '../fflogs/auth.js'
import { FflogsClient } from '../fflogs/client.js'
import { jobFromSubType, spellInfoFor } from '../data/jobs/index.js'
import { buildJobData } from '../data/resolve.js'
import { inferDowntime } from '../analysis/downtime.js'
import { Parser } from '../parser/parser.js'
import type { AnalysisContext } from '../parser/analyser.js'
import { analysersFor } from '../modules/registry.js'

async function main() {
	const [code, fightArg] = process.argv.slice(2)
	if (!code || !fightArg) {
		console.error('Usage: npm run analyse -- <reportCode> <fightId>')
		process.exit(1)
	}
	const fightId = Number(fightArg)

	const client = new FflogsClient(credentialsFromEnv())
	const { actors, pulls, level } = await client.getReport(code)
	const pull = pulls.find((p) => p.id === fightId)
	if (!pull) throw new Error(`Fight ${fightId} not found in report ${code}`)
	if (level == null) throw new Error('Could not determine content level for this report')

	// One event pull, shared by every player's analysers (each filters by actor).
	const [casts, buffs, deaths, damage] = await Promise.all([
		client.getEvents(code, pull, 'Casts'),
		client.getEvents(code, pull, 'Buffs'),
		client.getEvents(code, pull, 'Deaths'),
		client.getRawEvents(code, pull, 'DamageDone'),
	])
	const events = [...casts, ...buffs, ...deaths].sort((a, b) => a.timestamp - b.timestamp)
	const downtime = inferDowntime(damage.map((e) => e.timestamp), pull.startTime, pull.endTime)
	console.log(`(downtime ≈ ${Math.round(downtime.reduce((s, w) => s + (w.endMs - w.startMs), 0) / 1000)}s)\n`)

	console.log(`\n${pull.encounterName} — synced level ${level}, ${Math.round((pull.endTime - pull.startTime) / 1000)}s\n`)

	for (const actor of actors) {
		const job = jobFromSubType(actor.job)
		if (!job) continue

		const ctx: AnalysisContext = {
			actorId: actor.id,
			job: job.code,
			syncedLevel: level,
			data: buildJobData(job, level),
			fightStart: pull.startTime,
			fightEnd: pull.endTime,
			downtime,
		}
		const suggestions = new Parser(ctx, analysersFor(job.code)).run(events)

		const names = new Map(spellInfoFor(job.code).map((s) => [s.id, s.name]))
		const strip = (t: string) => t.replace(/\{\{(\d+)\}\}/g, (_, id) => names.get(Number(id)) ?? '?')

		console.log(`${actor.name} (${actor.job})`)
		if (suggestions.length === 0) {
			console.log('  — no findings\n')
			continue
		}
		for (const s of suggestions) {
			const mark = s.category === 'strong' ? '✅' : s.category === 'small' ? '🟡' : '🟠'
			console.log(`  ${mark} ${strip(s.title)}${s.metric ? ` — ${s.metric}` : ''}`)
			console.log(`     ${strip(s.body)}\n`)
		}
	}
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err)
	process.exit(1)
})
