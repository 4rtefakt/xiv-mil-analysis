import { json } from '../_shared.js'

/**
 * Diagnostic only: reports whether the FFLogs env vars reach the Functions
 * runtime — names + booleans, never the values. Visit /api/health.
 */
export async function onRequestGet(context: { env: Record<string, unknown> }): Promise<Response> {
	const env = context.env ?? {}
	return json({
		ok: true,
		hasClientId: Boolean(env.FFLOGS_CLIENT_ID),
		hasClientSecret: Boolean(env.FFLOGS_CLIENT_SECRET),
		fflogsKeysSeen: Object.keys(env).filter((k) => k.toUpperCase().includes('FFLOGS')),
	})
}
