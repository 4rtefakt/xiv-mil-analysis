/**
 * Boss downtime inference. FFLogs has no direct untargetable/downtime field, so
 * we infer it: a long gap with NO damage dealt to ANY enemy ≈ the boss being
 * untargetable (phase transitions, dives, …). Using "any enemy" handles bosses
 * that swap to a different actor id per phase.
 *
 * Heuristic limits (v1): a gap can also be everyone-dead time; both mean "you
 * couldn't reasonably be doing damage", so excluding them from uptime/drift is
 * directionally right. Refine later with death/phase awareness.
 */
export interface Window {
	startMs: number
	endMs: number
}

export function inferDowntime(damageTimestamps: number[], fightStart: number, fightEnd: number, gapMs = 3000): Window[] {
	const hits = [...damageTimestamps].sort((a, b) => a - b)
	const windows: Window[] = []
	let cursor = fightStart
	for (const t of hits) {
		if (t - cursor >= gapMs) windows.push({ startMs: cursor, endMs: t })
		cursor = Math.max(cursor, t)
	}
	if (fightEnd - cursor >= gapMs) windows.push({ startMs: cursor, endMs: fightEnd })
	return windows
}

export function totalDowntime(windows: Window[]): number {
	return windows.reduce((s, w) => s + Math.max(0, w.endMs - w.startMs), 0)
}

/** Milliseconds of the interval [start, end] that fall inside any window. */
export function overlapMs(start: number, end: number, windows: Window[]): number {
	let o = 0
	for (const w of windows) {
		const s = Math.max(start, w.startMs)
		const e = Math.min(end, w.endMs)
		if (e > s) o += e - s
	}
	return o
}

/** Remove the given windows from [start, end], returning the leftover sub-spans. */
export function subtract(start: number, end: number, windows: Window[], minMs = 0): Window[] {
	let parts: Window[] = [{ startMs: start, endMs: end }]
	for (const w of windows) {
		parts = parts.flatMap((p) => {
			if (w.endMs <= p.startMs || w.startMs >= p.endMs) return [p]
			const res: Window[] = []
			if (w.startMs > p.startMs) res.push({ startMs: p.startMs, endMs: w.startMs })
			if (w.endMs < p.endMs) res.push({ startMs: w.endMs, endMs: p.endMs })
			return res
		})
	}
	return parts.filter((p) => p.endMs - p.startMs >= minMs)
}
