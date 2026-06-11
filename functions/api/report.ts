import { loadReport } from '../../src/api/service.js'
import { clientFor, errorResponse, json, type Env } from '../_shared.js'

interface Ctx {
	request: Request
	env: Env
	waitUntil(p: Promise<unknown>): void
}

export async function onRequestGet(context: Ctx): Promise<Response> {
	try {
		const cache = (caches as unknown as { default: Cache }).default
		const hit = await cache.match(context.request)
		if (hit) return hit

		const code = new URL(context.request.url).searchParams.get('code') ?? ''
		const res = json(await loadReport(clientFor(context.env), code))
		res.headers.set('Cache-Control', 'public, max-age=600')
		context.waitUntil(cache.put(context.request, res.clone()))
		return res
	} catch (e) {
		return errorResponse(e)
	}
}
