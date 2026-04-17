import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OfflineBanner } from "./components/OfflineBanner";
import { GraduationCap, Loader2 } from "lucide-react";
import TeacherLayout from "./components/TeacherLayout";

// ── Lazy-loaded pages (code splitting) ────────────────────────────────────────
const Dashboard          = lazy(() => import("./pages/Dashboard"));
const MyClasses          = lazy(() => import("./pages/MyClasses"));
const ClassDetail        = lazy(() => import("./pages/ClassDetail"));
const Attendance         = lazy(() => import("./pages/Attendance"));
const Assignments        = lazy(() => import("./pages/Assignments"));
const TestsExams         = lazy(() => import("./pages/TestsExams"));
const Students           = lazy(() => import("./pages/Students"));
const Gradebook          = lazy(() => import("./pages/Gradebook"));
const ConceptMastery     = lazy(() => import("./pages/ConceptMastery"));
const RisksAlerts        = lazy(() => import("./pages/RisksAlerts"));
const ParentNotes        = lazy(() => import("./pages/ParentNotes"));
const PrincipalNotes     = lazy(() => import("./pages/PrincipalNotes"));
const Reports            = lazy(() => import("./pages/Reports"));
const SettingsPage       = lazy(() => import("./pages/SettingsPage"));
const LessonPlanGenerator = lazy(() => import("./pages/LessonPlanGenerator"));
const SummarizeLesson    = lazy(() => import("./pages/SummarizeLesson"));
const Syllabus           = lazy(() => import("./pages/Syllabus"));
const NotFound           = lazy(() => import("./pages/NotFound"));
const Login              = lazy(() => import("./pages/Login"));

// ── Page loader ───────────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-[#1e3272]" />
  </div>
);

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-[#1e3272] flex items-center justify-center text-white animate-bounce shadow-xl">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <Loader2 className="w-6 h-6 animate-spin text-[#1e3272]" />
          <p className="text-xs font-black text-[#1e294b] uppercase tracking-widest mt-2">Checking Access</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<TeacherLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/my-classes" element={<MyClasses />} />
          <Route path="/my-classes/:classId" element={<ClassDetail />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/tests" element={<TestsExams />} />
          <Route path="/students" element={<Students />} />
          <Route path="/gradebook" element={<Gradebook />} />
          <Route path="/concept-mastery" element={<ConceptMastery />} />
          <Route path="/risks-alerts" element={<RisksAlerts />} />
          <Route path="/parent-notes" element={<ParentNotes />} />
          <Route path="/principal-notes" element={<PrincipalNotes />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/lesson-planner" element={<LessonPlanGenerator />} />
          <Route path="/summarize-lesson" element={<SummarizeLesson />} />
          <Route path="/syllabus" element={<Syllabus />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
            <OfflineBanner />
            <AppRoutes />
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;