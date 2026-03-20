export const getClassReportCardsPrompt = (data: any): string => {
  return `
    You are an expert Education Data Scientist.
    Task: Generate high-level AI individual report card remarks for a class of students based on their aggregate performance.

    Class: ${data.grade} ${data.section}
    Students: ${JSON.stringify(data.students)}
    Academic Trends: ${data.trends || 'Consistent progress across core subjects.'}

    Instructions:
    1. For EACH student, generate exactly one professional, insightful, and motivating "AI Remark" (approx 2 sentences).
    2. Remarks should reflect their status (e.g. 'At Risk' needs specific intervention mention, 'Active' needs growth mention).
    3. Include a "Class Strategy" observation at the end for the teacher.

    STRICT JSON Output Format:
    {
      "student_reports": [
        { "name": "Student Name", "ai_remark": "..." }
      ],
      "class_strategy": "..."
    }

    Respond ONLY with JSON.
  `;
};

export const getDetailedSubjectReportPrompt = (data: any): string => {
  return `
    You are an Academic Consultant.
    Task: Draft a comprehensive "Subject Action Plan" for the next academic year based on current subject performance.

    Subject: ${data.subject}
    Grade: ${data.grade}
    Current Avg Score: ${data.avg_score}%
    Key Struggles Identified: ${JSON.stringify(data.struggles)}
    Mastery Level: ${data.mastery_level}

    Draft Requirements:
    1. Executive Summary: Summary of this year's performance.
    2. Next Year Action Plan: Specific steps to take for the next grade.
    3. Recommended Resources: Specific focus areas (Books, Topics, etc.).
    4. Target Goal: Quantifiable target for next year.

    STRICT JSON Output Format:
    {
      "report_content": "...",
      "word_content_draft": "...",
      "action_plan_steps": ["...", "..."]
    }

    Respond ONLY with JSON.
  `;
};
