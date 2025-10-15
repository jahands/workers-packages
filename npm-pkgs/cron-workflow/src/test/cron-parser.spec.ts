import { CronExpressionParser } from 'cron-parser'
import { describe, expect, it } from 'vitest'

const parseExpression = CronExpressionParser.parse.bind(CronExpressionParser)

describe('cron-parser', () => {
	describe('basic parsing', () => {
		it('parses simple cron expressions', () => {
			const interval = parseExpression('*/2 * * * *')
			expect(interval).toBeDefined()
		})

		it('gets next occurrence', () => {
			const interval = parseExpression('*/5 * * * *')
			const next = interval.next()
			expect(next).toBeDefined()
			expect(next.toDate()).toBeInstanceOf(Date)
		})

		it('gets previous occurrence', () => {
			const interval = parseExpression('*/5 * * * *')
			const prev = interval.prev()
			expect(prev).toBeDefined()
			expect(prev.toDate()).toBeInstanceOf(Date)
		})

		it('gets multiple occurrences using next()', () => {
			const interval = parseExpression('0 0 * * *')
			const first = interval.next()
			const second = interval.next()
			const third = interval.next()

			expect(first.toDate().getTime()).toBeLessThan(second.toDate().getTime())
			expect(second.toDate().getTime()).toBeLessThan(third.toDate().getTime())
		})

		it('throws error for invalid cron expressions', () => {
			expect(() => parseExpression('invalid')).toThrow()
			expect(() => parseExpression('60 * * * *')).toThrow()
			expect(() => parseExpression('* 24 * * *')).toThrow()
		})
	})

	describe('special characters', () => {
		it('handles asterisk (*) for any value', () => {
			const interval = parseExpression('* * * * *')
			const next = interval.next()
			expect(next).toBeDefined()
		})

		it('handles question mark (?) as alias for asterisk', () => {
			const interval = parseExpression('? * * * *')
			const next = interval.next()
			expect(next).toBeDefined()
		})

		it('handles comma (,) for value list separator', () => {
			const interval = parseExpression('0,15,30,45 * * * *')
			const next = interval.next()
			const minute = next.toDate().getMinutes()
			expect([0, 15, 30, 45]).toContain(minute)
		})

		it('handles dash (-) for range of values', () => {
			const interval = parseExpression('0 9-17 * * *')
			const next = interval.next()
			const hour = next.toDate().getHours()
			expect(hour).toBeGreaterThanOrEqual(9)
			expect(hour).toBeLessThanOrEqual(17)
		})

		it('handles slash (/) for step values', () => {
			const interval = parseExpression('*/10 * * * *')
			const next = interval.next()
			const minute = next.toDate().getMinutes()
			expect(minute % 10).toBe(0)
		})

		it('handles step values with range', () => {
			const interval = parseExpression('5-55/10 * * * *')
			const next = interval.next()
			const minute = next.toDate().getMinutes()
			expect([5, 15, 25, 35, 45, 55]).toContain(minute)
		})

		it('handles L for last day of month', () => {
			const interval = parseExpression('0 0 L * *', {
				currentDate: new Date('2024-01-15'),
			})
			const next = interval.next()
			expect(next.toDate().getDate()).toBe(31) // January has 31 days
		})

		it('handles L for last day of month in February (non-leap year)', () => {
			const interval = parseExpression('0 0 L * *', {
				currentDate: new Date('2023-02-15'),
			})
			const next = interval.next()
			expect(next.toDate().getDate()).toBe(28)
		})

		it('handles L for last day of month in February (leap year)', () => {
			const interval = parseExpression('0 0 L * *', {
				currentDate: new Date('2024-02-15'),
			})
			const next = interval.next()
			expect(next.toDate().getDate()).toBe(29)
		})

		it('handles L for last occurrence of weekday (1L)', () => {
			const interval = parseExpression('0 0 * * 1L', {
				currentDate: new Date('2024-01-01'),
			})
			const next = interval.next()
			// Last Monday of January 2024 is the 29th
			expect(next.toDate().getDate()).toBe(29)
			expect(next.toDate().getDay()).toBe(1) // Monday
		})

		it('handles # for Nth weekday of month', () => {
			const interval = parseExpression('0 0 * * 1#1', {
				currentDate: new Date('2023-12-31'),
			})
			const next = interval.next()
			// First Monday of January 2024 is the 1st (Jan 1, 2024 is Monday)
			expect(next.toDate().getDate()).toBe(1)
			expect(next.toDate().getDay()).toBe(1) // Monday
			expect(next.toDate().getMonth()).toBe(0) // January
		})

		it('handles # for second Friday of month', () => {
			const interval = parseExpression('0 0 * * 5#2', {
				currentDate: new Date('2024-01-01'),
			})
			const next = interval.next()
			// Second Friday of January 2024 is the 12th
			expect(next.toDate().getDate()).toBe(12)
			expect(next.toDate().getDay()).toBe(5) // Friday
		})

		it('handles H (hash) for randomized values with seed', () => {
			const interval1 = parseExpression('H * * * *', {
				hashSeed: 'test-job',
			})
			const interval2 = parseExpression('H * * * *', {
				hashSeed: 'test-job',
			})
			const interval3 = parseExpression('H * * * *', {
				hashSeed: 'different-job',
			})

			// Same seed should produce same jitter
			expect(interval1.stringify()).toBe(interval2.stringify())
			// Different seed should produce different jitter
			expect(interval1.stringify()).not.toBe(interval3.stringify())
		})

		it('handles H with range', () => {
			const interval = parseExpression('H(0-10) * * * *', {
				hashSeed: 'test-job',
			})
			const next = interval.next()
			const minute = next.toDate().getMinutes()
			expect(minute).toBeGreaterThanOrEqual(0)
			expect(minute).toBeLessThanOrEqual(10)
		})

		it('handles H with step values', () => {
			const interval = parseExpression('H/15 * * * *', {
				hashSeed: 'test-job',
			})
			// H/15 expands to specific values like "7,22,37,52 * * * *"
			const stringified = interval.stringify()
			expect(stringified).toContain(',')
			expect(stringified).toMatch(/^\d+,\d+,\d+,\d+ \* \* \* \*$/)
		})
	})

	describe('predefined expressions', () => {
		it('handles @yearly', () => {
			const interval = parseExpression('@yearly', {
				currentDate: new Date('2024-06-15'),
			})
			const next = interval.next()
			expect(next.toDate().getMonth()).toBe(0) // January
			expect(next.toDate().getDate()).toBe(1)
		})

		it('handles @monthly', () => {
			const interval = parseExpression('@monthly', {
				currentDate: new Date('2024-01-15'),
			})
			const next = interval.next()
			expect(next.toDate().getDate()).toBe(1)
		})

		it('handles @weekly', () => {
			const interval = parseExpression('@weekly', {
				currentDate: new Date('2024-01-10'),
			})
			const next = interval.next()
			expect(next.toDate().getDay()).toBe(0) // Sunday
		})

		it('handles @daily', () => {
			const interval = parseExpression('@daily', {
				currentDate: new Date('2024-01-15T12:00:00'),
			})
			const next = interval.next()
			expect(next.toDate().getHours()).toBe(0)
			expect(next.toDate().getMinutes()).toBe(0)
		})

		it('handles @hourly', () => {
			const interval = parseExpression('@hourly', {
				currentDate: new Date('2024-01-15T12:30:00'),
			})
			const next = interval.next()
			expect(next.toDate().getMinutes()).toBe(0)
		})

		it('handles @weekdays', () => {
			const interval = parseExpression('@weekdays', {
				currentDate: new Date('2024-01-15T00:00:00'), // Monday
			})
			const dates = Array.from({ length: 5 }, () => interval.next().toDate())
			dates.forEach((date) => {
				const day = date.getDay()
				expect(day).toBeGreaterThanOrEqual(1)
				expect(day).toBeLessThanOrEqual(5)
			})
		})

		it('handles @weekends', () => {
			const interval = parseExpression('@weekends', {
				currentDate: new Date('2024-01-15T00:00:00'),
			})
			const next = interval.next()
			const day = next.toDate().getDay()
			expect([0, 6]).toContain(day) // Sunday or Saturday
		})
	})

	describe('field values and aliases', () => {
		it('handles month aliases (JAN-DEC)', () => {
			const interval = parseExpression('0 0 1 JAN *', {
				currentDate: new Date('2024-01-01'),
			})
			const next = interval.next()
			expect(next.toDate().getMonth()).toBe(0) // January
		})

		it('handles multiple month aliases', () => {
			const interval = parseExpression('0 0 1 JAN,JUN,DEC *', {
				currentDate: new Date('2024-01-01'),
			})
			const next = interval.next()
			expect([0, 5, 11]).toContain(next.toDate().getMonth())
		})

		it('handles day of week aliases (SUN-SAT)', () => {
			const interval = parseExpression('0 0 * * MON', {
				currentDate: new Date('2024-01-15'),
			})
			const next = interval.next()
			expect(next.toDate().getDay()).toBe(1) // Monday
		})

		it('handles multiple day aliases', () => {
			const interval = parseExpression('0 0 * * MON,WED,FRI', {
				currentDate: new Date('2024-01-15'),
			})
			const next = interval.next()
			expect([1, 3, 5]).toContain(next.toDate().getDay())
		})

		it('handles day range with aliases', () => {
			const interval = parseExpression('0 0 * * MON-FRI', {
				currentDate: new Date('2024-01-15'),
			})
			const dates = Array.from({ length: 5 }, () => interval.next().toDate())
			dates.forEach((date) => {
				const day = date.getDay()
				expect(day).toBeGreaterThanOrEqual(1)
				expect(day).toBeLessThanOrEqual(5)
			})
		})
	})

	describe('options', () => {
		it('uses currentDate option', () => {
			const currentDate = new Date('2024-01-15T10:00:00')
			const interval = parseExpression('0 12 * * *', { currentDate })
			const next = interval.next()
			expect(next.toDate().getDate()).toBe(15)
			expect(next.toDate().getHours()).toBe(12)
		})

		it('uses startDate option', () => {
			const startDate = new Date('2024-06-01')
			const interval = parseExpression('0 0 1 * *', {
				startDate,
				currentDate: new Date('2024-01-01'),
			})
			const next = interval.next()
			expect(next.toDate().getTime()).toBeGreaterThanOrEqual(startDate.getTime())
		})

		it('uses endDate option to limit iterations', () => {
			const endDate = new Date('2024-01-31')
			const interval = parseExpression('0 0 * * *', {
				currentDate: new Date('2024-01-15'),
				endDate,
			})

			let count = 0
			try {
				while (count < 100) {
					const next = interval.next()
					expect(next.toDate().getTime()).toBeLessThanOrEqual(endDate.getTime())
					count++
				}
			} catch {
				// Expected to throw when reaching endDate
				expect(count).toBeLessThan(100)
			}
		})

		it('parses expressions with all options combined', () => {
			const interval = parseExpression('*/5 * * * *', {
				currentDate: new Date('2024-01-15T10:00:00'),
				startDate: new Date('2024-01-15T00:00:00'),
				endDate: new Date('2024-01-20T00:00:00'),
			})
			expect(interval).toBeDefined()
			const next = interval.next()
			expect(next).toBeDefined()
		})
	})

	describe('timezone support', () => {
		it('handles timezone option', () => {
			const interval = parseExpression('0 12 * * *', {
				currentDate: '2024-01-15T10:00:00',
				tz: 'America/New_York',
			})
			const next = interval.next()
			expect(next).toBeDefined()
		})

		it('handles different timezones correctly', () => {
			const currentDate = '2024-01-15T10:00:00'

			const intervalNY = parseExpression('0 12 * * *', {
				currentDate,
				tz: 'America/New_York',
			})

			const intervalLondon = parseExpression('0 12 * * *', {
				currentDate,
				tz: 'Europe/London',
			})

			const nextNY = intervalNY.next()
			const nextLondon = intervalLondon.next()

			// Times should be different due to timezone offset
			expect(nextNY.toDate().getTime()).not.toBe(nextLondon.toDate().getTime())
		})

		it('handles DST transitions', () => {
			// March 10, 2024 - DST starts in US
			const interval = parseExpression('0 * * * *', {
				currentDate: '2024-03-10T00:00:00',
				tz: 'America/New_York',
			})

			const dates = Array.from({ length: 30 }, () => interval.next().toDate())
			expect(dates.length).toBe(30)
		})
	})

	describe('iteration', () => {
		it('supports hasNext() method', () => {
			const interval = parseExpression('0 0 * * *', {
				currentDate: new Date('2024-01-15'),
				endDate: new Date('2024-01-20'),
			})

			expect(interval.hasNext()).toBe(true)
		})

		it('supports hasPrev() method', () => {
			const interval = parseExpression('0 0 * * *', {
				currentDate: new Date('2024-01-15'),
			})

			expect(interval.hasPrev()).toBe(true)
		})

		it('iterates backwards with prev()', () => {
			const interval = parseExpression('0 0 * * *', {
				currentDate: new Date('2024-01-15'),
			})

			const first = interval.prev()
			const second = interval.prev()
			const third = interval.prev()

			expect(first.toDate().getTime()).toBeGreaterThan(second.toDate().getTime())
			expect(second.toDate().getTime()).toBeGreaterThan(third.toDate().getTime())
		})

		it('resets to initial state with reset()', () => {
			const interval = parseExpression('0 0 * * *', {
				currentDate: new Date('2024-01-15T12:00:00'),
			})

			const firstNext = interval.next()
			interval.next()
			interval.next()

			interval.reset()
			const afterReset = interval.next()

			expect(firstNext.toDate().getTime()).toBe(afterReset.toDate().getTime())
		})
	})

	describe('edge cases', () => {
		it('handles end of month transitions', () => {
			const interval = parseExpression('0 0 31 * *', {
				currentDate: new Date('2024-01-15'),
			})

			const next = interval.next()
			expect(next.toDate().getDate()).toBe(31)
		})

		it('skips months without 31 days', () => {
			const interval = parseExpression('0 0 31 * *', {
				currentDate: new Date('2024-01-31T12:00:00'), // After the scheduled time
			})

			const next = interval.next() // Should skip Feb and go to March
			expect(next.toDate().getMonth()).toBe(2) // March
			expect(next.toDate().getDate()).toBe(31)
		})

		it('handles end of year transitions', () => {
			const interval = parseExpression('0 0 * * *', {
				currentDate: new Date('2024-12-30'),
			})

			const dates = Array.from({ length: 5 }, () => interval.next().toDate())
			expect(dates.some((d) => d.getFullYear() === 2025)).toBe(true)
		})

		it('handles February 29th in leap years', () => {
			const interval = parseExpression('0 0 29 2 *', {
				currentDate: new Date('2024-01-01'),
			})

			const next = interval.next()
			expect(next.toDate().getMonth()).toBe(1) // February
			expect(next.toDate().getDate()).toBe(29)
		})

		it('skips February 29th in non-leap years', () => {
			const interval = parseExpression('0 0 29 2 *', {
				currentDate: new Date('2023-01-01'),
			})

			const next = interval.next()
			expect(next.toDate().getFullYear()).toBe(2024) // Next leap year
		})

		it('handles complex combinations of values and ranges', () => {
			const interval = parseExpression('0,30 9-17 1,15 1,6,12 1-5', {
				currentDate: new Date('2024-01-01'),
			})

			const next = interval.next()
			expect([0, 30]).toContain(next.toDate().getMinutes())
			expect(next.toDate().getHours()).toBeGreaterThanOrEqual(9)
			expect(next.toDate().getHours()).toBeLessThanOrEqual(17)
		})

		it('handles midnight correctly', () => {
			const interval = parseExpression('0 0 0 * * *', {
				currentDate: new Date('2024-01-15T12:00:00'),
			})

			const next = interval.next()
			expect(next.toDate().getHours()).toBe(0)
			expect(next.toDate().getMinutes()).toBe(0)
			expect(next.toDate().getSeconds()).toBe(0)
		})

		it('handles expressions with seconds field', () => {
			const interval = parseExpression('30 */5 * * * *', {
				currentDate: new Date('2024-01-15T12:00:00'),
			})

			const next = interval.next()
			expect(next.toDate().getSeconds()).toBe(30)
		})

		it('handles every second', () => {
			const interval = parseExpression('* * * * * *', {
				currentDate: new Date('2024-01-15T12:00:00'),
			})

			const first = interval.next()
			const second = interval.next()

			const diff = second.toDate().getTime() - first.toDate().getTime()
			expect(diff).toBe(1000) // 1 second in milliseconds
		})
	})

	describe('error handling', () => {
		it('throws error for out of range minute values', () => {
			expect(() => parseExpression('60 * * * *')).toThrow()
		})

		it('throws error for out of range hour values', () => {
			expect(() => parseExpression('0 24 * * *')).toThrow()
		})

		it('throws error for out of range day values', () => {
			expect(() => parseExpression('0 0 32 * *')).toThrow()
			expect(() => parseExpression('0 0 0 * *')).toThrow()
		})

		it('throws error for out of range month values', () => {
			expect(() => parseExpression('0 0 1 13 *')).toThrow()
			expect(() => parseExpression('0 0 1 0 *')).toThrow()
		})

		it('throws error for out of range day of week values', () => {
			expect(() => parseExpression('0 0 * * 8')).toThrow()
		})

		it('throws error for malformed expressions', () => {
			expect(() => parseExpression('not a cron')).toThrow()
			expect(() => parseExpression('* *')).toThrow()
		})

		it('handles empty string as valid default', () => {
			// Empty string defaults to '* * * * *'
			const interval = parseExpression('')
			expect(interval.stringify()).toBe('* * * * *')
		})

		it('throws error for invalid step values', () => {
			expect(() => parseExpression('*/0 * * * *')).toThrow()
		})

		it('throws error when endDate is reached', () => {
			const interval = parseExpression('0 0 * * *', {
				currentDate: new Date('2024-01-15'),
				endDate: new Date('2024-01-16'),
			})

			interval.next() // 2024-01-16
			expect(() => interval.next()).toThrow()
		})
	})

	describe('utility methods', () => {
		it('provides access to expression fields', () => {
			const interval = parseExpression('30 12 * * 1-5')
			const fields = interval.fields

			expect(fields.minute).toBeDefined()
			expect(fields.hour).toBeDefined()
			expect(fields.dayOfMonth).toBeDefined()
			expect(fields.month).toBeDefined()
			expect(fields.dayOfWeek).toBeDefined()
		})

		it('converts expression to string with stringify()', () => {
			const interval = parseExpression('30 12 * * 1-5')
			expect(interval.stringify()).toBe('30 12 * * 1-5')
		})

		it('stringify() optimizes expressions', () => {
			// Library optimizes 0,15,30,45 to */15
			const interval = parseExpression('0,15,30,45 9-17 1,15 * 1-5')
			expect(interval.stringify()).toBe('*/15 9-17 1,15 * 1-5')
		})

		it('checks if date matches expression with includesDate()', () => {
			const interval = parseExpression('30 12 * * 1-5') // 12:30 on weekdays

			const monday = new Date('2024-01-15T12:30:00') // Monday at 12:30
			const saturday = new Date('2024-01-13T12:30:00') // Saturday at 12:30
			const mondayWrongTime = new Date('2024-01-15T13:30:00') // Monday at 13:30

			expect(interval.includesDate(monday)).toBe(true)
			expect(interval.includesDate(saturday)).toBe(false)
			expect(interval.includesDate(mondayWrongTime)).toBe(false)
		})

		it('includesDate() works with complex expressions', () => {
			const interval = parseExpression('*/15 * * * *') // Every 15 minutes

			expect(interval.includesDate(new Date('2024-01-15T12:00:00'))).toBe(true)
			expect(interval.includesDate(new Date('2024-01-15T12:15:00'))).toBe(true)
			expect(interval.includesDate(new Date('2024-01-15T12:30:00'))).toBe(true)
			expect(interval.includesDate(new Date('2024-01-15T12:45:00'))).toBe(true)
			expect(interval.includesDate(new Date('2024-01-15T12:10:00'))).toBe(false)
		})
	})

	describe('performance', () => {
		it('handles many iterations efficiently', () => {
			const interval = parseExpression('* * * * *')
			const iterations = 1000

			const dates = Array.from({ length: iterations }, () => interval.next())
			expect(dates.length).toBe(iterations)
		})

		it('handles complex expressions efficiently', () => {
			const interval = parseExpression('5,10,15,20 9-17 1-15,20-25 1,6,12 1-5', {
				currentDate: new Date('2024-01-01'),
			})

			const dates = Array.from({ length: 100 }, () => interval.next())
			expect(dates.length).toBe(100)
		})
	})

	describe('real-world scenarios', () => {
		it('runs every weekday at 9 AM', () => {
			const interval = parseExpression('0 9 * * 1-5', {
				currentDate: new Date('2024-01-15T08:00:00'),
			})

			const dates = Array.from({ length: 5 }, () => interval.next().toDate())
			dates.forEach((date) => {
				expect(date.getHours()).toBe(9)
				expect(date.getMinutes()).toBe(0)
				const day = date.getDay()
				expect(day).toBeGreaterThanOrEqual(1)
				expect(day).toBeLessThanOrEqual(5)
			})
		})

		it('runs every 15 minutes during business hours', () => {
			const interval = parseExpression('*/15 9-17 * * 1-5', {
				currentDate: new Date('2024-01-15T08:00:00'),
			})

			const next = interval.next()
			expect([0, 15, 30, 45]).toContain(next.toDate().getMinutes())
			expect(next.toDate().getHours()).toBeGreaterThanOrEqual(9)
			expect(next.toDate().getHours()).toBeLessThanOrEqual(17)
		})

		it('runs on the first day of every quarter', () => {
			const interval = parseExpression('0 0 1 1,4,7,10 *', {
				currentDate: new Date('2023-12-15'),
			})

			const dates = Array.from({ length: 4 }, () => interval.next().toDate())
			const months = dates.map((d) => d.getMonth())
			expect(months).toEqual([0, 3, 6, 9]) // Jan, Apr, Jul, Oct
			dates.forEach((date) => expect(date.getDate()).toBe(1))
		})

		it('runs at specific times on specific days', () => {
			// Every Monday and Friday at 8:30 AM
			const interval = parseExpression('30 8 * * 1,5', {
				currentDate: new Date('2024-01-15T00:00:00'),
			})

			const dates = Array.from({ length: 10 }, () => interval.next().toDate())
			dates.forEach((date) => {
				expect(date.getHours()).toBe(8)
				expect(date.getMinutes()).toBe(30)
				expect([1, 5]).toContain(date.getDay())
			})
		})

		it('runs on last day of every month at midnight', () => {
			const interval = parseExpression('0 0 L * *', {
				currentDate: new Date('2024-01-01'),
			})

			const dates = Array.from({ length: 12 }, () => interval.next().toDate())
			const lastDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] // 2024 is leap year

			dates.forEach((date, index) => {
				expect(date.getDate()).toBe(lastDays[index])
				expect(date.getHours()).toBe(0)
				expect(date.getMinutes()).toBe(0)
			})
		})
	})
})
