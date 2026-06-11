import type { Analyser, AnalysisContext } from '../parser/analyser.js'
import { AlwaysBeCasting } from './core/AlwaysBeCasting.js'
import { SurgingTempest } from './jobs/war/SurgingTempest.js'
import { CooldownDrift } from './jobs/war/CooldownDrift.js'
import { BeastGauge } from './jobs/war/BeastGauge.js'
import { BrokenCombo } from './jobs/war/BrokenCombo.js'
import { BurstWindow } from './jobs/war/BurstWindow.js'

type AnalyserCtor = new (ctx: AnalysisContext) => Analyser

/** Analysers to run for a given job code. Core (job-agnostic) ones go in 'ALL'. */
const BY_JOB: Record<string, AnalyserCtor[]> = {
	ALL: [AlwaysBeCasting],
	WAR: [SurgingTempest, CooldownDrift, BeastGauge, BrokenCombo, BurstWindow],
}

export function analysersFor(jobCode: string): AnalyserCtor[] {
	return [...BY_JOB.ALL!, ...(BY_JOB[jobCode] ?? [])]
}
