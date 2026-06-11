import { describe, expect, it } from 'vitest'
import { inferDowntime, overlapMs, subtract, totalDowntime } from './downtime.js'

describe('inferDowntime', () => {
	it('finds gaps with no damage as downtime windows', () => {
		// hits every 1s from 0–10s, then nothing until 40s, then 40–50s
		const ts = [...Array(11).keys()].map((s) => s * 1000).concat([...Array(11).keys()].map((s) => 40_000 + s * 1000))
		const w = inferDowntime(ts, 0, 50_000)
		expect(w).toHaveLength(1)
		expect(w[0]).toEqual({ startMs: 10_000, endMs: 40_000 })
		expect(totalDowntime(w)).toBe(30_000)
	})

	it('flags a trailing gap (no damage to fight end)', () => {
		const w = inferDowntime([0, 1000, 2000], 0, 20_000)
		expect(w).toEqual([{ startMs: 2000, endMs: 20_000 }])
	})
})

describe('overlapMs', () => {
	it('measures how much of an interval is inside windows', () => {
		const dt = [{ startMs: 5_000, endMs: 15_000 }]
		expect(overlapMs(0, 10_000, dt)).toBe(5_000)
		expect(overlapMs(20_000, 30_000, dt)).toBe(0)
	})
})

describe('subtract', () => {
	it('removes windows from an interval, keeping active sub-spans', () => {
		const parts = subtract(0, 30_000, [{ startMs: 10_000, endMs: 20_000 }])
		expect(parts).toEqual([
			{ startMs: 0, endMs: 10_000 },
			{ startMs: 20_000, endMs: 30_000 },
		])
	})

	it('drops sub-spans below the minimum length', () => {
		expect(subtract(0, 10_500, [{ startMs: 500, endMs: 10_000 }], 1000)).toEqual([])
	})
})
