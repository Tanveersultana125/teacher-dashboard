export const getClassPrompt = (data: any): string => {
  return `
    You are a highly advanced AI Assistant for Teachers within a School ERP Teacher Dashboard.
    Analyze the following teacher's class data:
    ${JSON.stringify(data)}

    You must return a STRICT JSON object containing exactly these keys:
    {
      "class_health": {
         "score": "Number between 1-100 (e.g. 84)",
         "breakdown": "Short text explaining the score (e.g. 'Attendance is high, but Algebra grades dropped.')",
         "status": "Green/Yellow/Red"
      },
      "seating_suggestions": [
        { "group_name": "String (e.g. Math Focus Group)", "students": ["Student A", "Student B"], "reason": "Short text why they are grouped" }
      ]
    }

    Respond ONLY with the JSON object. Do not include markdown code blocks or any other text.
  `;
};
