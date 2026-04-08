import type { CompletedDummyProject } from "@/types";

/**
 * Calculate the number of whole months between two dates
 */
function getMonthsDifference(startDate: Date, endDate: Date): number {
  const yearDiff = endDate.getFullYear() - startDate.getFullYear();
  const monthDiff = endDate.getMonth() - startDate.getMonth();
  return yearDiff * 12 + monthDiff;
}

/**
 * Generate dummy completed projects based on employee tenure
 * These are NOT stored in the database - calculated on-the-fly
 * 
 * @param joiningDate - Employee's joining_date (ISO string or null)
 * @returns Array of completed dummy projects (0-4 max)
 */
export function getCompletedDummyProjects(
  joiningDate: string | null
): CompletedDummyProject[] {
  // If no joining date, return empty array
  if (!joiningDate) {
    return [];
  }

  const joining = new Date(joiningDate);
  const today = new Date();
  
  // Calculate tenure in whole months
  const tenureMonths = getMonthsDifference(joining, today);

  // Determine completed projects based on tenure
  const completedProjects: CompletedDummyProject[] = [];

  if (tenureMonths < 2) {
    // Too new - no completed projects
    return [];
  }

  if (tenureMonths >= 2) {
    completedProjects.push({
      id: 'dummy-onboarding',
      title: 'Onboarding Essentials',
      description: 'Foundational training completed during your first two months at Archway.',
      duration_months: 2,
      status: 'completed',
      progress: 100,
      is_dummy: true,
    });
  }

  if (tenureMonths >= 5) {
    completedProjects.push({
      id: 'dummy-role-foundations',
      title: 'Role Foundations',
      description: 'Core role-specific skills and competencies developed during months 3-5.',
      duration_months: 3,
      status: 'completed',
      progress: 100,
      is_dummy: true,
    });
  }

  if (tenureMonths >= 9) {
    completedProjects.push({
      id: 'dummy-core-skills',
      title: 'Core Skills Development',
      description: 'Advanced skill building and practical application completed in months 6-9.',
      duration_months: 4,
      status: 'completed',
      progress: 100,
      is_dummy: true,
    });
  }

  if (tenureMonths >= 13) {
    completedProjects.push({
      id: 'dummy-advanced',
      title: 'Advanced Practitioner',
      description: 'Expert-level training and leadership development from months 10-13.',
      duration_months: 4,
      status: 'completed',
      progress: 100,
      is_dummy: true,
    });
  }

  // Cap at 4 completed projects maximum
  return completedProjects.slice(0, 4);
}
