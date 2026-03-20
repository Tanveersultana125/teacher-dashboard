export const getAssignmentCreatorPrompt = (data: any): string => {
  return `
    You are an AI Assignment Generator for teachers.
    Analyze the following class and topic context:
    ${JSON.stringify(data)}

    You must return a STRICT JSON object containing exactly these keys:
    {
      "difficulty_calibration": "Explanation of previous homework performance and why new difficulty is set.",
      "personalized_groups": [
        { "group_name": "String", "difficulty_level": "String", "suggested_tasks": "String" }
      ],
      "generated_assignment": {
        "title": "String",
        "description": "String",
        "questions": ["Question 1", "Question 2"]
      }
    }

    Respond ONLY with the JSON object. Do not include markdown or other text.
  `;
};

export const getAssignmentGraderPrompt = (data: any): string => {
  return `
    You are an AI Auto-Grader and Plagiarism Detector.
    Analyze the following student submissions:
    ${JSON.stringify(data)}

    You must return a STRICT JSON object containing exactly these keys:
    {
      "auto_graded_results": [
        { "student_name": "String", "score": "Number between 0-100", "feedback": "String" }
      ],
      "plagiarism_alerts": [
        { "student_name": "String", "suspected_source": "String", "confidence": "Number between 0-100" }
      ]
    }

    Respond ONLY with the JSON object. Do not include markdown or other text.
  `;
};
