# Quick Upload Reference Card

## ✅ All 4 Course Files Ready!

| File          | Days | Tasks | Recommended For                 |
| ------------- | ---- | ----- | ------------------------------- |
| **ttp1.json** | 131  | 262   | Data Engineering Fundamentals   |
| **ttp2.json** | 132  | 264   | Advanced Data Engineering       |
| **ttp3.json** | 132  | 264   | Data Engineering Specialization |
| **ttp4.json** | 120  | 240   | Comprehensive Track             |

---

## 🚀 Upload in 3 Steps

### 1️⃣ Create Project (Admin Panel)

```
Title: [Your Course Name]
Total Days: 131, 132, 132, or 120 (match your JSON file)
✅ Published
✅ Active
✅ Daily Reminder Emails (optional)
```

### 2️⃣ Upload JSON (Build Page)

```
Click "Build Project" → Upload Tasks from JSON
Select: ttp1.json, ttp2.json, ttp3.json, or ttp4.json
Wait for: "Successfully created X days and Y tasks"
```

### 3️⃣ Assign Employees (Projects Page)

```
Click "Assign Employees"
Select employees
Start dates use employee's default_start_date
```

---

## 📧 Email Automation Already Configured!

- ✅ Sends at **9:00 AM UTC** daily
- ✅ Uses **per-employee start dates**
- ✅ Only sends if **tasks incomplete**
- ✅ Respects "Daily Reminder Emails" toggle

---

## 📂 Files Created

- ✅ `ttp1.json` - Ready to upload
- ✅ `ttp2.json` - Ready to upload
- ✅ `ttp3.json` - Ready to upload
- ✅ `ttp4.json` - Ready to upload
- 📄 `COURSE_FILES_README.md` - Full documentation
- 📄 `EMAIL_SETUP.md` - Email system guide
- 💾 `ttp*_backup.json` - Original files (backup)

---

## 🔍 What Was Fixed

**Problem**: Each file had 400+ separate JSON objects concatenated together  
**Solution**: Combined all days into single valid JSON structure  
**Result**: Each file now has ONE `{"days": [...]}` object

**Validation**:

- ✅ Valid JSON syntax
- ✅ No duplicate days
- ✅ All tasks have required fields
- ✅ Sequential day numbering
- ✅ Correct array structures

---

## 💡 Tips

1. **Don't delete backups** until you've successfully uploaded all courses
2. **Set total_days** in project settings to match (or exceed) highest day number
3. **Test with one employee** before bulk enrollment
4. **Check timesheet** auto-logs employee's hours_per_day value
5. **Monitor emails** via Inngest dashboard after deployment

---

Need help? Read `COURSE_FILES_README.md` for detailed instructions! 📚
