import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import {
  collection, query, where, onSnapshot, getDocs,
  doc, getDoc, writeBatch,
  type QueryConstraint, type DocumentData,
} from "firebase/firestore";
import { auditedUpdate } from "../lib/auditedWrites";
import { getInitials } from "../lib/initials";
import { useAuth } from "../lib/AuthContext";
import {
  Loader2, Search, ChevronLeft, ChevronRight,
  Download, Edit2, Check, X,
  Calendar, FileText, GraduationCap, TrendingUp, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { toast } from "sonner";
const loadXLSX = () => import("xlsx");

const ITEMS_PER_PAGE = 5;

// Normalize any Firestore/plain date into JS Date or null.
const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  const maybeTs = v as { toDate?: () => Date; seconds?: number };
  if (typeof maybeTs.toDate === "function") {
    try { const d = maybeTs.toDate(); return isNaN(d.getTime()) ? null : d; } catch { return null; }
  }
  if (typeof maybeTs.seconds === "number") return new Date(maybeTs.seconds * 1000);
  const d = new Date(v as string | number | Date);
  return isNaN(d.getTime()) ? null : d;
};

const fmtShortDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const getStatus = (atnd: number, score: number, manual?: string) => {
  if (manual) return manual;
  if (atnd < 75 || score < 50) return "At Risk";
  if (atnd < 85 || score < 65) return "Needs Attention";
  return "Good Standing";
};

const statusStyle = (s: string) => {
  if (s === "Good Standing") return "text-emerald-700 bg-emerald-50";
  if (s === "Needs Attention") return "text-amber-700 bg-amber-50";
  return "text-rose-700 bg-rose-50";
};

const ClassDetail = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { teacherData } = useAuth();

  const [classInfo, setClassInfo] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Students");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const [editingRoll, setEditingRoll] = useState<string | null>(null);
  const [tempRoll, setTempRoll] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Subject inline editing
  const [editingSubject, setEditingSubject] = useState(false);
  const [tempSubject, setTempSubject] = useState("");
  const [isSavingSubject, setIsSavingSubject] = useState(false);

  const [stats, setStats] = useState({
    totalStudents: 0,
    attendanceRate: "—",
    avgScore: "—",
    atRiskCount: 0,
  });

  // Data for non-Students tabs
  const [attendanceLog, setAttendanceLog] = useState<DocumentData[]>([]);
  const [assignments, setAssignments]     = useState<DocumentData[]>([]);
  const [tests, setTests]                 = useState<DocumentData[]>([]);
  const [tabLoading, setTabLoading]       = useState(false);

  // Fetch class info
  useEffect(() => {
    if (!classId) return;
    getDoc(doc(db, "classes", classId))
      .then(snap => { if (snap.exists()) setClassInfo(snap.data()); })
      .catch(e => console.error("[ClassDetail] classInfo fetch failed", e));
  }, [classId]);

  // Fetch attendance log for this class (last 60 days)
  useEffect(() => {
    if (!classId || !teacherData?.schoolId) return;
    const schoolId = teacherData.schoolId;
    const branchId = teacherData.branchId as string | undefined;
    const SC: QueryConstraint[] = [where("schoolId", "==", schoolId)];
    if (branchId) SC.push(where("branchId", "==", branchId));

    const qAtt = query(collection(db, "attendance"), ...SC, where("classId", "==", classId));
    const unsub = onSnapshot(
      qAtt,
      snap => setAttendanceLog(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
      err => console.error("[ClassDetail] attendance subscription failed", err),
    );
    return () => unsub();
  }, [classId, teacherData?.schoolId, teacherData?.branchId]);

  // Fetch assignments for this class
  useEffect(() => {
    if (!classId || !teacherData?.schoolId) return;
    const schoolId = teacherData.schoolId;
    const branchId = teacherData.branchId as string | undefined;
    const SC: QueryConstraint[] = [where("schoolId", "==", schoolId)];
    if (branchId) SC.push(where("branchId", "==", branchId));

    const qA = query(collection(db, "assignments"), ...SC, where("classId", "==", classId));
    const unsub = onSnapshot(
      qA,
      snap => setAssignments(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
      err => console.error("[ClassDetail] assignments subscription failed", err),
    );
    return () => unsub();
  }, [classId, teacherData?.schoolId, teacherData?.branchId]);

  // Fetch tests for this class
  useEffect(() => {
    if (!classId || !teacherData?.schoolId) return;
    const schoolId = teacherData.schoolId;
    const branchId = teacherData.branchId as string | undefined;
    const SC: QueryConstraint[] = [where("schoolId", "==", schoolId)];
    if (branchId) SC.push(where("branchId", "==", branchId));

    const qT = query(collection(db, "tests"), ...SC, where("classId", "==", classId));
    const unsub = onSnapshot(
      qT,
      snap => setTests(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
      err => console.error("[ClassDetail] tests subscription failed", err),
    );
    return () => unsub();
  }, [classId, teacherData?.schoolId, teacherData?.branchId]);

  // Mark the tab loading state when switching — purely cosmetic.
  useEffect(() => {
    setTabLoading(true);
    const t = setTimeout(() => setTabLoading(false), 120);
    return () => clearTimeout(t);
  }, [activeTab]);

  // Fetch students + compute metrics
  useEffect(() => {
    if (!classId || !teacherData?.schoolId) return;
    const schoolId = teacherData.schoolId;

    const q = query(
      collection(db, "enrollments"),
      where("schoolId", "==", schoolId),
      where("classId", "==", classId),
    );
    let ignore = false;
    const unsub = onSnapshot(q, async (snap) => {
      const roster = snap.docs.map(d => ({ ...d.data(), id: d.id } as Record<string, unknown> & { id: string }));

      const enriched = await Promise.all(roster.map(async (s: Record<string, unknown> & { id: string }) => {
        const sid = s.studentId;
        const email = s.studentEmail?.toLowerCase();

        // Attendance
        const attQueries = await Promise.all([
          sid ? getDocs(query(collection(db, "attendance"), where("schoolId", "==", schoolId), where("studentId", "==", sid), where("classId", "==", classId))) : Promise.resolve({ docs: [] }),
          email ? getDocs(query(collection(db, "attendance"), where("schoolId", "==", schoolId), where("studentEmail", "==", email), where("classId", "==", classId))) : Promise.resolve({ docs: [] }),
        ]);
        const uniqueAtt = Array.from(new Map([...attQueries[0].docs, ...attQueries[1].docs].map(d => [d.id, d.data()])).values());
        const present = uniqueAtt.filter((d: any) => d.status === "present" || d.status === "late").length;
        const atndRaw = uniqueAtt.length > 0 ? (present / uniqueAtt.length) * 100 : -1;

        // Scores — try test_scores first, fallback to results
        const scoreQueries = await Promise.all([
          sid ? getDocs(query(collection(db, "test_scores"), where("schoolId", "==", schoolId), where("studentId", "==", sid))) : Promise.resolve({ docs: [] }),
          email ? getDocs(query(collection(db, "test_scores"), where("schoolId", "==", schoolId), where("studentEmail", "==", email))) : Promise.resolve({ docs: [] }),
          sid ? getDocs(query(collection(db, "results"), where("schoolId", "==", schoolId), where("studentId", "==", sid), where("classId", "==", classId))) : Promise.resolve({ docs: [] }),
          email ? getDocs(query(collection(db, "results"), where("schoolId", "==", schoolId), where("studentEmail", "==", email), where("classId", "==", classId))) : Promise.resolve({ docs: [] }),
        ]);
        const uniqueScores = Array.from(new Map([
          ...scoreQueries[0].docs, ...scoreQueries[1].docs,
          ...scoreQueries[2].docs, ...scoreQueries[3].docs
        ].map(d => [d.id, d.data()])).values());
        const totalScore = uniqueScores.reduce((acc, r: any) => acc + parseFloat(r.percentage || r.score || 0), 0);
        const scoreRaw = uniqueScores.length > 0 ? totalScore / uniqueScores.length : -1;

        const initials = getInitials((s as { studentName?: string }).studentName || "ST");

        const atndDisplay = atndRaw >= 0 ? `${atndRaw.toFixed(1)}%` : "—";
        const scoreDisplay = scoreRaw >= 0 ? `${scoreRaw.toFixed(1)}%` : "—";
        const status = getStatus(atndRaw >= 0 ? atndRaw : 100, scoreRaw >= 0 ? scoreRaw : 100, s.manualStatus);

        return { ...s, initials, atndRaw, scoreRaw, attendance: atndDisplay, avg: scoreDisplay, status };
      }));

      if (ignore) return;
      setStudents(enriched);

      const totalAtnd = enriched.filter(s => s.atndRaw >= 0).reduce((a, s) => a + s.atndRaw, 0);
      const atndCount = enriched.filter(s => s.atndRaw >= 0).length;
      const totalScore = enriched.filter(s => s.scoreRaw >= 0).reduce((a, s) => a + s.scoreRaw, 0);
      const scoreCount = enriched.filter(s => s.scoreRaw >= 0).length;
      const atRisk = enriched.filter(s => s.status === "At Risk").length;

      setStats({
        totalStudents: enriched.length,
        attendanceRate: atndCount > 0 ? `${(totalAtnd / atndCount).toFixed(1)}%` : "—",
        avgScore: scoreCount > 0 ? `${(totalScore / scoreCount).toFixed(1)}%` : "—",
        atRiskCount: atRisk,
      });
      setLoading(false);
    });

    return () => { ignore = true; unsub(); };
  }, [classId, teacherData?.schoolId]);

  // Save subject → update classes doc + all enrollment docs for this class
  const handleSaveSubject = async () => {
    if (!tempSubject.trim() || !classId) return;
    setIsSavingSubject(true);
    try {
      // 1. Update the class document
      await auditedUpdate(doc(db, "classes", classId), { subject: tempSubject.trim() });

      // 2. Batch update all enrollments for this class
      const enrollSnap = await getDocs(query(
        collection(db, "enrollments"),
        where("schoolId", "==", teacherData?.schoolId),
        where("classId", "==", classId),
      ));
      if (enrollSnap.docs.length > 0) {
        const batch = writeBatch(db);
        enrollSnap.docs.forEach(d => batch.update(d.ref, { subject: tempSubject.trim() }));
        await batch.commit();
      }

      setClassInfo((prev: Record<string, unknown> | null) => ({ ...(prev ?? {}), subject: tempSubject.trim() }));
      setEditingSubject(false);
      toast.success(`Subject updated to "${tempSubject.trim()}" for all enrollments.`);
    } catch (e) {
      console.error("[ClassDetail] update subject failed", e);
      toast.error("Failed to update subject.");
    } finally {
      setIsSavingSubject(false);
    }
  };

  const handleUpdateRoll = async (id: string) => {
    setIsUpdating(true);
    try {
      await auditedUpdate(doc(db, "enrollments", id), { rollNo: tempRoll });
      toast.success("Roll number updated.");
      setEditingRoll(null);
    } catch (e) {
      console.error("[ClassDetail] update roll failed", e);
      toast.error("Failed to update roll number.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleStatus = async (id: string, current: string) => {
    const statuses = ["Good Standing", "Needs Attention", "At Risk"];
    const next = statuses[(statuses.indexOf(current) + 1) % statuses.length];
    try {
      await auditedUpdate(doc(db, "enrollments", id), { manualStatus: next });
      toast.success(`Status updated to ${next}`);
    } catch (e) {
      console.error("[ClassDetail] toggle status failed", e);
      toast.error("Failed to update status.");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = students.map(s => ({
        "Student Name": s.studentName,
        "Email": s.studentEmail,
        "Roll No": s.rollNo || "—",
        "Attendance": s.attendance,
        "Avg Score": s.avg,
        "Status": s.status,
      }));
      const XLSX = await loadXLSX();

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      // Sanitize class name for filename — avoid OS path-separator issues.
      const rawName = (classInfo as { name?: string } | null)?.name || "Class";
      const safeName = rawName.replace(/[\\/:*?"<>|]/g, "_").trim() || "Class";
      XLSX.writeFile(wb, `${safeName}_Roster.xlsx`);
      toast.success("Roster exported!");
    } catch (e) {
      console.error("[ClassDetail] export failed", e);
      toast.error("Export failed.");
    } finally {
      setExporting(false);
    }
  };

  // Pagination
  const filtered = useMemo(() =>
    students.filter(s => s.studentName?.toLowerCase().includes(searchQuery.toLowerCase())),
    [students, searchQuery]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const goPage = (p: number) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  // ── Attendance tab aggregation: group by date → present/absent/late counts ──
  const attendanceByDate = useMemo(() => {
    type DayRow = { date: string; dateObj: Date; present: number; absent: number; late: number; total: number };
    const byDate = new Map<string, DayRow>();
    attendanceLog.forEach(r => {
      const date = (r as { date?: string }).date;
      if (!date) return;
      let row = byDate.get(date);
      if (!row) {
        const d = toDate(date) || new Date(date);
        row = { date, dateObj: d, present: 0, absent: 0, late: 0, total: 0 };
        byDate.set(date, row);
      }
      const s = (r as { status?: string }).status;
      if (s === "present") row.present++;
      else if (s === "absent") row.absent++;
      else if (s === "late") row.late++;
      row.total++;
    });
    return Array.from(byDate.values()).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [attendanceLog]);

  // ── Assignments tab aggregation: attach submission-counts + due-status ──
  const assignmentsView = useMemo(() => {
    const rosterSize = stats.totalStudents;
    return [...assignments]
      .map(a => {
        const due = toDate((a as { dueDate?: unknown; deadline?: unknown }).dueDate ?? (a as { deadline?: unknown }).deadline);
        const status = (a as { status?: string }).status || "Active";
        return {
          id: (a as { id: string }).id,
          title: (a as { title?: string }).title || "Untitled",
          due,
          dueLabel: due ? fmtShortDate(due) : "—",
          isPastDue: !!(due && due.getTime() < Date.now()),
          status,
          rosterSize,
        };
      })
      .sort((a, b) => (b.due?.getTime() || 0) - (a.due?.getTime() || 0));
  }, [assignments, stats.totalStudents]);

  // ── Tests tab aggregation: upcoming vs completed, sorted by test date ──
  const testsView = useMemo(() =>
    [...tests]
      .map(t => {
        const when = toDate((t as { testDate?: unknown; date?: unknown; createdAt?: unknown }).testDate ?? (t as { date?: unknown }).date ?? (t as { createdAt?: unknown }).createdAt);
        return {
          id: (t as { id: string }).id,
          title: (t as { title?: string; testName?: string }).title || (t as { testName?: string }).testName || "Untitled test",
          subject: (t as { subject?: string }).subject || "",
          when,
          dateLabel: when ? fmtShortDate(when) : "—",
          marks: (t as { marks?: string | number }).marks,
          classAverage: Number((t as { classAverage?: number }).classAverage ?? 0),
          status: (t as { status?: string }).status || "Upcoming",
        };
      })
      .sort((a, b) => (b.when?.getTime() || 0) - (a.when?.getTime() || 0)),
  [tests]);

  // ── Performance tab aggregation: top/bottom performers + distribution ──
  const performanceView = useMemo(() => {
    const withScores = students.filter(s => s.scoreRaw >= 0);
    const sortedByScore = [...withScores].sort((a, b) => b.scoreRaw - a.scoreRaw);
    const top = sortedByScore.slice(0, 5);
    const bottom = [...sortedByScore].reverse().slice(0, 5);
    const dist = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    withScores.forEach(s => {
      const p = s.scoreRaw;
      if (p >= 85) dist.A++;
      else if (p >= 70) dist.B++;
      else if (p >= 55) dist.C++;
      else if (p >= 40) dist.D++;
      else dist.F++;
    });
    const avg = withScores.length > 0
      ? withScores.reduce((acc, s) => acc + s.scoreRaw, 0) / withScores.length
      : 0;
    return { top, bottom, dist, avg, count: withScores.length };
  }, [students]);

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#1e3272] animate-spin" />
    </div>
  );

  return (
    <div className="text-left space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{classInfo?.name || "Class"}</h1>

          {/* Subject — inline editable */}
          <div className="flex items-center gap-2 mt-1">
            {editingSubject ? (
              <>
                <input
                  autoFocus
                  value={tempSubject}
                  onChange={e => setTempSubject(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSaveSubject(); if (e.key === "Escape") setEditingSubject(false); }}
                  placeholder="e.g. Mathematics"
                  className="h-8 px-3 text-sm border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 w-44"
                />
                <button type="button"
                  onClick={handleSaveSubject}
                  disabled={isSavingSubject}
                  className="h-8 px-3 bg-[#1e3272] text-white rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-[#162558]"
                >
                  {isSavingSubject ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save
                </button>
                <button type="button" onClick={() => setEditingSubject(false)} className="h-8 px-2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button type="button"
                onClick={() => { setTempSubject(classInfo?.subject || teacherData?.subject || ""); setEditingSubject(true); }}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3272] group"
              >
                <span className={classInfo?.subject ? "text-slate-600 font-medium" : "text-slate-400 italic"}>
                  {classInfo?.subject || teacherData?.subject || "Set subject..."}
                </span>
                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
            <span className="text-slate-300">•</span>
            <span className="text-sm text-slate-500">{stats.totalStudents} Students</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center gap-2"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export
          </button>
          <button type="button"
            onClick={() => navigate("/attendance")}
            className="px-5 py-2.5 bg-[#1e3272] text-white rounded-xl text-sm font-semibold hover:bg-[#162558] transition-all"
          >
            Mark Attendance
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-slate-200">
        {["Students", "Attendance", "Assignments", "Tests", "Performance"].map(tab => (
          <button type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-semibold relative transition-colors ${
              activeTab === tab ? "text-[#1e3272]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#1e3272] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: stats.totalStudents, color: "bg-blue-100", route: "/students" },
          { label: "Attendance", value: stats.attendanceRate, color: "bg-emerald-100", route: "/attendance" },
          { label: "Avg. Score", value: stats.avgScore, color: "bg-blue-100", route: "/gradebook" },
          { label: "At Risk", value: stats.atRiskCount, color: "bg-rose-100", route: "/risks-alerts" },
        ].map(card => (
          <div
            key={card.label}
            onClick={() => navigate(card.route)}
            role="button"
            tabIndex={0}
            className="clickable-card bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4"
          >
            <div className={`w-12 h-12 rounded-xl flex-shrink-0 ${card.color}`} />
            <div>
              <p className="text-2xl font-bold text-slate-800 leading-none mb-1">{card.value}</p>
              <p className="text-xs text-slate-500 font-medium">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Students Tab Content */}
      {activeTab === "Students" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">Student List</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-9 pr-4 h-9 w-44 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button type="button"
                onClick={() => navigate("/students")}
                className="px-4 h-9 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Add Student
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500">Student</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Roll No</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Attendance</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Avg. Score</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-sm">
                      No students found
                    </td>
                  </tr>
                ) : (
                  paginated.map(s => (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/students?studentId=${s.studentId || s.id}`)}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-400 mb-1">{s.initials}</span>
                          <span className="text-sm font-semibold text-slate-800">{s.studentName}</span>
                          <span className="text-xs text-slate-400">{s.studentEmail}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {editingRoll === s.id ? (
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              className="w-16 h-7 text-center text-xs border border-slate-200 rounded-lg outline-none"
                              value={tempRoll}
                              onChange={e => setTempRoll(e.target.value)}
                              autoFocus
                            />
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleUpdateRoll(s.id); }} disabled={isUpdating} className="text-emerald-500 hover:text-emerald-600">
                              {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setEditingRoll(null); }} className="text-slate-300 hover:text-slate-500">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center justify-center gap-1 cursor-pointer group/roll"
                            onClick={(e) => { e.stopPropagation(); setEditingRoll(s.id); setTempRoll(s.rollNo || ""); }}
                          >
                            <span className="text-sm font-medium text-slate-700">{s.rollNo || "—"}</span>
                            <Edit2 size={10} className="text-slate-300 opacity-0 group-hover/roll:opacity-100" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-slate-700">{s.attendance}</td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-slate-700">{s.avg}</td>
                      <td className="px-6 py-4 text-center">
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); handleToggleStatus(s.id, s.status); }}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${statusStyle(s.status)}`}
                        >
                          {s.status}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(`/students?studentId=${s.studentId || s.id}`); }}
                          className="text-sm font-semibold text-[#1e3272] hover:underline"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} students
            </p>
            <div className="flex items-center gap-2">
              <button type="button"
                onClick={() => goPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button type="button"
                    key={p}
                    onClick={() => goPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                      p === currentPage
                        ? "bg-[#1e3272] text-white"
                        : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button type="button"
                onClick={() => goPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === "Attendance" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1e3272]" aria-hidden="true" />
              <h2 className="text-base font-bold text-slate-800">Attendance log</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/attendance")}
              className="px-3 h-8 bg-[#1e3272] text-white rounded-lg text-xs font-semibold hover:bg-[#162558]"
            >
              Mark today
            </button>
          </div>
          {tabLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#1e3272]" aria-hidden="true" />
            </div>
          ) : attendanceByDate.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No attendance marked for this class yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" aria-label="Attendance log">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500">Date</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Present</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Absent</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Late</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceByDate.slice(0, 30).map(row => {
                    const presentish = row.present + row.late;
                    const rate = row.total > 0 ? (presentish / row.total) * 100 : 0;
                    const rateColor = rate >= 85 ? "text-emerald-600" : rate >= 70 ? "text-amber-600" : "text-rose-600";
                    return (
                      <tr key={row.date} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-800">{fmtShortDate(row.dateObj)}</span>
                            <span className="text-[10px] text-slate-400">{row.dateObj.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                            <CheckCircle2 size={14} aria-hidden="true" /> {row.present}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-rose-700">
                            <XCircle size={14} aria-hidden="true" /> {row.absent}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700">
                            <Clock size={14} aria-hidden="true" /> {row.late}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-center text-sm font-bold ${rateColor}`}>
                          {rate.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {attendanceByDate.length > 30 && (
                <div className="px-6 py-3 text-center text-xs text-slate-400 border-t border-slate-100">
                  Showing last 30 days of {attendanceByDate.length} total
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === "Assignments" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1e3272]" aria-hidden="true" />
              <h2 className="text-base font-bold text-slate-800">Assignments ({assignmentsView.length})</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/assignments")}
              className="px-3 h-8 bg-[#1e3272] text-white rounded-lg text-xs font-semibold hover:bg-[#162558]"
            >
              Manage
            </button>
          </div>
          {tabLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#1e3272]" aria-hidden="true" />
            </div>
          ) : assignmentsView.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No assignments created for this class yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {assignmentsView.map(a => {
                const stale = a.isPastDue && a.status === "Active";
                return (
                  <div
                    key={a.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{a.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Due {a.dueLabel}
                        {a.rosterSize > 0 && <> · {a.rosterSize} students assigned</>}
                      </p>
                    </div>
                    <span
                      className={`ml-4 px-3 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${
                        stale ? "bg-rose-50 text-rose-700"
                        : a.status === "Fully Submitted" ? "bg-emerald-50 text-emerald-700"
                        : a.status === "Active" ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {stale ? "Overdue" : a.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tests Tab */}
      {activeTab === "Tests" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#1e3272]" aria-hidden="true" />
              <h2 className="text-base font-bold text-slate-800">Tests ({testsView.length})</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/tests")}
              className="px-3 h-8 bg-[#1e3272] text-white rounded-lg text-xs font-semibold hover:bg-[#162558]"
            >
              Manage
            </button>
          </div>
          {tabLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#1e3272]" aria-hidden="true" />
            </div>
          ) : testsView.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No tests scheduled for this class yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" aria-label="Tests list">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500">Title</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500">Subject</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Date</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Max</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Class avg</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {testsView.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-800">{t.title}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{t.subject || "—"}</td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600">{t.dateLabel}</td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-slate-700">{t.marks ?? "—"}</td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-slate-700">
                        {t.classAverage > 0 ? `${t.classAverage.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          t.status === "Completed" ? "bg-emerald-50 text-emerald-700" :
                          t.status === "Upcoming" ? "bg-blue-50 text-blue-700" :
                          "bg-slate-100 text-slate-500"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === "Performance" && (
        <div className="space-y-4">
          {/* Summary header */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-[#1e3272]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 leading-none">
                {performanceView.count > 0 ? `${performanceView.avg.toFixed(1)}%` : "—"}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Class average across {performanceView.count} students with data
              </p>
            </div>
          </div>

          {performanceView.count === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400 text-sm shadow-sm">
              No scores recorded for this class yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Grade distribution */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Grade distribution</h3>
                <div className="space-y-3">
                  {[
                    { g: "A", range: "85-100%", count: performanceView.dist.A, color: "bg-emerald-500" },
                    { g: "B", range: "70-84%",  count: performanceView.dist.B, color: "bg-blue-500" },
                    { g: "C", range: "55-69%",  count: performanceView.dist.C, color: "bg-amber-500" },
                    { g: "D", range: "40-54%",  count: performanceView.dist.D, color: "bg-orange-500" },
                    { g: "F", range: "<40%",    count: performanceView.dist.F, color: "bg-rose-500" },
                  ].map(row => {
                    const pct = performanceView.count > 0 ? (row.count / performanceView.count) * 100 : 0;
                    return (
                      <div key={row.g} className="flex items-center gap-3">
                        <span className="w-6 text-sm font-bold text-slate-700">{row.g}</span>
                        <span className="w-20 text-xs text-slate-400">{row.range}</span>
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${row.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-10 text-xs font-semibold text-slate-600 text-right">{row.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top & bottom performers */}
              <div className="space-y-4">
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Top performers</h3>
                  {performanceView.top.length === 0 ? (
                    <p className="text-xs text-slate-400">No scores yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {performanceView.top.map(s => (
                        <li key={s.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700 truncate">{s.studentName}</span>
                          <span className="text-emerald-700 font-bold ml-2">{s.avg}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Needs attention</h3>
                  {performanceView.bottom.length === 0 ? (
                    <p className="text-xs text-slate-400">No scores yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {performanceView.bottom.map(s => (
                        <li key={s.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700 truncate">{s.studentName}</span>
                          <span className="text-rose-700 font-bold ml-2">{s.avg}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClassDetail;
