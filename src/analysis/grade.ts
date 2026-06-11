import type { Suggestion } from '../parser/analyser.js'

/**
 * Overall letter grade from the suggestions. Heuristic and tunable: start at
 * 100, dock points per improvement opportunity (a "big gain" costs more than a
 * "small gain"; strengths cost nothing). Curve is intentionally forgiving so a
 * casual pull with a few things to work on still lands around C, not F.
 */
export function computeGrade(suggestions: Suggestion[]): string {
	if (suggestions.length === 0) return '—'
	let score = 100
	for (const s of suggestions) {
		if (s.category === 'big') score -= 8
		else if (s.category === 'small') score -= 2.5
	}
	score = Math.max(0, Math.min(100, score))
	if (score >= 93) return 'S'
	if (score >= 82) return 'A'
	if (score >= 70) return 'B'
	if (score >= 56) return 'C'
	if (score >= 42) return 'D'
	return 'E'
}
