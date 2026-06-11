import { runAnalysis } from '../../src/api/service.js'
import { clientFor, errorResponse, json, type Env } from '../_shared.js'

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
	try {
		const body = (await context.request.json()) as { code?: string; fightId?: number; actorId?: number }
		return json(await runAnalysis(clientFor(context.env), String(body.code ?? ''), Number(body.fightId), Number(body.actorId)))
	} catch (e) {
		return errorResponse(e)
	}
}
