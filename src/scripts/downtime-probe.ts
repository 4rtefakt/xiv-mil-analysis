/**
 * Probe: infer boss downtime (untargetable windows) from gaps in damage dealt
 * TO the boss. When the boss can't be targeted, no one lands damage on it, so a
 * long gap in its damage-taken timeline ≈ downtime.
 *
 *   node --env-file=.env --import tsx src/scripts/downtime-probe.ts <code> <fightId>
 */
import { credentialsFromEnv } from '../fflogs/auth.js'
import { FflogsClient } from '../fflogs/client.js'

const EVENTS_Q = `query($code:String!,$fight:Int!,$start:Float!,$end:Float!){
  reportData{report(code:$code){
    events(fightIDs:[$fight], dataType: DamageDone, startTime:$start, endTime:$end, limit:10000){ data nextPageTimestamp }
  }}
}`

const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}`

async function main() {
	const [code, fightArg] = process.argv.slice(2)
	const client = new FflogsClient(credentialsFromEnv())
	const { pulls } = await client.getReport(code!)
	const pull = pulls.find((p) => p.id === Number(fightArg))!
	const start0 = pull.startTime
	const end = pull.endTime

	// fetch all DamageDone events
	const events: Array<{ timestamp: number; targetID?: number; sourceID?: number }> = []
	let start = start0
	for (;;) {
		const d = (await client.graphql(EVENTS_Q, { code, fight: pull.id, start, end })) as {
			reportData: { report: { events: { data: typeof events; nextPageTimestamp: number | null } } }
		}
		const page = d.reportData.report.events
		events.push(...page.data)
		if (page.nextPageTimestamp == null) break
		start = page.nextPageTimestamp
	}

	// boss = most-hit target
	const byTarget = new Map<number, number>()
	for (const e of events) if (e.targetID != null) byTarget.set(e.targetID, (byTarget.get(e.targetID) ?? 0) + 1)
	const boss = [...byTarget.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

	// Downtime = no damage on ANY enemy (handles phase actor changes).
	const hits = events.map((e) => e.timestamp).sort((a, b) => a - b)
	console.log(`\n${events.length} damage events, primary boss target=${boss}\n`)

	const GAP = 3000
	const windows: Array<[number, number]> = []
	let cursor = start0
	for (const t of hits) {
		if (t - cursor >= GAP) windows.push([cursor, t])
		cursor = Math.max(cursor, t)
	}
	if (end - cursor >= GAP) windows.push([cursor, end])

	console.log('Inferred downtime windows (gaps ≥ 3s in damage to boss):')
	for (const [a, b] of windows) console.log(`  ${mmss(a - start0)} – ${mmss(b - start0)}  (${Math.round((b - a) / 1000)}s)`)
	const total = windows.reduce((s, [a, b]) => s + (b - a), 0)
	console.log(`\nTotal downtime ≈ ${Math.round(total / 1000)}s / ${Math.round((end - start0) / 1000)}s fight`)
}

main().catch((e) => {
	console.error(e instanceof Error ? e.message : e)
	process.exit(1)
})
