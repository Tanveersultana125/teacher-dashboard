"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeacherAIInsights = void 0;
/* TEACHER DASHBOARD BACKEND — Master Insights Engine (hardened) */
const functions = require("firebase-functions");
const params_1 = require("firebase-functions/params");
const admin = require("firebase-admin");
const openai_1 = require("openai");
admin.initializeApp();
// Key stored in Firebase Secret Manager. Set via:
//   firebase secrets:set OPENAI_API_KEY
const openaiApiKey = (0, params_1.defineSecret)("OPENAI_API_KEY");
const TEACHER_ROLES = new Set(["teacher", "principal", "owner"]);
const MAX_PAYLOAD_CHARS = 40000;
const MAX_LESSON_TEXT_CHARS = 12000;
// Vision payloads (paper_correction) carry base64 page images and need a much
// larger cap. Firebase Functions hard limit is 10 MB; we cap below that to
// leave headroom for envelope + headers.
const MAX_VISION_PAYLOAD_CHARS = 9000000;
const MAX_PAPER_PAGES = 10;
// Types that are allowed to use the vision payload size cap.
const VISION_TYPES = new Set(["paper_correction"]);
function requireRole(context, allowed) {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    }
    const role = context.auth.token.role;
    if (!role || !allowed.has(role)) {
        throw new functions.https.HttpsError("permission-denied", "Teachers only.");
    }
}
function safeJsonParse(raw, label) {
    try {
        return JSON.parse(raw);
    }
    catch {
        console.error(`[${label}] JSON parse failed. Raw (first 500):`, raw.slice(0, 500));
        throw new functions.https.HttpsError("internal", "AI returned invalid JSON. Please retry.");
    }
}
exports.getTeacherAIInsights = functions
    .runWith({ secrets: [openaiApiKey], timeoutSeconds: 240, memory: "1GB" })
    .https.onCall(async (data, context) => {
    // Auth + role gate (was auth-only, missing role check).
    requireRole(context, TEACHER_ROLES);
    // Trim defensively — Secret Manager retains trailing whitespace/newline
    // from CLI input, which makes the Bearer header invalid.
    const openai = new openai_1.default({ apiKey: openaiApiKey.value().trim() });
    const { type, payload } = data || {};
    // Input bounds on payload — prevent prompt-cost amplification. Vision
    // calls (paper_correction) carry image arrays so they get a much higher
    // cap; everything else stays on the strict 40 KB limit.
    const payloadJson = JSON.stringify(payload ?? {});
    const cap = VISION_TYPES.has(type) ? MAX_VISION_PAYLOAD_CHARS : MAX_PAYLOAD_CHARS;
    if (payloadJson.length > cap) {
        throw new functions.https.HttpsError("invalid-argument", "payload too large.");
    }
    console.log("Teacher AI Request:", type);
    let systemPrompt = "You are an expert Educational AI assistant for Edullent.";
    let userPrompt = `Context: ${payloadJson}`;
    if (type === "assignment_creation") {
        systemPrompt = "You are an AI Assignment Generator.";
        userPrompt = `Generate a calibrated assignment. Return JSON: { difficulty_calibration, personalized_groups, generated_assignment { title, description } }. Context: ${payloadJson}`;
    }
    else if (type === "assignment_grading") {
        systemPrompt = "You are an AI Auto-Grader.";
        userPrompt = `Analyze student submissions. Return JSON: { auto_graded_results [], plagiarism_alerts [] }. Context: ${payloadJson}`;
    }
    else if (type === "dashboard_insights") {
        systemPrompt = "You are an AI School Principal Advisor.";
        userPrompt = `Provide strategic dashboard insights. Return JSON: { current_performance, critical_alerts [], growth_projections }. Context: ${payloadJson}`;
    }
    else if (type === "class_insights") {
        systemPrompt = "You are a Class Performance Analyst.";
        userPrompt = `Analyze class metrics. Return JSON: { average_mastery, concept_gaps [], student_rankings [] }. Context: ${payloadJson}`;
    }
    else if (type === "lesson_plan_generation") {
        systemPrompt = "You are an expert curriculum designer and master teacher. Generate structured, classroom-ready lesson plans.";
        userPrompt = `Generate a comprehensive lesson plan for:
SUBJECT: ${payload?.subject}
GRADE: ${payload?.grade}
TOPIC: ${payload?.topic}
BOARD: ${payload?.board}
DURATION PER LESSON: ${payload?.duration_per_lesson}
NUMBER OF LESSONS: ${payload?.num_lessons}
${payload?.learning_goals ? `LEARNING GOALS: ${payload.learning_goals}` : ""}
${payload?.special_considerations ? `SPECIAL CONSIDERATIONS: ${payload.special_considerations}` : ""}

Return JSON: {
  "plan_title": "string",
  "subject": "string",
  "grade": "string",
  "board": "string",
  "total_duration": "string",
  "overview": "string",
  "learning_objectives": ["string"],
  "materials_needed": ["string"],
  "prior_knowledge": "string",
  "lessons": [{
    "lesson_number": 1,
    "title": "string",
    "duration": "string",
    "learning_focus": "string",
    "sections": [{
      "name": "Introduction / Hook",
      "duration": "5 min",
      "teacher_activity": "string",
      "student_activity": "string",
      "key_questions": ["string"]
    }, {
      "name": "Direct Instruction",
      "duration": "10 min",
      "teacher_activity": "string",
      "student_activity": "string",
      "key_questions": ["string"]
    }, {
      "name": "Guided Practice",
      "duration": "15 min",
      "teacher_activity": "string",
      "student_activity": "string",
      "key_questions": ["string"]
    }, {
      "name": "Independent Practice",
      "duration": "10 min",
      "teacher_activity": "string",
      "student_activity": "string",
      "key_questions": []
    }, {
      "name": "Closure / Summary",
      "duration": "5 min",
      "teacher_activity": "string",
      "student_activity": "string",
      "key_questions": ["string"]
    }]
  }],
  "assessment_strategies": ["string"],
  "differentiation": {
    "for_struggling_students": "string",
    "for_advanced_students": "string",
    "for_ell_students": "string"
  },
  "cross_curricular_connections": ["string"],
  "homework": "string",
  "teacher_reflection_prompts": ["string"]
}
Generate exactly ${payload?.num_lessons} lesson(s). Make content specific to ${payload?.topic}. Return ONLY the JSON.`;
    }
    else if (type === "lesson_summary") {
        const text = typeof payload?.text === "string" ? payload.text : "";
        const truncated = text.length > MAX_LESSON_TEXT_CHARS
            ? text.substring(0, MAX_LESSON_TEXT_CHARS) + "\n...[truncated]"
            : text;
        systemPrompt = "You are an expert academic summarizer and study assistant. You extract key insights from educational documents and produce structured, exam-focused summaries.";
        userPrompt = `Analyze the following lesson/chapter content and produce a comprehensive structured summary.

CONTENT:
${truncated}

Return ONLY a JSON object in this exact structure:
{
  "title": "inferred document or chapter title",
  "subject": "inferred subject (e.g. Mathematics, Biology, History)",
  "brief_summary": "2-3 sentences capturing the essence of the entire document",
  "key_concepts": [
    { "concept": "Concept Name", "explanation": "Clear concise explanation in 1-2 sentences" }
  ],
  "section_breakdown": [
    { "section": "Section/Topic Name", "points": ["key point 1", "key point 2", "key point 3"] }
  ],
  "important_definitions": [
    { "term": "Term", "definition": "Definition" }
  ],
  "key_formulas_or_rules": ["Formula or rule 1", "Formula or rule 2"],
  "exam_important_points": ["Critical point students must remember for exams", "..."],
  "quick_revision": ["Ultra-short crisp revision point 1", "Ultra-short crisp revision point 2"],
  "difficulty_level": "Beginner or Intermediate or Advanced",
  "estimated_study_time": "e.g. 20 minutes"
}

Rules:
- key_concepts: 4-8 most important concepts
- section_breakdown: Break into logical sections found in the content (3-6 sections)
- important_definitions: 4-10 key terms
- key_formulas_or_rules: Include only if applicable (can be empty array)
- exam_important_points: 5-8 high-priority points
- quick_revision: 8-12 ultra-short bullet points (max 10 words each)
- Return ONLY the JSON, no markdown`;
    }
    else if (type === "class_action_plan") {
        systemPrompt = "You are a senior school data analyst and teacher coach for Indian K-12 schools. Give honest, specific, data-driven recommendations to a class teacher. Use Hinglish (Hindi + English mixed naturally) in diagnosis and action reasons — keep action titles in English. Never shame or demoralize. Respond ONLY in valid JSON.";
        userPrompt = `Generate an action plan for a class teacher based on the live metrics below.

CONTEXT:
${payloadJson}

Generate 4-5 specific actions. Each action must:
- Target the biggest measurable gap (low marks, low attendance, at-risk count, or a specific weak student)
- Be completable in 1-2 weeks
- Be concrete and trackable

Return ONLY this JSON:
{
  "diagnosis": [
    { "type": "good", "text": "Hinglish text — what is working with specific numbers" },
    { "type": "concern", "text": "Hinglish text — biggest issue with data" },
    { "type": "note", "text": "Hinglish text — pattern, context, or callout (optional)" }
  ],
  "actions": [
    {
      "id": "a1",
      "num": "01",
      "title": "Short English action title with target",
      "reason": "Hinglish 1-2 sentence reason with data",
      "tracking": "auto" | "auto_pct" | "manual",
      "status": "pending",
      "subStatus": "Short English label like '0 / 5 sessions' or '72% → 85%'"
    }
  ]
}`;
    }
    else if (type === "student_action_plan") {
        systemPrompt = "You are a teacher coach helping a teacher plan interventions for a specific student. Generate empathetic, concrete interventions. Use Hinglish in reasons, English in titles. Never shame. Respond ONLY in valid JSON.";
        userPrompt = `Generate a personalised intervention plan for one student.

CONTEXT:
${payloadJson}

Generate 4-5 SPECIFIC interventions targeting this student's worst metrics and weakest subjects.

Return ONLY this JSON:
{
  "diagnosis": [
    { "type": "concern", "text": "Hinglish — biggest issue with student-specific data" },
    { "type": "concern", "text": "Hinglish — secondary issue (optional)" },
    { "type": "note", "text": "Hinglish — pattern or recommendation context (optional)" }
  ],
  "actions": [
    {
      "id": "s1",
      "num": "01",
      "title": "Short English action title",
      "reason": "Hinglish 1-2 sentence reason citing student metrics",
      "tracking": "auto" | "manual",
      "status": "pending",
      "subStatus": "Short English label"
    }
  ]
}`;
    }
    else if (type === "exam_paper_generation") {
        systemPrompt = [
            "You are an expert school examination paper setter.",
            "Generate a well-structured, grade-appropriate exam paper.",
            "Return STRICT JSON only — no markdown, no code fences, no commentary.",
            "",
            "Shape the JSON exactly as:",
            "{",
            '  "title": string,',
            '  "subject": string,',
            '  "grade": string,',
            '  "board": string,',
            '  "duration": string,',
            '  "totalMarks": number,',
            '  "generalInstructions": string[],',
            '  "sections": [',
            "    {",
            '      "title": string,',
            '      "instructions": string,',
            '      "marks": number,',
            '      "questions": [',
            "        {",
            '          "number": number,',
            '          "type": "mcq"|"short"|"long"|"numerical"|"truefalse"|"fillblanks",',
            '          "marks": number,',
            '          "question": string,',
            '          "options": string[] | null,',
            '          "answer": string,',
            '          "solution": string',
            "        }",
            "      ]",
            "    }",
            "  ]",
            "}",
            "",
            "Rules:",
            "- Total of all question marks MUST equal totalMarks.",
            "- Number of questions MUST match numQuestions requested.",
            "- Group questions into sections by type (e.g. MCQ in Section A, Short in B, Long in C).",
            "- For MCQ, provide exactly 4 options and put the correct letter + text in `answer`.",
            "- Match difficulty honestly (Easy/Medium/Hard/Mixed).",
            "- Respect board conventions (CBSE/ICSE/IB/etc).",
        ].join("\n");
        const p = payload || {};
        userPrompt = [
            `Subject: ${p.subject}`,
            `Grade: ${p.grade}`,
            `Board: ${p.board}`,
            `Topics: ${p.topics}`,
            `Difficulty: ${p.difficulty}`,
            `Duration: ${p.duration}`,
            `Total Marks: ${p.totalMarks}`,
            `Number of Questions: ${p.numQuestions}`,
            `Question Types to include: ${Array.isArray(p.questionTypes) ? p.questionTypes.join(", ") : "mcq, short, long"}`,
            p.instructions ? `Special Instructions: ${p.instructions}` : "",
            p.teacherName ? `Teacher: ${p.teacherName}` : "",
            p.schoolName ? `School: ${p.schoolName}` : "",
            "",
            "Generate the exam paper now as JSON.",
        ].filter(Boolean).join("\n");
    }
    else if (type === "paper_correction") {
        // Validate vision payload up-front so we don't bill an OpenAI call on
        // garbage. `images` must be an array of data-URL JPEGs (data:image/...).
        const images = payload?.images;
        if (!Array.isArray(images) || images.length === 0) {
            throw new functions.https.HttpsError("invalid-argument", "No page images provided.");
        }
        if (images.length > MAX_PAPER_PAGES) {
            throw new functions.https.HttpsError("invalid-argument", `Too many pages — max ${MAX_PAPER_PAGES} per submission.`);
        }
        for (const img of images) {
            if (typeof img !== "string" || !img.startsWith("data:image/")) {
                throw new functions.https.HttpsError("invalid-argument", "Bad image payload.");
            }
        }
        systemPrompt = [
            "You are a warm, experienced school teacher correcting a student's exam paper — NOT a robotic grader.",
            "Tone: kind, specific, encouraging, like an actual human teacher writing comments in red pen.",
            "Use Hinglish (Hindi + English mixed naturally) in feedback, comments, and improvement notes.",
            "Keep question numbers, marks, and final scores in clean English/numbers.",
            "Never shame the student. Always pair a weakness with a concrete, kind next step.",
            "If a question is partially correct, give partial marks and explain WHY some marks were cut.",
            "If handwriting is unclear or a question is unreadable, say so honestly in the comment.",
            "Read every page carefully. The pages are in order — page 1 is the first image.",
            "Return STRICT JSON only — no markdown fences, no commentary outside the JSON.",
            "",
            "JSON shape:",
            "{",
            '  "subject": string,',
            '  "grade": string | null,',
            '  "totalMarks": number,',
            '  "marksScored": number,',
            '  "percentage": number,                          // round to 1 decimal',
            '  "grade_band": "A+" | "A" | "B" | "C" | "D" | "E" | "F",',
            '  "overall_summary": string,                     // 2-3 Hinglish sentences, warm human teacher tone',
            '  "questions": [                                 // one entry per question detected',
            "    {",
            '      "number": string,                          // "1", "2a", "Q3.ii" — match the paper',
            '      "question_text": string,                   // brief paraphrase of the question',
            '      "max_marks": number,',
            '      "marks_awarded": number,',
            '      "verdict": "correct" | "partial" | "wrong" | "blank" | "unreadable",',
            '      "student_answer_summary": string,          // what the student wrote, in 1-2 lines',
            '      "correct_answer": string,                  // the expected answer / approach in 1-3 lines',
            '      "comment": string                          // Hinglish red-pen-style feedback, 1-3 sentences, kind + specific',
            "    }",
            "  ],",
            '  "strengths": [string],                         // 3-5 Hinglish bullets — what student did WELL with examples',
            '  "weaknesses": [string],                        // 3-5 Hinglish bullets — concept gaps, calculation slips, presentation issues',
            '  "improvement_plan": [                          // 4-6 specific next steps, NOT generic "study more"',
            "    {",
            '      "area": string,                            // English label, e.g. "Linear equations"',
            '      "action": string,                          // Hinglish — specific 1-week action, like "Roz 5 word problems solve karo from NCERT Ex 4.3"',
            '      "priority": "high" | "medium" | "low"',
            "    }",
            "  ],",
            '  "encouragement": string                        // 1-2 Hinglish sentences — genuine, specific, never fake',
            "}",
            "",
            "Rules:",
            "- marksScored MUST equal sum of marks_awarded across all questions.",
            "- percentage MUST equal round(marksScored / totalMarks * 100, 1).",
            "- grade_band: A+ ≥90, A 80-89, B 70-79, C 60-69, D 50-59, E 40-49, F <40.",
            "- If a page is unreadable, mark affected questions with verdict=\"unreadable\" and 0 marks.",
            "- Improvement plan must reference SPECIFIC mistakes the student made, not generic advice.",
        ].join("\n");
        const p = payload || {};
        const meta = [
            `Subject: ${p.subject || "(not specified — infer from paper)"}`,
            p.grade ? `Grade: ${p.grade}` : null,
            p.totalMarks ? `Total Marks (declared by teacher): ${p.totalMarks}` : "Total Marks: infer from the paper",
            p.studentName ? `Student: ${p.studentName}` : null,
            p.answerKey ? `\nTeacher's answer key / marking scheme:\n${String(p.answerKey).slice(0, 6000)}` : null,
            p.notes ? `\nTeacher notes for grading: ${String(p.notes).slice(0, 1000)}` : null,
        ].filter(Boolean).join("\n");
        userPrompt = [
            "Correct this scanned student exam paper end-to-end.",
            "",
            meta,
            "",
            `Pages attached: ${images.length} (in order).`,
            "Read every question on every page, mark it, and produce the JSON.",
        ].join("\n");
    }
    else if (type === "teacher_self_action_plan") {
        systemPrompt = "You are a senior educator performance coach. Give honest, constructive feedback to a teacher to help them improve their professional metrics. Use Hinglish naturally in diagnosis and action reasons. Keep action titles in English. Never demoralize. Respond ONLY in valid JSON.";
        userPrompt = `Generate self-improvement actions for a teacher based on their composite metrics across classes.

CONTEXT:
${payloadJson}

Generate 4-5 self-improvement actions targeting their weakest classes or biggest gaps.

Return ONLY this JSON:
{
  "diagnosis": [
    { "type": "good", "text": "Hinglish — what is working with specifics" },
    { "type": "concern", "text": "Hinglish — biggest weakness with numbers" },
    { "type": "note", "text": "Hinglish — class-specific concern or callout (optional)" }
  ],
  "actions": [
    {
      "id": "t1",
      "num": "01",
      "title": "Short English action title",
      "reason": "Hinglish 1-2 sentence reason with data",
      "tracking": "auto" | "auto_pct" | "manual",
      "status": "pending",
      "subStatus": "Short English label"
    }
  ]
}`;
    }
    const maxTokens = type === "lesson_plan_generation" ? 4096 :
        type === "lesson_summary" ? 3000 :
            type === "exam_paper_generation" ? 4096 :
                type === "paper_correction" ? 4096 :
                    type === "class_action_plan" ? 1500 :
                        type === "student_action_plan" ? 1500 :
                            type === "teacher_self_action_plan" ? 1500 :
                                1024;
    // Vision types attach base64 page images to the user message so the
    // model can actually look at the scanned paper. Everything else stays
    // on the simple text-only path.
    const userContent = type === "paper_correction"
        ? [
            { type: "text", text: userPrompt },
            ...payload.images.map((dataUrl) => ({
                type: "image_url",
                image_url: { url: dataUrl, detail: "high" },
            })),
        ]
        : userPrompt;
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent },
            ],
            response_format: { type: "json_object" },
            max_tokens: maxTokens,
        });
        const rawContent = completion.choices[0].message.content ?? "";
        console.log(`[${type}] finish_reason:`, completion.choices[0].finish_reason);
        // Safe parse — throws HttpsError on malformed JSON instead of leaking
        // SyntaxError details to the client.
        const output = safeJsonParse(rawContent, `getTeacherAIInsights:${type}`);
        return { status: "success", data: output };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error("Teacher AI Error:", error);
        throw new functions.https.HttpsError("internal", "AI call failed.");
    }
});
//# sourceMappingURL=index.js.map