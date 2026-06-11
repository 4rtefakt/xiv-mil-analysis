/**
 * Local dev API server (Express). Holds the FFLogs credentials (from .env) and
 * runs the shared analysis service. In production the same service runs as
 * Cloudflare Pages Functions (see functions/api/).
 *
 *   npm run server   # reads .env
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { credentialsFromEnv } from '../src/fflogs/auth.js'
import { FflogsClient } from '../src/fflogs/client.js'
import { ApiError, loadReport, runAnalysis } from '../src/api/service.js'

const PORT = 8787

let client: FflogsClient | undefined
function getClient(): FflogsClient {
	if (!client) client = new FflogsClient(credentialsFromEnv())
	return client
}

const app = express()
app.use(cors())
app.use(express.json())

function fail(res: express.Response, e: unknown) {
	if (e instanceof ApiError) return res.status(e.status).json({ error: e.message })
	return res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
}

app.get('/api/report', async (req, res) => {
	try {
		res.json(await loadReport(getClient(), String(req.query.code ?? '')))
	} catch (e) {
		fail(res, e)
	}
})

app.post('/api/analyse', async (req, res) => {
	const { code, fightId, actorId } = req.body ?? {}
	try {
		res.json(await runAnalysis(getClient(), String(code ?? ''), Number(fightId), Number(actorId)))
	} catch (e) {
		fail(res, e)
	}
})

app.listen(PORT, () => console.log(`xiv-mil-analysis API → http://localhost:${PORT}`))
