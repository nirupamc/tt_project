# Assigned Date & Tenure-Based Projects Feature

> **🆕 UPDATE**: Feature 1 now includes a **Custom Start Date Picker**! Admins can select any past date when assigning projects. If you assign with a date from 2 months ago, all those days unlock immediately! See [CUSTOM_START_DATE_FEATURE.md](./CUSTOM_START_DATE_FEATURE.md) for full details.

This document explains two key features in the TanTech Upskill platform:

1. **Active Project Start Date (assigned_date with custom date picker)**
2. **Completed Dummy Projects Based on Tenure**

---

## Feature 1: Active Project Start Date

### Overview

When an admin assigns a project to an employee, they can **choose a custom start date** using a date picker. If a past date is selected (e.g., February 2nd), **all days from that date until today will be unlocked immediately**.

### How It Works

#### 1. Assignment Process

- When admin assigns a project via `/admin/projects/[id]`, the `AssignEmployeeModal` captures the current date
- This date is stored as `start_date` in the `enrollments` table
- **Important**: `enrollment.start_date` IS the `assigned_date`

#### 2. Day Counting Logic

- All day unlock calculations use `enrollment.start_date` as Day 1
- The employee project detail page uses `enrollment_start_date` for day calculations
- The Central Time calculation logic in `src/lib/day-unlock.ts` uses this date

#### 3. Display to Employee

- Project cards show the assigned date (calendar icon)
- Project detail page shows "Started [date]" using the assigned_date

### Implementation Files

**API:**

- `src/app/api/admin/projects/[id]/enrollments/route.ts` - Creates enrollment with start_date
- `src/app/api/employee/projects/route.ts` - Returns assigned_date with each project
- `src/app/api/employee/projects/[id]/route.ts` - Returns enrollment_start_date

**Frontend:**

- `src/components/admin/AssignEmployeeModal.tsx` - Sets assigned_date = today when assigning
- `src/components/employee/ProjectCard.tsx` - Displays assigned_date
- `src/app/dashboard/projects/[id]/page.tsx` - Uses enrollment_start_date for day calculations

### Key Rules

✅ **DO:**

- Use `enrollment.start_date` as the source of truth for Day 1
- Set `start_date = current date` when admin assigns project
- Show assigned_date on employee project cards

❌ **DON'T:**

- Use employee's `joining_date` for active project calculations
- Use employee's `default_start_date` for assignments
- Use project's global `start_date` field for per-employee logic

### Fallback Behavior

If `enrollment.start_date` is missing (should never happen), the system falls back to today's date and logs a warning:

```javascript
console.warn(
  `Missing assigned_date for enrollment ${enrollment.id}, falling back to today`,
);
```

---

## Feature 2: Completed Dummy Projects Based on Tenure

### Overview

Employees who joined before the platform existed should see "completed" historical projects on their dashboard, representing the learning they would have done. These projects are:

- **Not stored in the database** - calculated on-the-fly
- **Greyed out and locked** - no interaction possible
- **Based on tenure** - calculated from `joining_date`

### How It Works

#### 1. Tenure Calculation

The system calculates **whole months** between the employee's `joining_date` and today:

```javascript
tenure_months = monthDifference(joining_date, today);
```

#### 2. Project Assignment by Tenure

| Tenure      | Completed Projects Shown                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| < 2 months  | None (too new)                                                                                                                                        |
| 2-4 months  | 1. Onboarding Essentials (2 months)                                                                                                                   |
| 5-8 months  | 1. Onboarding Essentials (2 months)<br>2. Role Foundations (3 months)                                                                                 |
| 9-12 months | 1. Onboarding Essentials (2 months)<br>2. Role Foundations (3 months)<br>3. Core Skills Development (4 months)                                        |
| 13+ months  | 1. Onboarding Essentials (2 months)<br>2. Role Foundations (3 months)<br>3. Core Skills Development (4 months)<br>4. Advanced Practitioner (4 months) |

**Maximum**: 4 completed projects, regardless of tenure.

#### 3. Dummy Project Details

**Onboarding Essentials** (2 months)

- Title: "Onboarding Essentials"
- Description: "Foundational training completed during your first two months at TanTech."
- Status: Completed

**Role Foundations** (3 months)

- Title: "Role Foundations"
- Description: "Core role-specific skills and competencies developed during months 3-5."
- Status: Completed

**Core Skills Development** (4 months)

- Title: "Core Skills Development"
- Description: "Advanced skill building and practical application completed in months 6-9."
- Status: Completed

**Advanced Practitioner** (4 months)

- Title: "Advanced Practitioner"
- Description: "Expert-level training and leadership development from months 10-13."
- Status: Completed

### Implementation Files

**Backend:**

- `src/lib/completed-projects.ts` - `getCompletedDummyProjects()` helper function
- `src/app/api/employee/projects/route.ts` - Fetches joining_date and merges dummy projects

**Types:**

- `src/types/index.ts` - `CompletedDummyProject` interface

**Frontend:**

- `src/components/employee/ProjectCard.tsx` - Renders completed vs active cards
- `src/app/dashboard/page.tsx` - Sorts projects (completed first)

**Database:**

- `supabase/migrations/add_joining_date.sql` - Adds joining_date column to users table

### Completed Card UI Specifications

**Visual Style:**

- Greyed out: `opacity: 0.6` + slight grayscale filter
- Non-interactive: `pointer-events: none`
- No hover effects

**Content:**

- ✅ Green "COMPLETED" badge at top
- ✅ Duration display: "2 months", "3 months", etc.
- ✅ 100% progress bar (green instead of gold)
- ✅ Locked button with lock icon
- ❌ NO calendar icon or dates shown
- ❌ NO "Continue Learning" button

**Progress Bar:**

- Always 100% full
- Color: `bg-green-500` (not gold)
- Background: `bg-[rgba(34,197,94,0.1)]`

**Locked Button:**

- Icon: Lock (Lucide React)
- Text: "LOCKED"
- Style: Greyed background, disabled state

### Dashboard Ordering

Projects are displayed in this order:

1. **Completed dummy projects** (oldest first)
   - Onboarding Essentials
   - Role Foundations
   - Core Skills Development
   - Advanced Practitioner
2. **Active assigned projects** (newest first by assigned_date)

Sorting logic in `src/app/dashboard/page.tsx`:

```javascript
const sortedProjects = data.sort((a, b) => {
  const aIsDummy = "is_dummy" in a && a.is_dummy;
  const bIsDummy = "is_dummy" in b && b.is_dummy;

  // Completed first
  if (aIsDummy && !bIsDummy) return -1;
  if (!aIsDummy && bIsDummy) return 1;

  // Both completed - maintain order
  if (aIsDummy && bIsDummy) return 0;

  // Both active - newest first
  return b.assigned_date.localeCompare(a.assigned_date);
});
```

---

## Database Schema

### Enrollments Table

```sql
enrollments
  - id (uuid)
  - user_id (uuid) → users.id
  - project_id (uuid) → projects.id
  - start_date (date)  ← This is the assigned_date
  - enrolled_at (timestamp)
```

### Users Table

```sql
users
  - id (uuid)
  - name (text)
  - email (text)
  - role (text)
  - joining_date (date)  ← NEW: Used for tenure calculation
  - created_at (timestamp)
```

---

## Setup Instructions

### 1. Run Database Migration

Execute the SQL migration to add `joining_date` column:

```bash
# In Supabase SQL Editor
-- Run: supabase/migrations/add_joining_date.sql
```

### 2. Set Joining Dates for Existing Employees

Update existing employee records with their actual joining dates:

```sql
UPDATE public.users
SET joining_date = '2023-01-15'  -- Replace with actual date
WHERE email = 'employee@example.com';
```

### 3. Set Joining Date for New Employees

When creating new employees via the admin panel, ensure `joining_date` is set.

### 4. Test the Features

1. Assign a project to an employee → verify assigned_date is set to today
2. Set an employee's `joining_date` to 15 months ago → verify 4 completed projects appear
3. Set another employee's `joining_date` to 1 month ago → verify no completed projects appear

---

## Key Differences: joining_date vs assigned_date

| Field                                    | Purpose                      | Used For                                                        |
| ---------------------------------------- | ---------------------------- | --------------------------------------------------------------- |
| `users.joining_date`                     | When employee joined company | Tenure calculation, dummy projects count                        |
| `enrollments.start_date` (assigned_date) | When admin assigned project  | Day 1 counting, project unlock logic, active project start date |

**Rule**: `joining_date` is ONLY used for dummy project calculation. Active projects ALWAYS use `assigned_date`.

---

## Testing Scenarios

### Scenario 1: New Employee

- joining_date: Today
- Expected: No completed projects, active projects start from assignment date

### Scenario 2: 3-Month Employee

- joining_date: 3 months ago
- Expected: 1 completed project (Onboarding Essentials)

### Scenario 3: 1-Year Employee

- joining_date: 12 months ago
- Expected: 3 completed projects (Onboarding, Role Foundations, Core Skills)

### Scenario 4: 2-Year Employee

- joining_date: 24 months ago
- Expected: 4 completed projects (max cap), all active projects use assigned_date

---

## Troubleshooting

### Completed projects not showing

- Check if `joining_date` is set on user profile
- Verify tenure is ≥ 2 months
- Check browser console for errors
- Verify API response includes dummy projects

### Active project starts from wrong date

- Verify `enrollment.start_date` exists in database
- Check `AssignEmployeeModal.tsx` sets today's date
- Look for fallback warning in logs
- Confirm `enrollment_start_date` is returned by API

### Completed card not greyed out

- Verify `is_dummy: true` in project object
- Check CSS styles in `ProjectCard.tsx`
- Ensure `pointer-events: none` is applied

---

## API Response Examples

### Employee Projects API Response

```json
[
  {
    "id": "dummy-onboarding",
    "title": "Onboarding Essentials",
    "description": "Foundational training completed during your first two months at TanTech.",
    "duration_months": 2,
    "status": "completed",
    "progress": 100,
    "is_dummy": true
  },
  {
    "id": "uuid-123",
    "title": "React Fundamentals",
    "description": "Learn React from scratch",
    "total_days": 30,
    "assigned_date": "2024-01-15",
    "progress": {
      "completed_days": 12,
      "total_days": 30
    },
    "is_dummy": false
  }
]
```

---

## Files Changed

### Backend

- ✅ `src/app/api/employee/projects/route.ts` - Fetch joining_date, merge dummy projects
- ✅ `src/app/api/employee/projects/[id]/route.ts` - Add comment clarifying assigned_date
- ✅ `src/app/api/admin/projects/[id]/enrollments/route.ts` - Already saves start_date
- ✅ `src/lib/completed-projects.ts` - Dummy project generation logic
- ✅ `src/types/index.ts` - CompletedDummyProject interface

### Frontend

- ✅ `src/components/admin/AssignEmployeeModal.tsx` - Set assigned_date = today
- ✅ `src/components/employee/ProjectCard.tsx` - Render completed vs active cards
- ✅ `src/app/dashboard/page.tsx` - Sort projects (completed first)

### Database

- ✅ `supabase/migrations/add_joining_date.sql` - Add joining_date column

---

## Summary

**Feature 1: Assigned Date**

- Projects start from assignment date (when admin assigns)
- Stored as `enrollment.start_date`
- Used for all day counting and unlock logic

**Feature 2: Completed Projects**

- Calculated from `joining_date` (not stored in DB)
- Shows 0-4 projects based on tenure months
- Displayed first, greyed out, locked, 100% complete
- No interaction - visual representation only
