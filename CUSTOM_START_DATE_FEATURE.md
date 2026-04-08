# Custom Start Date Assignment Feature

## Overview

Admins can now set a **custom start date** when assigning projects to employees. If a past date is selected (e.g., February 2nd), all days from that date until today will be **unlocked immediately** for the employee.

## How It Works

### 1. Admin Assignment Flow

1. Admin clicks "Assign Employees" on a project
2. Modal opens with:
   - **Start Date picker** (defaults to today)
   - Employee selection checkboxes
3. Admin can set any date up to today (cannot set future dates)
4. When assigned, the selected start_date is saved to `enrollments.start_date`

### 2. Day Unlock Calculation

The system uses `getUnlockedDayCount()` from `src/lib/day-unlock.ts`:

**Logic:**

- For each day (Day 1 to Day N):
  - Calculate unlock date = start_date + (day_number - 1) days
  - Check if current CT time >= unlock date at 9:00 AM CT
  - If yes, mark as unlocked
  - Days unlock sequentially

**Example:**

```
Start Date: February 2, 2024
Today: April 8, 2024
Days Passed: 66 days

Result: Days 1-66 are unlocked immediately
```

### 3. Employee Experience

When employee logs in:

- They see all unlocked days available
- Can access any day from Day 1 to current unlocked day
- Days unlock at 9:00 AM Central Time each day going forward

## Use Cases

### Use Case 1: New Employee Starting Today

- Admin assigns with start_date = today
- Only Day 1 is unlocked
- Each day unlocks at 9:00 AM CT

### Use Case 2: Employee Joining Late (Catch-Up Mode)

- Project started Feb 2, 2024
- New employee joins April 8, 2024
- Admin assigns with start_date = Feb 2, 2024
- **Result**: Days 1-66 unlock immediately
- Employee can catch up on all missed content

### Use Case 3: Retroactive Assignment

- Employee worked offline or on paper
- Admin wants to give access to all past days
- Sets start_date to when they actually started
- All days from that date unlock immediately

## UI Components

### Assign Employee Modal

**Location**: `src/components/admin/AssignEmployeeModal.tsx`

**Features:**

- Date picker input (type="date")
- Defaults to today's date
- Max date = today (cannot set future dates)
- Helper text: "All days from this date until today will be unlocked immediately."
- Shows selected start date in success toast

**Styling:**

- Dark theme with gold accents
- Date input matches TanTech brand colors
- Responsive and accessible

## Technical Implementation

### Files Modified

**1. `src/components/admin/AssignEmployeeModal.tsx`**

```typescript
// Added state for custom start date
const [customStartDate, setCustomStartDate] = useState<string>(
  format(new Date(), "yyyy-MM-dd"),
);

// Use custom date instead of hardcoded today
const enrollmentsToCreate = selectedIds.map((userId) => ({
  user_id: userId,
  start_date: customStartDate, // From date picker
}));
```

**2. Date Picker JSX**

```jsx
<Input
  id="start-date"
  type="date"
  value={customStartDate}
  onChange={(e) => setCustomStartDate(e.target.value)}
  max={format(new Date(), "yyyy-MM-dd")}
  className="bg-[#1A1A1A] border-[rgba(255,215,0,0.2)] ..."
/>
```

### Backend (No Changes Needed)

The backend already supports this:

- `POST /api/admin/projects/[id]/enrollments` accepts `start_date` field
- Stores in `enrollments.start_date` column
- Day unlock logic (`src/lib/day-unlock.ts`) already calculates based on this date

### Day Unlock Algorithm

**File**: `src/lib/day-unlock.ts`

**Function**: `getUnlockedDayCount(startDate, totalDays)`

**Logic:**

1. Parse start_date (e.g., "2024-02-02")
2. Get current date/time in Central Time
3. For each day (1 to totalDays):
   - Calculate unlock date = start_date + (day - 1) days
   - Check if current CT >= unlock date at 9:00 AM CT
   - If unlocked, increment count
   - If locked, break (sequential unlock)
4. Return unlocked count

**Example Calculation:**

```javascript
Start Date: 2024-02-02
Current CT: 2024-04-08 14:30 CT

Day 1: unlock = 2024-02-02 09:00 CT → UNLOCKED
Day 2: unlock = 2024-02-03 09:00 CT → UNLOCKED
...
Day 66: unlock = 2024-04-07 09:00 CT → UNLOCKED
Day 67: unlock = 2024-04-08 09:00 CT → UNLOCKED
Day 68: unlock = 2024-04-09 09:00 CT → LOCKED (future)

Result: 67 days unlocked
```

## Testing Scenarios

### Scenario 1: Assign with Today's Date

1. Admin assigns project with start_date = today
2. Employee sees only Day 1 unlocked
3. Tomorrow at 9 AM CT, Day 2 unlocks
   ✅ **Expected**: Progressive unlock

### Scenario 2: Assign with Past Date (30 days ago)

1. Admin assigns project with start_date = 30 days ago
2. Employee logs in immediately
3. Employee sees Days 1-30 unlocked
   ✅ **Expected**: Immediate access to all past days

### Scenario 3: Assign with Past Date (More than total days)

1. Project has 30 total days
2. Admin assigns with start_date = 60 days ago
3. Employee sees all 30 days unlocked
   ✅ **Expected**: All days unlocked (capped at totalDays)

### Scenario 4: Weekdays-Only Project

1. Project has `weekdays_only = true`
2. Admin assigns with start_date = 14 days ago (2 weeks)
3. System unlocks only 10 days (excluding weekends)
   ✅ **Expected**: Weekday logic respected (if implemented)

## Benefits

### For Admins

- Flexibility to assign projects retroactively
- Can bring late joiners up to speed
- Can batch-assign with different start dates

### For Employees

- No waiting for catch-up if joining late
- Can complete missed content at own pace
- Clear visibility of all available days

### For Organization

- More accurate progress tracking
- Better onboarding for late joiners
- Supports flexible learning schedules

## Date Format

**Input**: HTML date picker (browser-native)
**Format**: `yyyy-MM-dd` (ISO 8601)
**Storage**: PostgreSQL `DATE` type
**Display**: Localized via `toLocaleDateString()`

**Example:**

- Input: `<input type="date" value="2024-02-02">`
- Storage: `2024-02-02` (DATE in PostgreSQL)
- Display: `2/2/2024` (US locale) or `02/02/2024` (other locales)

## Constraints

### Date Restrictions

- **Min Date**: None (can set any past date)
- **Max Date**: Today (cannot set future dates)
- **Rationale**: Projects can't start in the future

### Validation

- Frontend: `max={format(new Date(), 'yyyy-MM-dd')}` on input
- Backend: No additional validation (trusts admin input)

### Edge Cases

- **Empty date**: Falls back to today's date
- **Invalid date**: Browser prevents submission
- **Timezone**: System uses Central Time for unlock calculations

## Screenshots

### Before (Old Behavior)

- No date picker
- All assignments used today's date
- No way to assign retroactively

### After (New Behavior)

- Date picker visible in modal
- Admin can select any past date
- Helper text explains unlock behavior

## Migration Notes

### For Existing Enrollments

- Old enrollments have `start_date` = assignment date
- No migration needed
- Behavior unchanged for existing assignments

### For New Enrollments

- All new assignments use custom start_date
- Defaults to today if not changed
- Backward compatible with old logic

## Related Features

### Feature 1: assigned_date Logic

- This IS the assigned_date feature
- Uses `enrollment.start_date` as source of truth
- Day 1 = start_date (not joining_date)

### Feature 2: Completed Dummy Projects

- Uses `users.joining_date` (different field)
- Only for tenure calculation
- Does NOT affect active project day unlock

### Email Reminders

- Daily emails use `enrollment.start_date`
- Only sends if days are unlocked
- Respects custom start dates

## API Reference

### POST `/api/admin/projects/[id]/enrollments`

**Request Body:**

```json
{
  "enrollments": [
    {
      "user_id": "uuid-123",
      "start_date": "2024-02-02"
    }
  ]
}
```

**Response:**

```json
[
  {
    "id": "enrollment-uuid",
    "user_id": "uuid-123",
    "project_id": "project-uuid",
    "start_date": "2024-02-02",
    "enrolled_at": "2024-04-08T12:00:00Z"
  }
]
```

### GET `/api/employee/projects/[id]`

**Response (includes enrollment_start_date):**

```json
{
  "project": {
    "id": "uuid",
    "title": "React Fundamentals",
    "enrollment_start_date": "2024-02-02"
  },
  "days": [...],
  "completed_day_numbers": [1, 2, 3]
}
```

## Troubleshooting

### Days Not Unlocking

**Problem**: Employee assigned with past date but days still locked

**Solutions:**

1. Check timezone - unlock happens at 9 AM CT
2. Verify `enrollment.start_date` in database
3. Check browser console for day-unlock logs
4. Ensure `FORCE_UNLOCK_FOR_TESTING` is false

### Date Picker Not Showing

**Problem**: Date input shows as text field

**Solutions:**

1. Check browser support (all modern browsers support `<input type="date">`)
2. Verify Input component accepts `type="date"` prop
3. Test in different browser

### Future Dates Selectable

**Problem**: Admin can select future dates

**Solutions:**

1. Check `max` attribute on input: `max={format(new Date(), 'yyyy-MM-dd')}`
2. Verify date-fns format is correct
3. Add backend validation if needed

## Future Enhancements

### Potential Improvements

1. **Date Range Assignment**
   - Allow different start dates per employee in same batch
   - Bulk upload CSV with employee + start date

2. **Start Date History**
   - Track if start_date is modified
   - Show audit log of date changes

3. **Smart Suggestions**
   - Suggest start_date based on employee joining_date
   - Warn if start_date is too far in past

4. **Weekday-Only Support**
   - If project has `weekdays_only = true`
   - Skip weekends in unlock calculation

5. **Custom Unlock Times**
   - Allow per-project unlock time (not just 9 AM)
   - Support different timezones

## Summary

✅ **What's New:**

- Custom start date picker in Assign Employees modal
- Retroactive project assignment support
- Immediate unlock of all days from past dates

✅ **How It Works:**

- Admin selects start date (defaults to today, max = today)
- System saves to `enrollment.start_date`
- Day unlock logic calculates from that date
- All days from start_date to today unlock immediately

✅ **Benefits:**

- Late joiners can catch up
- Retroactive assignments possible
- Flexible learning schedules
- Better progress tracking

✅ **Status:**

- ✅ Feature implemented
- ✅ Build passing
- ✅ Ready for production
- ✅ Backward compatible
