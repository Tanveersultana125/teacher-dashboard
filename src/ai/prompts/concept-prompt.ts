export const getConceptRemedialPrompt = (data: any): string => {
  return `
    You are an AI Remedial Teacher.
    Analyze the following student's failed concept and historical scores:
    ${JSON.stringify(data)}

    You must return a STRICT JSON object containing exactly these keys:
    {
      "learning_gap": "Clear analysis of why the student is struggling with the micro-concept.",
      "prerequisite_chain": "Identify the exact root cause from past concepts (e.g. 'Struggling in Quadratic because Linear Equations is weak').",
      "remedial_plan": ["Step 1: Actionable advice", "Step 2", "Step 3"],
      "auto_resources": [
        { "type": "YouTube Video", "title": "Resource title", "url": "Search query or mock url" },
        { "type": "Practice Worksheet", "title": "Worksheet name", "url": "mock url" }
      ]
    }

    Respond ONLY with the JSON object. Do not include markdown or other text.
  `;
};

export const getClassGapsPrompt = (data: any): string => {
  return `
    You are an AI Curriculum Analyzer.
    Analyze the following class's concept mastery matrix:
    ${JSON.stringify(data)}

    You must return a STRICT JSON object containing exactly these keys:
    {
      "class_level_gaps": [
        { "concept": "String", "failure_reason": "String", "suggested_class_action": "String" }
      ]
    }

    Respond ONLY with the JSON object. Do not include markdown or other text.
  `;
};
