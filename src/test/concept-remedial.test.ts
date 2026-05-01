import { describe, it, expect } from "vitest";
import {
  generateConceptRemedial,
  detectConceptArea,
} from "../ai/system/concept-remedial";

describe("detectConceptArea", () => {
  it("identifies math topics", () => {
    expect(detectConceptArea("Algebra")).toBe("math");
    expect(detectConceptArea("Quadratic Equations")).toBe("math");
    expect(detectConceptArea("Trigonometry Basics")).toBe("math");
    expect(detectConceptArea("Fractions and Decimals")).toBe("math");
  });

  it("identifies science topics", () => {
    expect(detectConceptArea("Photosynthesis")).toBe("science");
    expect(detectConceptArea("Newton's Laws of Motion")).toBe("science");
    expect(detectConceptArea("Acids and Bases")).toBe("science");
  });

  it("identifies language topics", () => {
    expect(detectConceptArea("Tenses")).toBe("language");
    expect(detectConceptArea("Reading Comprehension")).toBe("language");
    expect(detectConceptArea("Vocabulary Building")).toBe("language");
  });

  it("identifies social studies topics", () => {
    expect(detectConceptArea("Indian Constitution")).toBe("social_studies");
    expect(detectConceptArea("Mughal Empire")).toBe("social_studies");
    expect(detectConceptArea("Climate of India")).toBe("social_studies");
  });

  it("falls back to 'general' for unknown topics", () => {
    expect(detectConceptArea("Topic XYZ")).toBe("general");
    expect(detectConceptArea("")).toBe("general");
    expect(detectConceptArea("Random unrelated string")).toBe("general");
  });

  it("uses word boundaries (no false-positive substring matches)", () => {
    // "warning" contains "war" but should not match social_studies "war"
    // because regex \bwar\b requires word boundary on both sides.
    expect(detectConceptArea("warning lights")).toBe("general");
    // "history" should match social_studies, not language
    expect(detectConceptArea("Indian History")).toBe("social_studies");
  });
});

describe("generateConceptRemedial — output shape", () => {
  it("returns the three required fields", () => {
    const out = generateConceptRemedial("Aditya", "Algebra", 35);
    expect(out).toHaveProperty("learning_gap");
    expect(out).toHaveProperty("prerequisite_chain");
    expect(out).toHaveProperty("remedial_plan");
    expect(typeof out.learning_gap).toBe("string");
    expect(typeof out.prerequisite_chain).toBe("string");
    expect(Array.isArray(out.remedial_plan)).toBe(true);
  });

  it("returns 4-6 remedial steps depending on severity", () => {
    expect(generateConceptRemedial("Kid", "Algebra", 25).remedial_plan.length).toBe(6); // very_weak
    expect(generateConceptRemedial("Kid", "Algebra", 40).remedial_plan.length).toBe(5); // weak
    expect(generateConceptRemedial("Kid", "Algebra", 55).remedial_plan.length).toBe(4); // borderline
  });
});

describe("generateConceptRemedial — student name handling", () => {
  it("uses the student's name in the gap diagnosis", () => {
    const out = generateConceptRemedial("Aditya", "Algebra", 40);
    expect(out.learning_gap).toMatch(/Aditya/);
  });

  it("falls back to 'the student' when name is empty / whitespace", () => {
    expect(generateConceptRemedial("", "Algebra", 40).learning_gap).toMatch(/the student/);
    expect(generateConceptRemedial("   ", "Algebra", 40).learning_gap).toMatch(/the student/);
  });
});

describe("generateConceptRemedial — severity bands (locked spec)", () => {
  it("very_weak (<30): mentions 'critical gap' and parent-loop step", () => {
    const out = generateConceptRemedial("Kid", "Algebra", 25);
    expect(out.learning_gap).toMatch(/critical gap/i);
    expect(out.remedial_plan.some(s => /parent/i.test(s))).toBe(true);
  });

  it("weak (30-49): mentions 'core idea' framing", () => {
    const out = generateConceptRemedial("Kid", "Algebra", 40);
    expect(out.learning_gap).toMatch(/core idea/i);
  });

  it("borderline (50-59): mentions 'partial understanding'", () => {
    const out = generateConceptRemedial("Kid", "Algebra", 55);
    expect(out.learning_gap).toMatch(/partial understanding/i);
  });

  it("severity boundary 30 lands in 'weak' (not 'very_weak')", () => {
    expect(generateConceptRemedial("Kid", "Algebra", 30).learning_gap).toMatch(/core idea/i);
  });

  it("severity boundary 50 lands in 'borderline' (not 'weak')", () => {
    expect(generateConceptRemedial("Kid", "Algebra", 50).learning_gap).toMatch(/partial understanding/i);
  });
});

describe("generateConceptRemedial — subject-area tailoring", () => {
  it("math topics get math-flavoured re-teach step", () => {
    const out = generateConceptRemedial("Kid", "Algebra", 40);
    expect(out.remedial_plan.some(s => /worked example|previous chapter/i.test(s))).toBe(true);
    expect(out.prerequisite_chain).toMatch(/numeric|operations/i);
  });

  it("science topics get diagram/demo language", () => {
    const out = generateConceptRemedial("Kid", "Photosynthesis", 40);
    expect(out.remedial_plan.some(s => /diagram|demo/i.test(s))).toBe(true);
  });

  it("language topics get grammar/structure language", () => {
    const out = generateConceptRemedial("Kid", "Tenses", 40);
    expect(out.remedial_plan.some(s => /grammar|structure/i.test(s))).toBe(true);
  });

  it("social_studies topics get timeline/map language", () => {
    const out = generateConceptRemedial("Kid", "Mughal Empire", 40);
    expect(out.remedial_plan.some(s => /timeline|map/i.test(s))).toBe(true);
  });
});

describe("generateConceptRemedial — defensive numeric handling", () => {
  it("clamps negative scores to 0 and treats as very_weak", () => {
    const out = generateConceptRemedial("Kid", "Algebra", -10);
    expect(out.learning_gap).toMatch(/0%/);
    expect(out.learning_gap).toMatch(/critical gap/i);
  });

  it("clamps scores >100 to 100", () => {
    const out = generateConceptRemedial("Kid", "Algebra", 150);
    expect(out.learning_gap).toMatch(/100%/);
  });

  it("treats NaN as 0 (worst-case)", () => {
    const out = generateConceptRemedial("Kid", "Algebra", Number.NaN);
    expect(out.learning_gap).toMatch(/0%/);
    expect(out.learning_gap).toMatch(/critical gap/i);
  });

  it("rounds non-integer scores", () => {
    const out = generateConceptRemedial("Kid", "Algebra", 42.7);
    expect(out.learning_gap).toMatch(/43%/);
  });
});

describe("generateConceptRemedial — determinism", () => {
  it("identical input produces identical output", () => {
    const a = generateConceptRemedial("Aditya", "Algebra", 45);
    const b = generateConceptRemedial("Aditya", "Algebra", 45);
    expect(a).toEqual(b);
  });
});

describe("generateConceptRemedial — concept title formatting", () => {
  it("formats snake_case concept titles in output", () => {
    const out = generateConceptRemedial("Kid", "linear_equations", 40);
    expect(out.learning_gap).toMatch(/Linear equations/);
  });

  it("handles empty concept title gracefully", () => {
    const out = generateConceptRemedial("Kid", "", 40);
    expect(out.learning_gap).toMatch(/this concept/);
  });
});
