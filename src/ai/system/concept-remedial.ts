// Deterministic per-concept remedial-plan generator.
//
// Replaces the AI prompt previously stubbed at
// ai-controller.ts :: getConceptRemedial (which returned `not_implemented`
// silently — broken UX since teachers click "Assign Remedial" and got
// nothing back).
//
// Pure function. No side effects, no network. Returns the SAME shape the
// existing ConceptMasteryDetail.tsx UI consumed from the AI response, so
// the page's render code (learning_gap / prerequisite_chain / remedial_plan)
// works unchanged.
//
// Logic:
//   1. Classify the concept's subject-area from keyword hints in the title
//      (math / science / language / social-studies / generic). This drives
//      the prerequisite + step language so the plan reads relevant, not
//      generic.
//   2. Bucket the score band (very_weak <30 / weak 30-49 / borderline 50-59).
//      Severity controls how aggressive the remedial framing is and how
//      many practice cycles we recommend.
//   3. Compose:
//      • learning_gap → 1-sentence diagnosis with student name + topic + %
//      • prerequisite_chain → 1-sentence root-cause hypothesis tied to
//        subject area
//      • remedial_plan → 4-6 concrete, sequenced action steps
//
// All copy is in English, calibrated for teacher-to-parent communication
// tone. No invented numbers — only the score the teacher actually entered
// is referenced.

export type ConceptRemedialOutput = {
  /** 1-sentence diagnosis the teacher sees first. */
  learning_gap: string;
  /** 1-sentence root-cause hypothesis. */
  prerequisite_chain: string;
  /** 4-6 ordered remedial steps. */
  remedial_plan: string[];
};

export type ConceptArea = "math" | "science" | "language" | "social_studies" | "general";

const formatTitle = (raw: string): string => {
  const s = (raw || "").toString().trim().replace(/_/g, " ");
  if (!s) return "this concept";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const safeName = (n: string | undefined | null): string =>
  (n && n.trim().length > 0 ? n.trim() : "the student");

/**
 * Heuristic subject-area detection from the concept's title. Used to choose
 * a relevant prerequisite hypothesis and remedial vocabulary. Matches are
 * case-insensitive and require a real word boundary so substrings inside
 * larger unrelated words don't trigger.
 */
export function detectConceptArea(concept: string): ConceptArea {
  const t = (concept || "").toLowerCase();
  const hasAny = (words: string[]) =>
    words.some((w) => new RegExp(`\\b${w}\\b`).test(t));

  if (hasAny([
    "algebra", "geometry", "trigonometry", "calculus", "arithmetic",
    "number", "numbers", "fraction", "fractions", "decimal", "decimals",
    "equation", "equations", "polynomial", "polynomials", "quadratic",
    "linear", "ratio", "ratios", "proportion", "percentage", "percentages",
    "mensuration", "probability", "statistics", "matrix", "matrices",
    "vector", "vectors", "integration", "differentiation", "logarithm",
    "logarithms", "exponent", "exponents",
  ])) return "math";

  if (hasAny([
    "physics", "chemistry", "biology", "force", "motion", "energy",
    "atom", "atoms", "molecule", "molecules", "cell", "cells",
    "photosynthesis", "respiration", "ecosystem", "ecosystems",
    "reaction", "reactions", "acid", "acids", "base", "bases",
    "electricity", "magnetism", "gravity", "evolution", "genetics",
    "anatomy", "physiology",
  ])) return "science";

  if (hasAny([
    "grammar", "vocabulary", "comprehension", "writing", "reading",
    "essay", "essays", "literature", "poetry", "prose", "tense",
    "tenses", "noun", "nouns", "verb", "verbs", "adjective",
    "adjectives", "punctuation", "spelling", "syntax",
  ])) return "language";

  if (hasAny([
    "history", "geography", "civics", "economics", "polity", "constitution",
    "revolution", "war", "wars", "empire", "empires", "civilization",
    "civilizations", "climate", "river", "rivers", "mountain", "mountains",
    "trade", "industry", "agriculture", "democracy", "government",
  ])) return "social_studies";

  return "general";
}

const prerequisiteHypothesisFor = (area: ConceptArea, concept: string): string => {
  const t = formatTitle(concept);
  switch (area) {
    case "math":
      return `Likely root cause: an earlier numeric or conceptual building block in ${t} hasn't fully stuck — typically the previous chapter's foundational rules or operations.`;
    case "science":
      return `Likely root cause: the underlying observation, definition, or process diagram for ${t} hasn't been internalised — visualising the mechanism usually unlocks it.`;
    case "language":
      return `Likely root cause: a structural rule (grammar pattern, sentence convention, or recurring vocabulary group) under ${t} needs to be re-anchored before applying it in context.`;
    case "social_studies":
      return `Likely root cause: the timeline, cause-effect chain, or map context for ${t} isn't yet connected — once the bigger story clicks, recall improves quickly.`;
    case "general":
    default:
      return `Likely root cause: the foundational definition and one worked example of ${t} need to be revisited before attempting harder applications.`;
  }
};

type Severity = "very_weak" | "weak" | "borderline";

const severityFor = (score: number): Severity => {
  if (score < 30) return "very_weak";
  if (score < 50) return "weak";
  return "borderline"; // 50–59
};

const learningGapFor = (
  studentName: string,
  concept: string,
  score: number,
  severity: Severity,
): string => {
  const t = formatTitle(concept);
  const name = safeName(studentName);
  switch (severity) {
    case "very_weak":
      return `${name} scored ${score}% in ${t} — a critical gap. Without re-laying the foundation, this topic will block everything that builds on it.`;
    case "weak":
      return `${name} scored ${score}% in ${t} — the core idea hasn't landed yet. Targeted re-teaching, not just more practice, is what'll move the needle.`;
    case "borderline":
      return `${name} scored ${score}% in ${t} — partial understanding shows in the basics, but application questions are tripping them up. A focused revision push can lift this into mastery within a fortnight.`;
  }
};

const remedialPlanFor = (
  area: ConceptArea,
  concept: string,
  severity: Severity,
): string[] => {
  const t = formatTitle(concept);

  // Subject-area specific step #2 (the "re-teach" step) — kept distinct so
  // the plan doesn't read identically across subjects.
  const reteachStep = (() => {
    switch (area) {
      case "math":
        return `Re-teach ${t} from the previous chapter's foundation upward, working one solved example slowly on the board before independent practice.`;
      case "science":
        return `Walk through ${t} using a labelled diagram or short demo, and have the student narrate the process back in their own words.`;
      case "language":
        return `Re-explain the grammar/structure rule behind ${t} with 3 contrasting examples (correct vs incorrect) so the pattern is visible.`;
      case "social_studies":
        return `Place ${t} on a timeline or map alongside its cause-and-effect, then have the student recreate the sequence verbally.`;
      case "general":
      default:
        return `Re-teach ${t} starting from the simplest definition, build to one full worked example, and check understanding with a quick quiz.`;
    }
  })();

  // Severity adds urgency and frequency. Very weak gets a parent-loop and
  // a daily check-in. Borderline can be handled with twice-weekly catch-ups.
  const baseSteps: string[] = [
    `Schedule a 15-minute one-on-one diagnostic with the student to confirm exactly which sub-skill of ${t} is missing — don't assume.`,
    reteachStep,
    `Assign a short focused worksheet on ${t} (5–8 questions, mixed difficulty) and review it the next day, not at week-end.`,
  ];

  if (severity === "very_weak") {
    baseSteps.push(
      `Pair the student with a stronger peer for 10 minutes daily this week — peer explanation often closes gaps formal instruction can't.`,
      `Notify the parent with one specific home task tied to ${t} (e.g., 5 problems, a video link, or a worked example to discuss) to reinforce after school.`,
      `Re-test ${t} (different questions, same skill) at the end of the week and update the mastery card based on the new score.`,
    );
  } else if (severity === "weak") {
    baseSteps.push(
      `Add ${t} as the warm-up topic for the next 3 classes — 5-minute recap each day builds retention without disrupting the new syllabus.`,
      `Re-test ${t} after one week of focused work and decide whether to escalate to a peer-pair or move on.`,
    );
  } else {
    baseSteps.push(
      `Slot ${t} into the next 2 weekly recap sessions and watch for whether the student volunteers answers — that's the real signal of mastery returning.`,
    );
  }

  return baseSteps;
};

/**
 * Main entry point used by ConceptMasteryDetail.tsx.
 *
 * @param studentName  Student's display name (falls back to "the student" if blank).
 * @param concept      Title of the failed concept (raw string from the gradebook).
 * @param score        The student's score on this concept, 0..100.
 */
export function generateConceptRemedial(
  studentName: string,
  concept: string,
  score: number,
): ConceptRemedialOutput {
  // Defensive numeric handling — UI sometimes passes NaN or out-of-range
  // values from older data; clamp and treat as worst-case.
  const safeScore = Number.isFinite(score)
    ? Math.max(0, Math.min(100, Math.round(score)))
    : 0;
  const area = detectConceptArea(concept);
  const severity = severityFor(safeScore);

  return {
    learning_gap: learningGapFor(studentName, concept, safeScore, severity),
    prerequisite_chain: prerequisiteHypothesisFor(area, concept),
    remedial_plan: remedialPlanFor(area, concept, severity),
  };
}
