export const getTestCreatorPrompt = (data: any): string => {
  return `
    You are an AI Question Paper Generator.
    Analyze the following test requirements (topics, class, duration, total marks):
    ${JSON.stringify(data)}

    You must return a STRICT JSON object containing exactly these keys:
    {
      "blooms_taxonomy_distribution": {
        "knowledge": "20%", "comprehension": "30%", "application": "30%", "analysis": "20%"
      },
      "generated_paper": {
        "title": "String",
        "questions": ["Q1. text", "Q2. text", "Q3. text"]
      },
      "answer_key": [
        { "question_number": 1, "possible_answers": ["Ans 1", "Ans 2"], "marking_scheme": "Steps to grade" }
      ]
    }

    Respond ONLY with the JSON object. Do not include markdown or other text.
  `;
};

export const getResultAnalysisPrompt = (data: any): string => {
  return `
    You are an AI Exam Result Analyzer.
    Analyze the following student scores and test data:
    ${JSON.stringify(data)}

    You must return a STRICT JSON object containing exactly these keys:
    {
      "class_insights": "Detailed string explaining the overall class performance, identifying strong and weak areas.",
      "question_item_analysis": [
        { "question_topic": "String", "failure_rate": "percentage", "reason": "Why the class struggled with this specific topic/question based on the data." }
      ]
    }

    Respond ONLY with the JSON object. Do not include markdown or other text.
  `;
};
