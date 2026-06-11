import { loadReport } from '../../src/api/service.js'
import { clientFor, errorResponse, json, type Env } from '../_shared.js'

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
	try {
		const code = new URL(context.request.url).searchParams.get('code') ?? ''
		const res = json(await loadReport(clientFor(context.env), code))
		res.headers.set('Cache-Control', 'no-store')
		return res
	} catch (e) {
		return errorResponse(e)
	}
}
