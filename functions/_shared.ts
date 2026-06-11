/**
 * Shared helpers for the Cloudflare Pages Functions. Files prefixed with `_`
 * are not routed as endpoints.
 */
import { FflogsClient } from '../src/fflogs/client.js'
import { ApiError } from '../src/api/service.js'

export interface Env {
	FFLOGS_CLIENT_ID?: string
	FFLOGS_CLIENT_SECRET?: string
}

export function clientFor(env: Env): FflogsClient {
	if (!env.FFLOGS_CLIENT_ID || !env.FFLOGS_CLIENT_SECRET) {
		throw new ApiError(503, 'FFLOGS_CLIENT_ID / FFLOGS_CLIENT_SECRET non configurés (Cloudflare → Settings → Environment variables).')
	}
	return new FflogsClient({ clientId: env.FFLOGS_CLIENT_ID, clientSecret: env.FFLOGS_CLIENT_SECRET })
}

export const json = (data: unknown, status = 200): Response =>
	new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

export function errorResponse(e: unknown): Response {
	if (e instanceof ApiError) return json({ error: e.message }, e.status)
	return json({ error: e instanceof Error ? e.message : String(e) }, 500)
}
