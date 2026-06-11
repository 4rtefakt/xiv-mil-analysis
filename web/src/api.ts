export type SuggestionCategory = 'big' | 'small' | 'strong'

export interface SpellInfo {
	id: number
	name: string
	icon: number
	type: string
	sub: string
	desc: string
	locked?: boolean
}

export type SuggestionDetail =
	| {
			kind: 'buff-timeline'
			fightStartMs: number
			fightEndMs: number
			uptimePct: number
			targetPct: number
			windows: { startMs: number; endMs: number }[]
	  }
	| {
			kind: 'cooldown-drift'
			fightStartMs: number
			fightEndMs: number
			rows: { spellId: number; recastMs: number; casts: { tMs: number; driftMs: number }[] }[]
	  }
	| {
			kind: 'gauge-fill'
			fightStartMs: number
			fightEndMs: number
			max: number
			points: { tMs: number; value: number }[]
			overflows: { tMs: number; lost: number }[]
	  }
	| {
			kind: 'combo-breaks'
			fightStartMs: number
			fightEndMs: number
			breaks: { tMs: number; spellId: number }[]
	  }
	| {
			kind: 'dead-time'
			fightStartMs: number
			fightEndMs: number
			uptimePct: number
			windows: { startMs: number; endMs: number }[]
	  }
	| {
			kind: 'burst-windows'
			fightStartMs: number
			fightEndMs: number
			windows: { tMs: number; ok: boolean; actionIds: number[]; missingIds: number[] }[]
	  }

export interface Suggestion {
	id: string
	category: SuggestionCategory
	title: string
	metric?: string
	body: string
	detail?: SuggestionDetail
}

export interface ReportActor {
	id: number
	name: string
	job: string
	supported: boolean
}

export interface ReportResponse {
	code: string
	level?: number
	actors: ReportActor[]
	pulls: { id: number; encounterName: string; durationMs: number }[]
}

export interface AnalyseResponse {
	encounter: string
	level: number
	durationMs: number
	player: { name: string; job: string }
	grade?: string
	downtimeApplied?: boolean
	suggestions: Suggestion[]
	spells: SpellInfo[]
}

async function json<T>(res: Response): Promise<T> {
	if (!res.ok) {
		const body = (await res.json().catch(() => ({}))) as { error?: string }
		throw new Error(body.error ?? `${res.status} ${res.statusText}`)
	}
	return res.json() as Promise<T>
}

export function fetchReport(code: string): Promise<ReportResponse> {
	return fetch(`/api/report?code=${encodeURIComponent(code)}`).then((r) => json<ReportResponse>(r))
}

export function analyse(code: string, fightId: number, actorId: number): Promise<AnalyseResponse> {
	return fetch('/api/analyse', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ code, fightId, actorId }),
	}).then((r) => json<AnalyseResponse>(r))
}
