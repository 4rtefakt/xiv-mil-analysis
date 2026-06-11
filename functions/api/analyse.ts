import { runAnalysis } from '../../src/api/service.js'
import { clientFor, errorResponse, json, type Env } from '../_shared.js'

interface Ctx {
	request: Request
	env: Env
	waitUntil(p: Promise<unknown>): void
}

export async function onRequestPost(context: Ctx): Promise<Response> {
	try {
		const body = (await context.request.json()) as { code?: string; fightId?: number; actorId?: number }
		const code = String(body.code ?? '')
		const fightId = Number(body.fightId)
		const actorId = Number(body.actorId)

		// The analysis of a given (report, fight, player) never changes — cache it
		// so re-views don't hit FFLogs again (which rate-limits per IP).
		const cache = (caches as unknown as { default: Cache }).default
		const cacheKey = new Request(`https://cache.local/analyse?c=${encodeURIComponent(code)}&f=${fightId}&a=${actorId}`)
		const hit = await cache.match(cacheKey)
		if (hit) return hit

		const result = await runAnalysis(clientFor(context.env), code, fightId, actorId)
		const res = json(result)
		res.headers.set('Cache-Control', 'public, max-age=3600')
		context.waitUntil(cache.put(cacheKey, res.clone()))
		return res
	} catch (e) {
		return errorResponse(e)
	}
}
