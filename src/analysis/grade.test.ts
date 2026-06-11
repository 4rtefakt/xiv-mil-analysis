import { describe, expect, it } from 'vitest'
import type { Suggestion } from '../parser/analyser.js'
import { computeGrade } from './grade.js'

const s = (category: Suggestion['category']): Suggestion => ({ id: category, category, title: '', body: '' })

describe('computeGrade', () => {
	it('returns a dash with no findings', () => {
		expect(computeGrade([])).toBe('—')
	})

	it('gives S+ for an all-strengths pull', () => {
		expect(computeGrade([s('strong'), s('strong'), s('strong')])).toBe('S+')
	})

	it('stays kind — a rough casual pull (5 big + 1 small) lands around B', () => {
		expect(computeGrade([s('big'), s('big'), s('big'), s('big'), s('big'), s('small')])).toBe('B-')
	})

	it('rewards strengths with a +/- nuance', () => {
		// 2 big + 1 small + 1 strong → 100 -12 -2 +1.5 = 87.5 → A+
		expect(computeGrade([s('big'), s('big'), s('small'), s('strong')])).toBe('A+')
	})
})
