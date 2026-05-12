// Task category mapping by job role
export const TASK_CATEGORY_GROUPS = {
  data: {
    keywords: [
      "Data Engineer",
      "Data Analyst",
      "Data Scientist",
      "Big Data",
      "Data Quality",
      "Financial Analytics",
      "Financial Risk",
    ],
    categories: [
      "ETL / ELT Pipeline Development",
      "Data Modeling & Schema Design",
      "Data Quality & Validation",
      "SQL / Query Optimization",
      "Cloud Data Infrastructure",
      "Data Visualization & Reporting",
      "Pipeline Monitoring & Troubleshooting",
      "Research & Analysis",
      "Training / Self-Learning",
      "Team Meeting / Standup",
    ],
  },
  software: {
    keywords: [
      "Java",
      "Full Stack",
      "Software Developer",
      "Software Engineer",
      "Frontend",
      ".NET",
      "Python",
    ],
    categories: [
      "Backend API Development",
      "Frontend UI Development",
      "Database Design & Integration",
      "Unit & Integration Testing",
      "Code Review",
      "Deployment & Release",
      "Bug Fixes & Debugging",
      "System Design & Architecture",
      "Research & Documentation",
      "Training / Self-Learning",
      "Team Meeting / Standup",
    ],
  },
  devops: {
    keywords: [
      "DevOps",
      "Cloud",
      "AWS",
      "Azure",
      "Infrastructure",
    ],
    categories: [
      "Infrastructure Provisioning",
      "CI/CD Pipeline Configuration",
      "Container & Orchestration",
      "Cloud Architecture & Design",
      "Monitoring & Alerting",
      "Security Automation",
      "Scripting & Automation",
      "Incident Response",
      "Research & Documentation",
      "Training / Self-Learning",
      "Team Meeting / Standup",
    ],
  },
  security: {
    keywords: [
      "Network",
      "Cyber Security",
      "IT Security",
      "Linux",
      "Security Analyst",
      "Security Engineer",
    ],
    categories: [
      "Network Configuration & Monitoring",
      "Security Audit & Assessment",
      "Firewall & Access Control Management",
      "Incident Detection & Response",
      "System Administration",
      "Compliance Documentation",
      "Research & Documentation",
      "Training / Self-Learning",
      "Team Meeting / Standup",
    ],
  },
  analyst: {
    keywords: [
      "Business Analyst",
      "Systems Analyst",
      "Financial Analyst",
      "Financial Risk",
      "Information Systems",
    ],
    categories: [
      "Requirements Gathering & Analysis",
      "Process Mapping & Documentation",
      "Data Analysis & Reporting",
      "Stakeholder Communication",
      "Risk Assessment & Modeling",
      "Dashboard Development",
      "Research & Documentation",
      "Training / Self-Learning",
      "Team Meeting / Standup",
    ],
  },
  specialist: {
    keywords: [
      "Salesforce",
      "ServiceNow",
      "Power BI",
      "AI",
      "ML",
      "Machine Learning",
      "Gen AI",
      "Marketing",
      "Automation",
      "Embedded",
      "C++",
      "QA",
      "Test",
    ],
    categories: [
      "Platform Configuration & Development",
      "Integration & API Work",
      "Testing & Quality Assurance",
      "Reporting & Dashboard Development",
      "Model Training & Evaluation",
      "Automation Development",
      "Research & Documentation",
      "Training / Self-Learning",
      "Team Meeting / Standup",
    ],
  },
  general: {
    keywords: [],
    categories: [
      "Development Work",
      "Testing & QA",
      "Research & Analysis",
      "Documentation",
      "Training / Self-Learning",
      "Team Meeting / Standup",
    ],
  },
} as const;

/**
 * Get task categories for a given job title
 * Performs case-insensitive substring matching
 * Returns GENERAL categories if no match found
 */
export function getTaskCategoriesForJobTitle(jobTitle: string | null | undefined): readonly string[] {
  if (!jobTitle) {
    return TASK_CATEGORY_GROUPS.general.categories;
  }

  const titleLower = jobTitle.toLowerCase();

  // Check each group's keywords
  for (const [_key, group] of Object.entries(TASK_CATEGORY_GROUPS)) {
    if (_key === "general") continue; // Skip general, it's the fallback

    for (const keyword of group.keywords) {
      if (titleLower.includes(keyword.toLowerCase())) {
        return group.categories;
      }
    }
  }

  // No match found, return general
  return TASK_CATEGORY_GROUPS.general.categories;
}
