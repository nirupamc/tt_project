/**
 * Day unlock logic for TanTech Upskill projects
 * Days unlock at 9:00 AM Central Time (CT) based on project start date
 */

const FORCE_UNLOCK_FOR_TESTING = false;

/**
 * Calculate how many days have unlocked for a project
 * @param startDate - Project start date in yyyy-MM-dd format
 * @param totalDays - Total number of days in the project
 * @returns Number of unlocked days (minimum 0)
 */
export function getUnlockedDayCount(startDate: string, totalDays: number): number {
  console.log('[day-unlock] startDate received:', startDate);
  console.log('[day-unlock] totalDays:', totalDays);
  console.log('[day-unlock] now UTC:', new Date().toISOString());
  
  if (FORCE_UNLOCK_FOR_TESTING) {
    console.log('[day-unlock] FORCE UNLOCK enabled - returning totalDays:', totalDays);
    return totalDays;
  }
  
  if (!startDate) return 0;
  
  const now = new Date();
  
  // Get current date and time in CT
  const ctFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const ctParts = ctFormatter.formatToParts(now);
  const ctYear = parseInt(ctParts.find(p => p.type === 'year')!.value);
  const ctMonth = parseInt(ctParts.find(p => p.type === 'month')!.value);
  const ctDay = parseInt(ctParts.find(p => p.type === 'day')!.value);
  const ctHour = parseInt(ctParts.find(p => p.type === 'hour')!.value);
  const ctMinute = parseInt(ctParts.find(p => p.type === 'minute')!.value);
  
  console.log('[day-unlock] CT date:', `${ctYear}-${ctMonth}-${ctDay}`);
  console.log('[day-unlock] CT hour:', ctHour, 'CT minute:', ctMinute);
  
  // Parse start date as plain calendar date (no timezone)
  const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
  
  let unlockedCount = 0;
  
  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    // Calculate unlock date for this day (startDate + dayNum - 1 days)
    const unlockDate = new Date(sYear, sMonth - 1, sDay + (dayNum - 1));
    const unlockYear = unlockDate.getFullYear();
    const unlockMonth = unlockDate.getMonth() + 1;
    const unlockDay = unlockDate.getDate();
    
    // A day is unlocked if current CT datetime >= unlock date at 9:00 AM CT
    const isUnlocked =
      ctYear > unlockYear ||
      (ctYear === unlockYear && ctMonth > unlockMonth) ||
      (ctYear === unlockYear && ctMonth === unlockMonth && ctDay > unlockDay) ||
      (ctYear === unlockYear && ctMonth === unlockMonth && ctDay === unlockDay && ctHour >= 9);
    
    console.log(`[day-unlock] Day ${dayNum} unlock date: ${unlockYear}-${unlockMonth}-${unlockDay}, isUnlocked: ${isUnlocked}`);
    
    if (isUnlocked) {
      unlockedCount++;
    } else {
      break; // days are sequential, no need to check further
    }
  }
  
  console.log('[day-unlock] final unlockedCount:', unlockedCount);
  
  return unlockedCount;
}

/**
 * Check if a specific day is unlocked
 * @param startDate - Project start date in yyyy-MM-dd format
 * @param dayNumber - The day number to check (1-indexed)
 * @param totalDays - Total number of days in the project
 * @returns true if the day is unlocked, false otherwise
 */
export function isDayUnlocked(startDate: string, dayNumber: number, totalDays: number): boolean {
  return dayNumber <= getUnlockedDayCount(startDate, totalDays);
}
