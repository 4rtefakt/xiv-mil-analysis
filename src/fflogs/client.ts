import type { FflogsCredentials } from './auth.js'
import { getAccessToken } from './auth.js'
import { expansionNameToLevel } from './expansion.js'
import type { GameEvent, Pull, ReportActor } from './types.js'

const GRAPHQL_URL = 'https://www.fflogs.com/api/v2/client'

/** Raw FFLogs event shape (FFXIV). We only read the fields we normalise. */
interface RawEvent {
	timestamp: number
	type: string
	sourceID?: number
	targetID?: number
	abilityGameID?: number
	// FFLogs encodes buff status ids in abilityGameID for (apply|remove)buff events.
	[key: string]: unknown
}

export type { RawEvent }

const REPORT_QUERY = `
query Report($code: String!) {
  reportData {
    report(code: $code) {
      startTime
      zone { id name expansion { id name } }
      masterData { actors(type: "Player") { id name subType } }
      fights {
        id
        name
        encounterID
        difficulty
        kill
        startTime
        endTime
        gameZone { id name }
      }
    }
  }
}`

const EVENTS_QUERY = `
query Events($code: String!, $fight: Int!, $start: Float!, $end: Float!, $dataType: EventDataType!) {
  reportData {
    report(code: $code) {
      events(fightIDs: [$fight], startTime: $start, endTime: $end, dataType: $dataType, limit: 10000) {
        data
        nextPageTimestamp
      }
    }
  }
}`

export class FflogsClient {
	private token: string | undefined

	constructor(private readonly creds: FflogsCredentials) {}

	/** Run an arbitrary GraphQL query (used by probes/exploration). */
	async graphql<T = unknown>(query: string, variables: Record<string, unknown>): Promise<T> {
		return this.query<T>(query, variables)
	}

	private async query<T>(query: string, variables: Record<string, unknown>): Promise<T> {
		if (!this.token) this.token = await getAccessToken(this.creds)
		const res = await fetch(GRAPHQL_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ query, variables }),
		})
		if (!res.ok) throw new Error(`FFLogs GraphQL ${res.status}: ${await res.text()}`)
		const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> }
		if (json.errors?.length) throw new Error(`FFLogs GraphQL errors: ${json.errors.map((e) => e.message).join('; ')}`)
		if (!json.data) throw new Error('FFLogs GraphQL returned no data')
		return json.data
	}

	/**
	 * Fetch a report's players + fights, plus the content's level — derived from
	 * the report's expansion (FFLogs has no direct level field).
	 */
	async getReport(code: string): Promise<{ actors: ReportActor[]; pulls: Pull[]; level: number | undefined }> {
		type Resp = {
			reportData: {
				report: {
					zone: { id: number; name: string; expansion: { id: number; name: string } | null } | null
					masterData: { actors: Array<{ id: number; name: string; subType: string }> }
					fights: Array<{
						id: number
						name: string
						encounterID: number
						startTime: number
						endTime: number
						gameZone: { id: number; name: string } | null
					}>
				}
			}
		}
		const { reportData } = await this.query<Resp>(REPORT_QUERY, { code })
		const report = reportData.report
		const level = expansionNameToLevel(report.zone?.expansion?.name)
		const actors: ReportActor[] = report.masterData.actors.map((a) => ({
			id: a.id,
			name: a.name,
			job: a.subType,
		}))
		const pulls: Pull[] = report.fights.map((f) => ({
			id: f.id,
			encounterName: f.name,
			encounterId: f.encounterID,
			zoneId: f.gameZone?.id,
			startTime: f.startTime,
			endTime: f.endTime,
			actors: [],
		}))
		return { actors, pulls, level }
	}

	/** Fetch every raw event page of one kind for a pull, following pagination. */
	async getRawEvents(code: string, pull: Pull, dataType: 'Casts' | 'Buffs' | 'Deaths' | 'DamageDone'): Promise<RawEvent[]> {
		const out: RawEvent[] = []
		let start = pull.startTime
		// eslint-disable-next-line no-constant-condition
		while (true) {
			type Resp = {
				reportData: { report: { events: { data: RawEvent[]; nextPageTimestamp: number | null } } }
			}
			const { reportData } = await this.query<Resp>(EVENTS_QUERY, {
				code,
				fight: pull.id,
				start,
				end: pull.endTime,
				dataType,
			})
			const page = reportData.report.events
			out.push(...page.data)
			if (page.nextPageTimestamp == null) break
			start = page.nextPageTimestamp
		}
		return out
	}

	/** Fetch normalised events of one kind for a pull. */
	async getEvents(code: string, pull: Pull, dataType: 'Casts' | 'Buffs' | 'Deaths' | 'DamageDone'): Promise<GameEvent[]> {
		const raw = await this.getRawEvents(code, pull, dataType)
		return raw.map(normalise).filter((e): e is GameEvent => e !== undefined)
	}
}

/**
 * FFLogs encodes a buff/debuff's game id as statusId + 1_000_000 in
 * `abilityGameID` (the leading "1" marks a status vs an action). Strip it.
 */
const STATUS_ID_OFFSET = 1_000_000

function toStatusId(abilityGameID: number): number {
	return abilityGameID >= STATUS_ID_OFFSET ? abilityGameID - STATUS_ID_OFFSET : abilityGameID
}

function normalise(e: RawEvent): GameEvent | undefined {
	switch (e.type) {
		case 'cast':
			if (e.sourceID == null || e.abilityGameID == null) return undefined
			return { type: 'cast', timestamp: e.timestamp, sourceId: e.sourceID, actionId: e.abilityGameID }
		// 'refreshbuff' is treated as an apply so uptime opens even if the only
		// in-window evidence of a prepull buff is its refresh.
		case 'applybuff':
		case 'refreshbuff':
			if (e.sourceID == null || e.targetID == null || e.abilityGameID == null) return undefined
			return { type: 'applybuff', timestamp: e.timestamp, sourceId: e.sourceID, targetId: e.targetID, statusId: toStatusId(e.abilityGameID) }
		case 'removebuff':
			if (e.sourceID == null || e.targetID == null || e.abilityGameID == null) return undefined
			return { type: 'removebuff', timestamp: e.timestamp, sourceId: e.sourceID, targetId: e.targetID, statusId: toStatusId(e.abilityGameID) }
		case 'death':
			if (e.targetID == null) return undefined
			return { type: 'death', timestamp: e.timestamp, targetId: e.targetID }
		// 'begincast' (recast in progress) and '*buffstack' (stack count changes)
		// are intentionally ignored.
		default:
			return undefined
	}
}
