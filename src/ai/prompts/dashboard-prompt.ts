export const getDashboardPrompt = (data: any): string => {
  return `
    You are a highly advanced AI Assistant for Teachers within a School ERP Teacher Dashboard.
    Analyze the following teacher's upcoming classes, assignments, and student risk data:
    ${JSON.stringify(data)}

    You must return a STRICT JSON object containing exactly these keys:
    {
      "ai_daily_planner": [
        { "time": "String (e.g., 09:00 AM)", "class_name": "String", "plan": "Syllabus progress + exams + weak areas ka mix" }
      ],
      "class_performance_summary": [
        { "class": "String (e.g., Class 8A)", "subject": "String", "summary": "Short AI statement (e.g., 'Algebra mein +12%, 6 extra practice required')" }
      ],
      "smart_notifications": [
        { "message": "Urgent alert text", "priority": "High/Critical/Medium", "action_required": "String" }
      ]
    }

    Respond ONLY with the JSON object. Do not include markdown code blocks or any other text.
  `;
};
