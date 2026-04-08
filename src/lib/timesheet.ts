/**
 * Dummy Timesheet Generation System
 * Generates timesheet data at runtime based on joining_date and hours_per_day
 * NO DATABASE STORAGE - all calculated on-the-fly
 */

import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  isFuture,
  isToday,
  isBefore,
  differenceInDays,
} from 'date-fns';

export interface TimesheetEntry {
  date: string; // YYYY-MM-DD
  day_of_week: string; // "Monday", "Tuesday", etc.
  hours: number;
  status: 'present';
}

export interface TimesheetSummary {
  total_hours_worked: number;
  working_days_so_far: number;
  expected_working_days: number;
}

/**
 * Generate all timesheet entries for an employee
 * @param joining_date - ISO date string (YYYY-MM-DD) when employee joined
 * @param hours_per_day - Number of hours per day (default: 8)
 * @returns Array of timesheet entries from joining_date to yesterday (weekdays only)
 */
export function generateTimesheetEntries(
  joining_date: string | null,
  hours_per_day?: number | null
): TimesheetEntry[] {
  // Edge case: no joining date
  if (!joining_date) {
    return [];
  }

  const joiningDate = new Date(joining_date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  // Edge case: joining date is today or in the future
  if (isFuture(joiningDate) || isToday(joiningDate)) {
    return [];
  }

  // Edge case: joining date is after yesterday
  if (!isBefore(joiningDate, yesterday)) {
    return [];
  }

  // Default hours to 8 if null or 0
  const hours = hours_per_day && hours_per_day > 0 ? hours_per_day : 8;

  // Generate all dates from joining_date to yesterday
  const dateRange = eachDayOfInterval({
    start: joiningDate,
    end: yesterday,
  });

  // Filter to weekdays only and create entries
  const entries: TimesheetEntry[] = dateRange
    .filter((date) => !isWeekend(date)) // Skip Saturdays and Sundays
    .map((date) => ({
      date: format(date, 'yyyy-MM-dd'),
      day_of_week: format(date, 'EEEE'), // Full day name
      hours: hours,
      status: 'present' as const,
    }));

  // Sort ascending (oldest first)
  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate summary statistics for a period
 * @param entries - All timesheet entries
 * @param period - "week" or "month"
 * @param selectedDate - Optional date to calculate for (defaults to today)
 * @returns Summary object with totals and counts
 */
export function calculateSummary(
  entries: TimesheetEntry[],
  period: 'week' | 'month',
  selectedDate?: Date
): TimesheetSummary {
  const referenceDate = selectedDate || new Date();
  let filteredEntries: TimesheetEntry[];
  let expectedDays: number;

  if (period === 'week') {
    // Current calendar week (Monday to Friday)
    const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 }); // Sunday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Filter entries in this week
    filteredEntries = entries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });

    // Count expected working days (Mon-Fri) up to yesterday
    const endDate = isBefore(yesterday, weekEnd) ? yesterday : weekEnd;
    const daysInRange = eachDayOfInterval({ start: weekStart, end: endDate });
    expectedDays = daysInRange.filter((d) => !isWeekend(d)).length;
  } else {
    // Current calendar month
    const monthStart = startOfMonth(referenceDate);
    const monthEnd = endOfMonth(referenceDate);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Filter entries in this month
    filteredEntries = entries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= monthStart && entryDate <= monthEnd;
    });

    // Count expected working days (Mon-Fri) up to yesterday
    const endDate = isBefore(yesterday, monthEnd) ? yesterday : monthEnd;
    const daysInRange = eachDayOfInterval({ start: monthStart, end: endDate });
    expectedDays = daysInRange.filter((d) => !isWeekend(d)).length;
  }

  return {
    total_hours_worked: filteredEntries.reduce((sum, e) => sum + e.hours, 0),
    working_days_so_far: filteredEntries.length,
    expected_working_days: expectedDays,
  };
}

/**
 * Get entries for a specific month
 * @param entries - All timesheet entries
 * @param year - Year (e.g., 2024)
 * @param month - Month (0-11, where 0 = January)
 * @returns Filtered entries for that month
 */
export function getEntriesForMonth(
  entries: TimesheetEntry[],
  year: number,
  month: number
): TimesheetEntry[] {
  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = endOfMonth(new Date(year, month));

  return entries.filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate >= monthStart && entryDate <= monthEnd;
  });
}

/**
 * Get entries for a specific week
 * @param entries - All timesheet entries
 * @param weekStartDate - Start of the week (Monday)
 * @returns Filtered entries for that week
 */
export function getEntriesForWeek(
  entries: TimesheetEntry[],
  weekStartDate: Date
): TimesheetEntry[] {
  const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });

  return entries.filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate >= weekStart && entryDate <= weekEnd;
  });
}

/**
 * Calculate monthly total for a specific month
 * @param entries - All timesheet entries
 * @param year - Year
 * @param month - Month (0-11)
 * @returns Total hours for that month
 */
export function calculateMonthlyTotal(
  entries: TimesheetEntry[],
  year: number,
  month: number
): number {
  const monthEntries = getEntriesForMonth(entries, year, month);
  return monthEntries.reduce((sum, e) => sum + e.hours, 0);
}
