import type { JobDefinition } from '../../types.js'
import { WAR_ACTIONS } from './actions.js'
import { WAR_STATUSES } from './statuses.js'

export const WAR: JobDefinition = {
	code: 'WAR',
	actions: WAR_ACTIONS,
	statuses: WAR_STATUSES,
}
