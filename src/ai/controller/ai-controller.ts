import { generateTeacherDashboardInsights } from "../engines/dashboard-engine";
import { generateTeacherClassInsights } from "../engines/class-engine";
import { generateAssignmentCreationInsights, generateAssignmentGradingInsights } from "../engines/assignments-engine";
import { generateTestCreationInsights, generateResultAnalysisInsights } from "../engines/tests-engine";
import { generateConceptRemedialInsights, generateClassGapsInsights } from "../engines/concept-engine";
import { generateRosterSummariesInsights, generateStudentAnalyticsInsights } from "../engines/students-engine";
import { generateParentNoteInsights } from "../engines/parent-notes-engine";
import { generateClassReportCardsInsights, generateDetailedSubjectReportInsights } from "../engines/reports-engine";

// Memory caches
const dashboardCache = new Map<string, any>();

const NO_DATA_MSG = "AI insights will activate automatically once relevant academic and schedule data is available.";
const ERROR_MSG = "AI service is temporarily unavailable. Displaying standard data.";

export const AIController = {
  
  // 1. DASHBOARD INSIGHTS
  async getDashboardInsights(data: any): Promise<any> {
    if (!data || Object.keys(data).length === 0 || (Array.isArray(data) && data.length === 0)) {
       return { status: "no_data", message: NO_DATA_MSG };
    }

    let cacheKey = JSON.stringify(data);
    if (dashboardCache.has(cacheKey)) {
        return { status: "success", data: dashboardCache.get(cacheKey) };
    }

    try {
        const insights = await generateTeacherDashboardInsights(data);
        if (!insights) throw new Error("Null response from Teacher AI Engine");
        dashboardCache.set(cacheKey, insights);
        return { status: "success", data: insights };
    } catch (error) {
        console.error("[Teacher AI Controller] Dashboard Error:", error);
        return { status: "error", message: ERROR_MSG };
    }
  },

  // 2. CLASS INSIGHTS
  async getClassInsights(data: any): Promise<any> {
    if (!data || Object.keys(data).length === 0 || (Array.isArray(data) && data.length === 0)) {
       return { status: "no_data", message: NO_DATA_MSG };
    }

    let cacheKey = "class_" + JSON.stringify(data);
    if (dashboardCache.has(cacheKey)) {
        return { status: "success", data: dashboardCache.get(cacheKey) };
    }

    try {
        const insights = await generateTeacherClassInsights(data);
        if (!insights) throw new Error("Null response from Class AI Engine");
        dashboardCache.set(cacheKey, insights);
        return { status: "success", data: insights };
    } catch (error: any) {
        console.error("[Teacher AI Controller] Class Error:", error);
        return { status: "error", message: `AI Error: ${error?.message || ERROR_MSG}` };
    }
  },

  // 3. ASSIGNMENT CREATION INSIGHTS
  async getAssignmentCreation(data: any): Promise<any> {
    if (!data || Object.keys(data).length === 0) return { status: "no_data", message: NO_DATA_MSG };
    let cacheKey = "assign_c_" + JSON.stringify(data);
    if (dashboardCache.has(cacheKey)) return { status: "success", data: dashboardCache.get(cacheKey) };

    try {
        const insights = await generateAssignmentCreationInsights(data);
        if (!insights) throw new Error("Null response");
        dashboardCache.set(cacheKey, insights);
        return { status: "success", data: insights };
    } catch (error: any) {
        return { status: "error", message: `AI Error: ${error?.message || ERROR_MSG}` };
    }
  },

  // 4. ASSIGNMENT GRADING INSIGHTS
  async getAssignmentGrading(data: any): Promise<any> {
    if (!data || Object.keys(data).length === 0) return { status: "no_data", message: NO_DATA_MSG };
    let cacheKey = "assign_g_" + JSON.stringify(data);
    if (dashboardCache.has(cacheKey)) return { status: "success", data: dashboardCache.get(cacheKey) };

    try {
        const insights = await generateAssignmentGradingInsights(data);
        if (!insights) throw new Error("Null response");
        dashboardCache.set(cacheKey, insights);
        return { status: "success", data: insights };
    } catch (error: any) {
        return { status: "error", message: `AI Error: ${error?.message || ERROR_MSG}` };
    }
  },

  // 5. TEST CREATION INSIGHTS
  async getTestCreation(data: any): Promise<any> {
    if (!data || Object.keys(data).length === 0) return { status: "no_data", message: NO_DATA_MSG };
    let cacheKey = "test_c_" + JSON.stringify(data);
    if (dashboardCache.has(cacheKey)) return { status: "success", data: dashboardCache.get(cacheKey) };

    try {
        const insights = await generateTestCreationInsights(data);
        if (!insights) throw new Error("Null response");
        dashboardCache.set(cacheKey, insights);
        return { status: "success", data: insights };
    } catch (error: any) {
        return { status: "error", message: `AI Error: ${error?.message || ERROR_MSG}` };
    }
  },

  // 6. RESULT ANALYSIS INSIGHTS
  async getResultAnalysis(data: any): Promise<any> {
    if (!data || Object.keys(data).length === 0) return { status: "no_data", message: NO_DATA_MSG };
    let cacheKey = "res_a_" + JSON.stringify(data);
    if (dashboardCache.has(cacheKey)) return { status: "success", data: dashboardCache.get(cacheKey) };

    try {
        const insights = await generateResultAnalysisInsights(data);
        if (!insights) throw new Error("Null response");
        dashboardCache.set(cacheKey, insights);
        return { status: "success", data: insights };
    } catch (error: any) {
        return { status: "error", message: `AI Error: ${error?.message || ERROR_MSG}` };
    }
  },

  // 7. CONCEPT REMEDIAL INSIGHTS
  async getConceptRemedial(data: any): Promise<any> {
    if (!data || Object.keys(data).length === 0) return { status: "no_data", message: NO_DATA_MSG };
    let cacheKey = "conc_r_" + JSON.stringify(data);
    if (dashboardCache.has(cacheKey)) return { status: "success", data: dashboardCache.get(cacheKey) };

    try {
        const insights = await generateConceptRemedialInsights(data);
        if (!insights) throw new Error("Null response");
        dashboardCache.set(cacheKey, insights);
        return { status: "success", data: insights };
    } catch (error: any) {
        return { status: "error", message: `AI Error: ${error?.message || ERROR_MSG}` };
    }
  },

  // 8. CLASS GAPS INSIGHTS
  async getClassGaps(data: any): Promise<any> {
    if (!data || Object.keys(data).length === 0) return { status: "no_data", message: NO_DATA_MSG };
    let cacheKey = "conc_c_" + JSON.stringify(data);
    if (dashboardCache.has(cacheKey)) return { status: "success", data: dashboardCache.get(cacheKey) };

    try {
        const insights = await generateClassGapsInsights(data);
        if (!insights) throw new Error("Null response");
        dashboardCache.set(cacheKey, insights);
        return { status: "success", data: insights };
    } catch (error: any) {
        return { status: "error", message: `AI Error: ${error?.message || ERROR_MSG}` };
    }
  },

  // 9. ROSTER SUMMARIES INSIGHTS
  async getRosterSummaries(data: any): Promise<any> {
    if (!data || Object.keys(data).length === 0) return { status: "no_data", message: NO_DATA_MSG };
    let cacheKey = "roster_" + JSON.stringify(data);
    if (dashboardCache.has(cacheKey)) return { status: "success", data: dashboardCache.get(cacheKey) };

    try {
        const insights = await generateRosterSummariesInsights(data);
        if (!insights) throw new Error("Null response");
        dashboardCache.set(cacheKey, insights);
        return { status: "success", data: insights };
    } catch (error: any) {
        return { status: "error", message: `AI Error: ${error?.message || ERROR_MSG}` };
    }
  },

  // 10. STUDENT ANALYTICS INSIGHTS
  async getStudentAnalytics(data: any): Promise<any> {
    if (!data || Object.keys(data).length === 0) return { status: "no_data", message: NO_DATA_MSG };
    let cacheKey = "student_" + JSON.stringify(data);
    if (dashboardCache.has(cacheKey)) return { status: "success", data: dashboardCache.get(cacheKey) };

    try {
        const insights = await generateStudentAnalyticsInsights(data);
        if (!insights) throw new Error("Null response");
        dashboardCache.set(cacheKey, insights);
        return { status: "success", data: insights };
    } catch (error: any) {
        return { status: "error", message: `AI Error: ${error?.message || ERROR_MSG}` };
    }
  },

  // 11. PARENT NOTE GENERATOR INSIGHTS
  async getParentNoteGeneration(data: any): Promise<any> {
    if (!data || Object.keys(data).length === 0) return { status: "no_data", message: NO_DATA_MSG };
    let cacheKey = "note_" + JSON.stringify(data);
    if (dashboardCache.has(cacheKey)) return { status: "success", data: dashboardCache.get(cacheKey) };

    try {
        const insights = await generateParentNoteInsights(data);
        if (!insights) throw new Error("Null response");
        dashboardCache.set(cacheKey, insights);
        return { status: "success", data: insights };
    } catch (error: any) {
        return { status: "error", message: `AI Error: ${error?.message || ERROR_MSG}` };
    }
  },

  // 12. CLASS REPORT CARDS INSIGHTS
  async getClassReportCards(data: any): Promise<any> {
    if (!data || Object.keys(data).length === 0) return { status: "no_data", message: NO_DATA_MSG };
    let cacheKey = "bulk_report_" + JSON.stringify(data);
    if (dashboardCache.has(cacheKey)) return { status: "success", data: dashboardCache.get(cacheKey) };

    try {
        const insights = await generateClassReportCardsInsights(data);
        if (!insights) throw new Error("Null response");
        dashboardCache.set(cacheKey, insights);
        return { status: "success", data: insights };
    } catch (error: any) {
        return { status: "error", message: `AI Error: ${error?.message || ERROR_MSG}` };
    }
  },

  // 13. DETAILED SUBJECT REPORT INSIGHTS
  async getDetailedSubjectReport(data: any): Promise<any> {
    if (!data || Object.keys(data).length === 0) return { status: "no_data", message: NO_DATA_MSG };
    let cacheKey = "subj_report_" + JSON.stringify(data);
    if (dashboardCache.has(cacheKey)) return { status: "success", data: dashboardCache.get(cacheKey) };

    try {
        const insights = await generateDetailedSubjectReportInsights(data);
        if (!insights) throw new Error("Null response");
        dashboardCache.set(cacheKey, insights);
        return { status: "success", data: insights };
    } catch (error: any) {
        return { status: "error", message: `AI Error: ${error?.message || ERROR_MSG}` };
    }
  }

};
