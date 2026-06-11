import type { GameEvent } from '../fflogs/types.js'
import { Analyser, type AnalysisContext, type Suggestion } from './analyser.js'

type AnalyserCtor = new (ctx: AnalysisContext) => Analyser

/**
 * Drives a set of analysers over one player's event stream for one pull.
 * Deliberately tiny: registration order = execution order for now. Dependency
 * injection between analysers (like xivanalysis) can be added when needed.
 */
export class Parser {
	private readonly analysers: Analyser[]

	constructor(ctx: AnalysisContext, registry: AnalyserCtor[]) {
		this.analysers = registry.map((Ctor) => new Ctor(ctx))
	}

	run(events: GameEvent[]): Suggestion[] {
		for (const event of events) {
			for (const a of this.analysers) a.onEvent(event)
		}
		return this.analysers.flatMap((a) => a.output())
	}
}
