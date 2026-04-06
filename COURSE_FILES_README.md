# Course JSON Files - Upload Ready ✅

All JSON files have been validated and fixed. They are now ready to upload through the admin panel.

## File Overview

### **ttp1.json** - Solaris Grid Data Engineering

- **Days**: 131 (Day 1 to Day 132)
- **Tasks**: 262 total
- **Task Types**: Reading, Coding, Quiz
- **Focus**: Data engineering fundamentals, ETL pipelines, Python data processing
- **Suggested Duration**: ~4-5 months

**Topics Covered**:

- Project Alpha kickoff & data inventory
- ETL and data ingestion fundamentals
- Functional programming for data transformation
- Exception handling in ETL pipelines
- Working with Pandas and data analysis
- Advanced Python for data engineering
- Big Data with Apache Spark
- Data warehousing concepts

---

### **ttp2.json** - Advanced Data Engineering

- **Days**: 132 (Day 1 to Day 132)
- **Tasks**: 264 total
- **Task Types**: Reading, Coding, Quiz
- **Focus**: Advanced data engineering, distributed systems, cloud platforms
- **Suggested Duration**: ~4-5 months

**Topics Covered**:

- Similar foundation to ttp1 but with advanced variations
- Distributed data processing
- Cloud data platforms
- Stream processing
- Data quality and governance

---

### **ttp3.json** - Data Engineering Specialization

- **Days**: 132 (Day 1 to Day 132)
- **Tasks**: 264 total
- **Task Types**: Reading, Coding, Quiz
- **Focus**: Specialized data engineering topics
- **Suggested Duration**: ~4-5 months

**Topics Covered**:

- Advanced ETL techniques
- Real-time data processing
- Data pipeline optimization
- Performance tuning

---

### **ttp4.json** - Comprehensive Data Engineering Track

- **Days**: 120 (Day 1 to Day 132)
- **Tasks**: 240 total
- **Task Types**: Reading, Coding, Quiz
- **Focus**: Complete data engineering curriculum
- **Suggested Duration**: ~4 months

**Topics Covered**:

- End-to-end data engineering
- Full pipeline development
- Production best practices
- Team collaboration in data projects

---

## How to Upload

### Step 1: Create Project

1. Go to **Admin Panel** → **Projects**
2. Click **"Create Project"**
3. Fill in details:
   - **Title**: e.g., "Solaris Grid Data Engineering"
   - **Description**: Brief description of the course
   - **Skill Tag**: e.g., "data-engineering"
   - **Total Days**: Match the number from file (e.g., 131 for ttp1)
   - **Thumbnail**: Optional image URL
   - **Published**: Check to make visible
   - **Active**: Check to enable
   - ⚠️ **Important**: Do NOT set a start date (removed from UI)

### Step 2: Upload JSON

1. After creating project, you'll see **"Build Project"** button
2. Click to go to the project build page
3. Find the **"Upload Tasks from JSON"** section
4. Click **"Choose File"** and select one of the JSON files:
   - `ttp1.json`
   - `ttp2.json`
   - `ttp3.json`
   - `ttp4.json`
5. Click **"Upload"**
6. Wait for success message showing days/tasks created

### Step 3: Assign Employees

1. Go back to **Projects** list
2. Find your project, click **"Assign Employees"**
3. Select employees to enroll
4. Each employee uses their **default start date** (set during employee creation)
5. Days will unlock automatically based on their individual start dates

---

## File Structure (Reference)

```json
{
  "days": [
    {
      "day": 1,
      "title": "Day Title",
      "tasks": [
        {
          "title": "Task Title",
          "type": "reading",
          "description": "Task description",
          "reading_content_md": "# Markdown content...",
          "reading_time_minutes": 10
        },
        {
          "title": "Quiz Title",
          "type": "quiz",
          "description": "Quiz description",
          "quiz_questions": [
            {
              "question": "Question text?",
              "options": ["A", "B", "C", "D"],
              "correct_index": 0
            }
          ]
        },
        {
          "title": "Coding Challenge",
          "type": "coding",
          "description": "Challenge description",
          "coding_language": "python",
          "coding_starter_code": "# Your code here..."
        }
      ]
    }
  ]
}
```

---

## Task Types

### 📖 Reading Tasks

- Markdown-formatted content
- Estimated reading time
- Educational material and concepts

### ❓ Quiz Tasks

- Multiple-choice questions
- 4 options per question
- Correct answer index (0-3)
- Validates understanding

### 💻 Coding Tasks

- Programming challenges
- Starter code provided
- Language specification (python, javascript, etc.)
- Hands-on practice

---

## Notes

✅ **All files validated** - Ready to upload immediately  
✅ **No duplicates** - Each day appears only once  
✅ **Proper structure** - Matches expected upload format  
✅ **Sequential days** - Days are properly numbered

📦 **Backups available** - Original files saved as `ttp*_backup.json`

🚀 **Upload immediately** - No further changes needed

---

## Troubleshooting

**If upload fails:**

1. Check that project `total_days` matches or exceeds the highest day number
2. Verify you're using the **service role** Supabase key (not anon key)
3. Check browser console for detailed error messages
4. Ensure database tables exist (projects, project_days, tasks)

**If days don't unlock:**

1. Check employee has a `default_start_date` set
2. Verify enrollment has a `start_date` (copied from employee)
3. Check project is marked as `is_active = true` and `is_published = true`
4. Day unlock time is 9:00 AM Central Time

---

Need help? All files are validated and ready to go! 🎉
