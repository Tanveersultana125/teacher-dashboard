export const getRosterSummariesPrompt = (data: any): string => {
  return `
    You are an AI Student Profiler.
    Analyze the following class roster details and metrics:
    ${JSON.stringify(data)}

    You must return a STRICT JSON object containing exactly these keys:
    {
      "summaries": [
         { "student_name": "Name", "summary": "1-line smart actionable summary based on their attendance and average score." }
      ]
    }

    Respond ONLY with the JSON object. Do not include markdown or other text.
  `;
};

export const getStudentAnalyticsPrompt = (data: any): string => {
  return `
    You are an AI Education Prediction Engine.
    Analyze the following student's full historical data:
    ${JSON.stringify(data)}

    You must return a STRICT JSON object containing exactly these keys:
    {
      "one_line_summary": "String",
      "learning_style": "String (Visual, Auditory, or Kinesthetic)",
      "learning_style_reason": "String",
      "progress_prediction": "String (e.g. Expected 85% in next math exam)",
      "prediction_reason": "String explanations of trend."
    }

    Respond ONLY with the JSON object. Do not include markdown or other text.
  `;
};
