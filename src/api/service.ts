/**
 * Shared API logic, runtime-agnostic (Node Express *and* Cloudflare Pages
 * Functions call these). Takes a constructed FflogsClient; the caller supplies
 * credentials from wherever they live (process.env locally, context.env on CF).
 */
import { FflogsClient } from '../fflogs/client.js'
import { jobFromSubType, spellInfoFor } from '../data/jobs/index.js'
import { buildJobData } from '../data/resolve.js'
import { Parser } from '../parser/parser.js'
import { analysersFor } from '../modules/registry.js'
import type { AnalysisContext } from '../parser/analyser.js'
import { inferDowntime, type Window } from '../analysis/downtime.js'
import { computeGrade } from '../analysis/grade.js'

export class ApiError extends Error {
	constructor(public status: number, message: string) {
		super(message)
	}
}

/** Turn raw FFLogs/network errors into clean ApiErrors (passes ApiError through). */
function asApiError(e: unknown): never {
	if (e instanceof ApiError) throw e
	const msg = e instanceof Error ? e.message : String(e)
	if (/429|too many requests/i.test(msg)) {
		throw new ApiError(429, 'FFLogs limite temporairement les requêtes (trop d’analyses rapprochées). Patiente une minute et réessaie.')
	}
	throw new ApiError(502, `Erreur côté FFLogs : ${msg}`)
}

/** Accept a raw FFLogs URL or a bare 16-char report code. */
export function parseReportCode(input: string): string | undefined {
	const m = input.match(/reports\/([a-zA-Z0-9]{16})/) ?? input.match(/^([a-zA-Z0-9]{16})$/)
	return m?.[1]
}

export async function loadReport(client: FflogsClient, codeInput: string) {
	const code = parseReportCode(codeInput)
	if (!code) throw new ApiError(400, 'Code de report invalide')
	try {
		const { actors, pulls, level } = await client.getReport(code)
		return {
			code,
			level,
			actors: actors.map((a) => ({ ...a, supported: !!jobFromSubType(a.job) })),
			pulls: pulls.map((p) => ({ id: p.id, encounterName: p.encounterName, durationMs: p.endTime - p.startTime })),
		}
	} catch (e) {
		asApiError(e)
	}
}

export async function runAnalysis(client: FflogsClient, codeInput: string, fightId: number, actorId: number) {
	const code = parseReportCode(codeInput)
	if (!code || typeof fightId !== 'number' || typeof actorId !== 'number') throw new ApiError(400, 'Paramètres invalides')

	const { actors, pulls, level } = await client.getReport(code)
	const pull = pulls.find((p) => p.id === fightId)
	const actor = actors.find((a) => a.id === actorId)
	if (!pull || !actor) throw new ApiError(404, 'Pull ou joueur introuvable')
	if (level == null) throw new ApiError(422, 'Niveau du contenu inconnu pour ce report')
	const job = jobFromSubType(actor.job)
	if (!job) throw new ApiError(422, `Job pas encore supporté : ${actor.job}`)

	const [casts, buffs, deaths] = await Promise.all([
		client.getEvents(code, pull, 'Casts'),
		client.getEvents(code, pull, 'Buffs'),
		client.getEvents(code, pull, 'Deaths'),
	]).catch(asApiError)
	const events = [...casts, ...buffs, ...deaths].sort((a, b) => a.timestamp - b.timestamp)

	// Downtime is best-effort: it's the heaviest fetch, so if FFLogs throttles it
	// the analysis still returns (just without the downtime correction).
	let downtime: Window[] = []
	try {
		const damage = await client.getRawEvents(code, pull, 'DamageDone')
		downtime = inferDowntime(damage.map((e) => e.timestamp), pull.startTime, pull.endTime)
	} catch {
		downtime = []
	}

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

	return {
		encounter: pull.encounterName,
		level,
		durationMs: pull.endTime - pull.startTime,
		player: { name: actor.name, job: actor.job },
		grade: computeGrade(suggestions),
		suggestions,
		spells: spellInfoFor(job.code),
	}
}
