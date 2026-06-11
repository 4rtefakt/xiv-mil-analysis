/**
 * FFLogs API v2 authentication — OAuth2 client credentials flow.
 *
 * Register an API client at https://www.fflogs.com/api/clients to get a
 * client id + secret, then expose them as env vars FFLOGS_CLIENT_ID /
 * FFLOGS_CLIENT_SECRET.
 */

const TOKEN_URL = 'https://www.fflogs.com/oauth/token'

export interface FflogsCredentials {
	clientId: string
	clientSecret: string
}

export function credentialsFromEnv(env: Record<string, string | undefined> = process.env): FflogsCredentials {
	const clientId = env.FFLOGS_CLIENT_ID
	const clientSecret = env.FFLOGS_CLIENT_SECRET
	if (!clientId || !clientSecret) {
		throw new Error(
			'Missing FFLOGS_CLIENT_ID / FFLOGS_CLIENT_SECRET. Create an API client at ' +
				'https://www.fflogs.com/api/clients and set them as environment variables.',
		)
	}
	return { clientId, clientSecret }
}

export async function getAccessToken(creds: FflogsCredentials): Promise<string> {
	// btoa works on both Node (16+) and the Cloudflare Workers runtime; Buffer does not.
	const basic = btoa(`${creds.clientId}:${creds.clientSecret}`)
	const res = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${basic}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: 'grant_type=client_credentials',
	})
	if (!res.ok) {
		throw new Error(`FFLogs token request failed: ${res.status} ${await res.text()}`)
	}
	const json = (await res.json()) as { access_token?: string }
	if (!json.access_token) throw new Error('FFLogs token response had no access_token')
	return json.access_token
}
