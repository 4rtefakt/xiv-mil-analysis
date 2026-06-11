import { describe, expect, it } from 'vitest'
import type { Suggestion } from '../parser/analyser.js'
import { computeGrade } from './grade.js'

const s = (category: Suggestion['category']): Suggestion => ({ id: category, category, title: '', body: '' })

describe('computeGrade', () => {
	it('returns a dash with no findings', () => {
		expect(computeGrade([])).toBe('—')
	})

	it('gives S for an all-strengths pull', () => {
		expect(computeGrade([s('strong'), s('strong'), s('strong')])).toBe('S')
	})

	it('stays forgiving — a rough casual pull lands around C, not F', () => {
		// 5 big gains + 1 small (a typical casual pull)
		expect(computeGrade([s('big'), s('big'), s('big'), s('big'), s('big'), s('small')])).toBe('C')
	})

	it('a single big gain is still an A', () => {
		expect(computeGrade([s('big'), s('strong'), s('strong')])).toBe('A')
	})
})
