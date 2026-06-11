import type { Suggestion } from '../parser/analyser.js'

/**
 * Overall grade from the suggestions — deliberately kind. Start at 100, dock a
 * little per improvement opportunity (a "big gain" more than a "small" one) and
 * REWARD strengths. The curve is forgiving so a casual pull with a few things to
 * work on lands around B, and good play reaches S. Result includes a +/- nuance.
 */
const BANDS: Array<[number, string]> = [
	[97, 'S+'], [93, 'S'], [89, 'S-'],
	[85, 'A+'], [81, 'A'], [77, 'A-'],
	[73, 'B+'], [69, 'B'], [65, 'B-'],
	[60, 'C+'], [55, 'C'], [50, 'C-'],
	[43, 'D+'], [36, 'D'], [0, 'D-'],
]

export function computeGrade(suggestions: Suggestion[]): string {
	if (suggestions.length === 0) return '—'
	let score = 100
	for (const s of suggestions) {
		if (s.category === 'big') score -= 6
		else if (s.category === 'small') score -= 2
		else score += 1.5 // strength: reward keeping things tight
	}
	score = Math.max(0, Math.min(100, score))
	return BANDS.find(([min]) => score >= min)![1]
}
