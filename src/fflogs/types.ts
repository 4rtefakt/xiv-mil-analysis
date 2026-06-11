/**
 * Minimal FFLogs surface. We only model what the pilot (WAR) actually consumes,
 * not the whole API — that narrow slice is the point of building this ourselves.
 *
 * The one field that makes this whole project work: each player's *synced* level
 * for the pull, which drives `buildJobData(job, level)`.
 */

export interface ReportActor {
	id: number
	name: string
	job: string // e.g. 'Warrior'
}

export interface PullActor {
	actorId: number
	/** Level the player was synced to (content level, from the report's expansion). */
	syncedLevel: number
}

export interface Pull {
	id: number
	encounterName: string
	encounterId: number
	zoneId?: number
	startTime: number
	endTime: number
	actors: PullActor[]
}

/** Normalised combat event (post-adapter). Extend as analysers need more. */
export type GameEvent =
	| { type: 'cast'; timestamp: number; sourceId: number; actionId: number }
	| { type: 'applybuff'; timestamp: number; sourceId: number; targetId: number; statusId: number }
	| { type: 'removebuff'; timestamp: number; sourceId: number; targetId: number; statusId: number }
	| { type: 'death'; timestamp: number; targetId: number }

export interface FflogsClient {
	getReport(code: string): Promise<{ actors: ReportActor[]; pulls: Pull[] }>
	getEvents(code: string, pullId: number): Promise<GameEvent[]>
}
