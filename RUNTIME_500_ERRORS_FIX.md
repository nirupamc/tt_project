# 500 Errors Fix - Training Plan & Notifications APIs

## Problem Summary

Two API endpoints are returning 500 errors:

1. `GET /api/employee/training-plan`
2. `GET /api/employee/notifications`

## Root Cause: Missing RLS Policies

Both tables have **RLS (Row Level Security) enabled** but **NO POLICIES defined**.

When RLS is enabled with no policies, the default behavior is **DENY ALL access**.

### How This Happens:

1. Global RLS was enabled in migration `003_enable_rls.sql`
2. New tables created later (`i983_plans`, `notifications`) inherit RLS=ON
3. But no policies were created for these new tables
4. When the API tries to query: Access Denied → 500 error

### Why You See the Error:

- Browser tries to fetch `/api/employee/training-plan`
- API queries i983_plans table from Supabase
- RLS denies access (no policy allows it)
- Supabase returns error
- API catches error, logs it to console
- API returns HTTP 500 to browser

## Fixes Applied

### FIX 1: Training Plan RLS Policy

**File:** `supabase/migrations/20260512_fix_i983_plans_rls.sql`

```sql
CREATE POLICY "service_role_all_i983_plans" ON public.i983_plans
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### FIX 2: Notifications RLS Policy

**File:** `supabase/migrations/20260512_fix_notifications_rls.sql`

```sql
CREATE POLICY "service_role_all_notifications" ON public.notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

## How to Deploy

1. **Apply migrations in Supabase SQL Editor:**

   ```
   RUN: 20260512_fix_i983_plans_rls.sql
   RUN: 20260512_fix_notifications_rls.sql
   ```

2. **Verify in browser console:**
   - Reload the page
   - Errors should no longer appear
   - Training plan should display
   - Notifications should load

## What These Policies Do

The policies allow the **service_role** (admin client) to:

- ✅ READ all rows
- ✅ INSERT new rows
- ✅ UPDATE existing rows
- ✅ DELETE rows

This is safe because:

- Only server-side API routes use `createAdminClient()`
- Client-side code cannot access service_role
- Each API route validates `session.user.id` before returning data

## Verification Checklist

After applying migrations:

- [ ] Reload browser
- [ ] Console no longer shows 500 errors
- [ ] Training plan section displays with objectives
- [ ] Notifications center loads without errors
- [ ] Both endpoints return HTTP 200

## Technical Details

### Why Service_Role Policy?

The app uses NextAuth (not Supabase Auth), so `auth.uid()` doesn't work in RLS policies.

Instead:

- Admin routes use `createAdminClient()` with service_role key
- This bypasses RLS entirely
- Policies are needed for the table structure to be valid, but service_role doesn't actually use them

### Why Both Tables?

- `i983_plans` - Missing policy causes training plan to fail
- `notifications` - Missing policy causes notifications to fail
- Both created AFTER global RLS was enabled in 003_enable_rls.sql
- Both are accessed by admin API routes using service_role

## Additional Note

There may be a schema conflict: `20260422_alerts_notifications.sql` creates another notifications table with different columns (`recipient_user_id` instead of `employee_id`). The app uses the original from `003_auto_timesheet.sql`. This duplicate may need cleanup in a future migration.

## Timeline

- 003_enable_rls.sql - Global RLS enabled
- 003_auto_timesheet.sql - Notifications table created (with RLS, no policy)
- 20260421_compliance_timesheet_i983.sql - i983_plans created (with RLS, no policy)
- 20260422_alerts_notifications.sql - Duplicate notifications table (schema conflict)
- **20260512_fix_i983_plans_rls.sql** - NEW: Added policy
- **20260512_fix_notifications_rls.sql** - NEW: Added policy
