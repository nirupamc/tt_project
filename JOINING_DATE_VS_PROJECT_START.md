# Joining Date vs Project Start Date - Complete Guide

## Overview

This document clarifies the difference between two important dates in the TanTech Upskill system:

1. **Joining Date** - When employee joined the company (for tenure calculation)
2. **Project Start Date** - When admin assigns a specific project (for day unlock)

---

## The Two Dates Explained

### 1. Joining Date (`users.joining_date`)

**What it is:**

- The date when the employee joined the company
- Set once when creating the employee profile
- Used to calculate tenure (how long they've been with the company)

**Where it's set:**

- Admin panel → Create New Employee modal
- Field label: "Joining Date"
- Defaults to today but can be changed

**What it's used for:**

- **Calculating completed dummy projects**
  - If joined 13+ months ago → sees 4 completed projects
  - If joined 9-12 months ago → sees 3 completed projects
  - If joined 5-8 months ago → sees 2 completed projects
  - If joined 2-4 months ago → sees 1 completed project
  - If joined < 2 months ago → sees 0 completed projects

**Example:**

- Employee joined company on **January 1, 2025**
- Today is April 8, 2026
- Tenure = 15 months
- **Result**: Shows 4 completed dummy projects on their dashboard

### 2. Project Start Date (`enrollments.start_date`)

**What it is:**

- The date when admin assigns a specific project to an employee
- Set each time a project is assigned
- Controls when project days unlock

**Where it's set:**

- Admin panel → Project detail page → Assign Employees modal
- Field label: "Project Start Date"
- Defaults to today but can be changed to any past date

**What it's used for:**

- **Day unlock calculation for that specific project**
  - If start_date = Feb 1, 2026 and today = April 8, 2026
  - Days passed = 66 days
  - **Result**: Days 1-66 are unlocked immediately

**Example:**

- Project assigned on **February 1, 2026**
- Today is April 8, 2026
- Days since start = 66 days
- **Result**: Employee can access Days 1-66 of this project

---

## Visual Comparison

| Aspect               | Joining Date                                  | Project Start Date               |
| -------------------- | --------------------------------------------- | -------------------------------- |
| **Database Column**  | `users.joining_date`                          | `enrollments.start_date`         |
| **Scope**            | Company-wide (one per employee)               | Per project (many per employee)  |
| **Set When**         | Creating employee                             | Assigning project                |
| **Set Where**        | Create Employee modal                         | Assign Employees modal           |
| **Purpose**          | Calculate tenure                              | Unlock project days              |
| **Affects**          | Completed dummy projects                      | Active project progress          |
| **Can be Past Date** | ✅ Yes (for retroactive hire)                 | ✅ Yes (for catch-up)            |
| **Example Use**      | "Show completed projects for 1-year employee" | "Unlock 60 days for late joiner" |

---

## UI Changes Made

### Before (Confusing)

**Create Employee Modal:**

- Field: "DEFAULT START DATE"
- Label text: "Used as default when assigning to projects"
- Problem: Confused joining date with project start date

**Assign Employees Modal:**

- No date picker
- Always used today's date
- Problem: Couldn't assign retroactively

### After (Clear)

**Create Employee Modal:**

- Field: **"JOINING DATE"**
- Label text: "Date employee joined the company (used for tenure calculation)"
- Saves to: `users.joining_date`

**Assign Employees Modal:**

- Field: **"PROJECT START DATE"**
- Label text: "All days from this date until today will be unlocked immediately."
- Saves to: `enrollments.start_date`

---

## Complete Flow Example

### Scenario: New Employee Who Joined 1 Year Ago

**Step 1: Create Employee (Admin)**

1. Navigate to Admin → Employees → Create New Employee
2. Fill in employee details:
   - Name: "John Doe"
   - Email: "john@example.com"
   - Password: "**\*\*\*\***"
   - Hours per day: 8
   - Hourly rate: $25
   - **Joining Date: April 8, 2025** (1 year ago)
3. Click "Create Employee"

**Result:**

- Employee created with `joining_date = 2025-04-08`
- Tenure = 12 months
- **3 completed dummy projects** will appear on their dashboard:
  1. Onboarding Essentials (2 months) - COMPLETED
  2. Role Foundations (3 months) - COMPLETED
  3. Core Skills Development (4 months) - COMPLETED

**Step 2: Assign Project (Admin)**

1. Navigate to Admin → Projects → Select a project
2. Click "Assign Employees"
3. Select "John Doe"
4. Set **Project Start Date: February 1, 2026** (2 months ago)
5. Click "Assign"

**Result:**

- Enrollment created with `start_date = 2026-02-01`
- Days passed = 66 days (Feb 1 to April 8)
- **Days 1-66 unlock immediately** for this project

**Step 3: Employee Dashboard (Employee View)**
When John logs in, he sees:

1. **3 Completed Projects** (greyed out, locked):
   - Onboarding Essentials
   - Role Foundations
   - Core Skills Development
2. **1 Active Project**:
   - Started Feb 1, 2026
   - 0% complete (hasn't started yet)
   - Days 1-66 unlocked and ready to access

---

## Database Schema

### Users Table

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  joining_date DATE,  -- NEW: When employee joined company
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enrollments Table

```sql
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  start_date DATE,  -- When admin assigned this project
  enrolled_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Migration Instructions

### Run This SQL in Supabase:

```sql
-- Add joining_date column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS joining_date DATE;

-- Add comment explaining the field
COMMENT ON COLUMN public.users.joining_date IS 'Date when employee joined the company (payroll start date). Used to calculate tenure and show historical completed projects.';
```

### Update Existing Employees:

```sql
-- Set joining_date for existing employees
-- Replace with actual dates
UPDATE public.users
SET joining_date = '2025-01-15'
WHERE email = 'employee@example.com' AND joining_date IS NULL;

-- Or set all to a default (1 year ago)
UPDATE public.users
SET joining_date = CURRENT_DATE - INTERVAL '1 year'
WHERE role = 'employee' AND joining_date IS NULL;
```

---

## Code Changes Summary

### Files Modified:

1. **`src/components/admin/CreateEmployeeModal.tsx`**
   - Renamed `default_start_date` → `joining_date`
   - Updated label: "DEFAULT START DATE" → "JOINING DATE"
   - Updated help text to explain tenure calculation
   - Added max date validation (cannot be future)

2. **`src/app/api/admin/employees/route.ts`**
   - Changed parameter: `default_start_date` → `joining_date`
   - Updated insert to save `joining_date` field

3. **`src/app/admin/employees/[id]/page.tsx`**
   - Updated display: "Starts" → "Joined"
   - Changed field reference: `default_start_date` → `joining_date`

4. **`src/components/admin/AssignEmployeeModal.tsx`**
   - Already updated in previous feature
   - Has custom `start_date` picker for project assignment

5. **`src/app/api/employee/projects/route.ts`**
   - Already fetches `joining_date`
   - Already calls `getCompletedDummyProjects(joining_date)`

### No Changes Needed:

- `src/types/index.ts` - Already has both `default_start_date` and `joining_date`
- `src/lib/completed-projects.ts` - Already uses `joining_date`
- `src/lib/day-unlock.ts` - Already uses `enrollment.start_date`

---

## Testing Checklist

### Test 1: Create New Employee

- [ ] Create employee with joining_date = 1 year ago
- [ ] Verify field label says "Joining Date"
- [ ] Verify help text mentions tenure
- [ ] Verify employee profile shows "Joined" date

### Test 2: Completed Projects Display

- [ ] Log in as employee who joined 15 months ago
- [ ] Verify 4 completed dummy projects appear
- [ ] Verify projects are greyed out and locked
- [ ] Verify green "COMPLETED" badge shows

### Test 3: Assign Project with Custom Start Date

- [ ] Assign project with start_date = 2 months ago
- [ ] Verify date picker shows in Assign modal
- [ ] Verify label says "Project Start Date"
- [ ] Verify all days from that date unlock

### Test 4: Day Unlock Calculation

- [ ] Employee assigned project 30 days ago
- [ ] Verify Days 1-30 are unlocked
- [ ] Verify Day 31 is locked
- [ ] Verify unlock based on enrollment start_date, not joining_date

### Test 5: Existing Employees (After Migration)

- [ ] Run migration to add joining_date column
- [ ] Set joining_date for existing employees
- [ ] Verify completed projects appear
- [ ] Verify existing enrollments still work

---

## Troubleshooting

### Problem: Completed projects not showing

**Check:**

1. Has `joining_date` column been added? Run migration
2. Is `joining_date` set for this employee?
3. Is tenure ≥ 2 months?
4. Check browser console for errors
5. Verify API returns dummy projects in response

**Solution:**

```sql
-- Check if column exists
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'joining_date';

-- Set joining_date if missing
UPDATE public.users
SET joining_date = '2025-01-01'
WHERE id = 'user-uuid' AND joining_date IS NULL;
```

### Problem: Days not unlocking correctly

**Check:**

1. Is `enrollment.start_date` set correctly?
2. Check day unlock logs in browser console
3. Verify timezone is Central Time
4. Ensure unlock time is 9:00 AM CT

**Solution:**

- Check enrollment record in database
- Use debug endpoint: `/api/debug/day-unlock?projectId=xxx`

### Problem: "Joining Date" field not showing

**Check:**

1. Hard refresh browser (Ctrl+F5)
2. Check if build succeeded
3. Verify component imports

**Solution:**

```bash
npm run build
```

---

## API Examples

### Create Employee with Joining Date

**POST** `/api/admin/employees`

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "hours_per_day": 8,
  "hourly_rate": 25,
  "joining_date": "2025-01-15"
}
```

**Response:**

```json
{
  "id": "uuid-123",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "employee",
  "joining_date": "2025-01-15",
  "created_at": "2026-04-08T12:00:00Z"
}
```

### Get Employee Projects (with Completed Dummy Projects)

**GET** `/api/employee/projects`

**Response:**

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
    "id": "uuid-project",
    "title": "React Fundamentals",
    "assigned_date": "2026-02-01",
    "progress": {
      "completed_days": 0,
      "total_days": 30
    },
    "is_dummy": false
  }
]
```

---

## Summary

✅ **What Changed:**

- "DEFAULT START DATE" → **"JOINING DATE"** (in Create Employee)
- Joining date used for tenure calculation
- Project start date set in Assign modal (separate)
- Completed dummy projects now show based on joining_date

✅ **How It Works:**

1. Admin creates employee with **joining_date** (when they joined company)
2. System calculates tenure from joining_date
3. System shows 0-4 completed dummy projects based on tenure
4. Admin assigns project with **start_date** (when project begins)
5. System unlocks days from start_date to today

✅ **Result:**

- Clear separation between company joining date and project start date
- Employees see historical completed projects
- Projects can be assigned retroactively with past start dates
- Everything is tracked correctly!
