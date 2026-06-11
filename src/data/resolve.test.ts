import { describe, expect, it } from 'vitest'
import { WAR } from './jobs/war/index.js'
import { buildJobData, resolveScaled } from './resolve.js'

describe('resolveScaled', () => {
	it('returns a constant value at every level', () => {
		expect(resolveScaled(60000, 1)).toBe(60000)
		expect(resolveScaled(60000, 100)).toBe(60000)
	})

	it('picks the highest breakpoint at or below the level', () => {
		const charges = [
			{ level: 1, value: 1 },
			{ level: 78, value: 2 },
		]
		expect(resolveScaled(charges, 70)).toBe(1) // before the trait
		expect(resolveScaled(charges, 78)).toBe(2) // exactly at the trait
		expect(resolveScaled(charges, 100)).toBe(2) // after
	})

	it('returns undefined when no breakpoint applies yet', () => {
		expect(resolveScaled([{ level: 50, value: 1 }], 40)).toBeUndefined()
		expect(resolveScaled(undefined, 90)).toBeUndefined()
	})
})

describe('WAR data resolved by synced level', () => {
	it('hides actions unlocked above the synced level', () => {
		const at70 = buildJobData(WAR, 70)
		// Orogeny (86) and Primal Rend (90) do not exist when synced to 70.
		expect(at70.isAvailable(25752)).toBe(false)
		expect(at70.isAvailable(25753)).toBe(false)
		// Inner Release (70) is available.
		expect(at70.isAvailable(7389)).toBe(true)

		const at100 = buildJobData(WAR, 100)
		expect(at100.isAvailable(25752)).toBe(true)
		expect(at100.isAvailable(25753)).toBe(true)
	})

	it('respects exact unlock boundaries', () => {
		expect(buildJobData(WAR, 69).isAvailable(7389)).toBe(false) // Inner Release
		expect(buildJobData(WAR, 70).isAvailable(7389)).toBe(true)
		expect(buildJobData(WAR, 85).isAvailable(25752)).toBe(false) // Orogeny
		expect(buildJobData(WAR, 86).isAvailable(25752)).toBe(true)
	})

	it('resolves charge breakpoints (the "you have fewer charges at this level" class of bug)', () => {
		// Infuriate: 1 charge until Enhanced Infuriate at level 66, then 2.
		expect(buildJobData(WAR, 60).actions.get(52)?.charges).toBe(1)
		expect(buildJobData(WAR, 66).actions.get(52)?.charges).toBe(2)
		expect(buildJobData(WAR, 100).actions.get(52)?.charges).toBe(2)

		// Onslaught: 1 charge until Enhanced Onslaught at level 88, then 3.
		expect(buildJobData(WAR, 80).actions.get(7386)?.charges).toBe(1)
		expect(buildJobData(WAR, 88).actions.get(7386)?.charges).toBe(3)
	})
})
