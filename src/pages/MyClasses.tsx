import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { db } from "../lib/firebase";
import {
  collection, query, where, onSnapshot, getDocs,
  type QueryConstraint, type DocumentData,
} from "firebase/firestore";

type ClassDoc = DocumentData & { id: string };
type EnrollmentDoc = DocumentData & { id: string; classId?: string };
type AttendanceDoc = DocumentData & { id: string; classId?: string; status?: string };
type ScoreDoc = DocumentData & { id: string; classId?: string; score?: number; percentage?: number };
import {
  Loader2, Search, BarChart2, TrendingUp, Calendar,
  Users, CheckCircle, AlertCircle, LayoutGrid, Home, Bell, GraduationCap, Sparkles
} from "lucide-react";

type FilterType = "All" | "Active" | "Attention";

const getSemesterLabel = () => {
  const month = new Date().getMonth();
  const year  = new Date().getFullYear();
  return `${month < 6 ? "Spring" : "Fall"} Semester · ${year}`;
};

// Blue Apple tokens (shared mobile + desktop)
const B1 = "#0055FF", B2 = "#1166FF", B3 = "#2277FF", B4 = "#4499FF";
const BG_D = "#EEF4FF", BG2_D = "#E0ECFF";
const TT1 = "#001040", TT2 = "#002080", TT3 = "#5070B0", TT4 = "#99AACC";
const GREEN = "#00C853", GREEN_D_COL = "#007830";
const RED = "#FF3355";
const ORANGE = "#FF8800";
const VIOLET = "#6B21E8";
const BLUE_BDR = "rgba(0,85,255,0.12)";
const SEP_D = "rgba(0,85,255,0.07)";
const SH_D = "0 0 0 0.5px rgba(0,85,255,0.08), 0 2px 8px rgba(0,85,255,0.09), 0 10px 28px rgba(0,85,255,0.11)";
const SH_LG_D = "0 0 0 0.5px rgba(0,85,255,0.10), 0 4px 16px rgba(0,85,255,0.12), 0 18px 44px rgba(0,85,255,0.14)";
const SH_BTN_D = "0 6px 22px rgba(0,85,255,0.42), 0 2px 6px rgba(0,85,255,0.22)";
const FONT_D = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";

const CARD_GRADS = [
  { bg: `linear-gradient(135deg, ${B1}, ${B3})`, sh: "0 3px 10px rgba(0,85,255,0.28)", glow: "rgba(0,85,255,0.08)" },
  { bg: `linear-gradient(135deg, ${VIOLET}, #A87FF8)`, sh: "0 3px 10px rgba(107,33,232,0.28)", glow: "rgba(107,33,232,0.08)" },
  { bg: `linear-gradient(135deg, ${ORANGE}, #FFCC22)`, sh: "0 3px 10px rgba(255,136,0,0.28)", glow: "rgba(255,136,0,0.08)" },
  { bg: `linear-gradient(135deg, ${GREEN}, #22EE66)`, sh: "0 3px 10px rgba(0,200,83,0.28)", glow: "rgba(0,200,83,0.08)" },
  { bg: `linear-gradient(135deg, ${RED}, #FF6688)`, sh: "0 3px 10px rgba(255,51,85,0.28)", glow: "rgba(255,51,85,0.08)" },
];

const MyClasses = () => {
  const navigate = useNavigate();
  const { teacherData } = useAuth();

  const [classes, setClasses]                     = useState<ClassDoc[]>([]);
  const [enrollments, setEnrollments]             = useState<EnrollmentDoc[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceDoc[]>([]);
  const [scoresRecords, setScoresRecords]         = useState<ScoreDoc[]>([]);
  const [startTimesMap, setStartTimesMap]         = useState<Map<string, string>>(new Map());
  const [loading, setLoading]                     = useState(true);
  const [searchQuery, setSearchQuery]             = useState("");
  const [filter, setFilter]                       = useState<FilterType>("All");

  useEffect(() => {
    if (!teacherData?.id || !teacherData?.schoolId) return;
    const schoolId = teacherData.schoolId;
    const branchId = teacherData.branchId as string | undefined;
    const BC: QueryConstraint[] = branchId ? [where("branchId", "==", branchId)] : [];

    const qAssign = query(
      collection(db, "teaching_assignments"),
      where("schoolId", "==", schoolId),
      ...BC,
      where("teacherId", "==", teacherData.id),
      where("status", "==", "active")
    );

    // Guard against stale getDocs responses overwriting newer snapshot state.
    let ignore = false;
    const unsubAssign = onSnapshot(qAssign, async (snap) => {
      const assignedIds = snap.docs.map(d => d.data().classId).filter(Boolean);

      const timesMap = new Map<string, string>();
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.classId && (data.startTime || data.scheduleTime)) {
          timesMap.set(data.classId, data.startTime || data.scheduleTime);
        }
      });
      if (ignore) return;
      setStartTimesMap(timesMap);

      const legacySnap = await getDocs(query(
        collection(db, "classes"),
        where("schoolId", "==", schoolId),
        ...BC,
        where("teacherId", "==", teacherData.id),
      ));
      if (ignore) return;
      const legacyIds  = legacySnap.docs.map(d => d.id);
      const allIds     = Array.from(new Set([...assignedIds, ...legacyIds]));
      if (allIds.length === 0) { setClasses([]); setLoading(false); return; }
      // Scoped class fetch — was previously a bare collection() call which
      // loaded every school's classes into the browser.
      const classSnap  = await getDocs(query(
        collection(db, "classes"),
        where("schoolId", "==", schoolId),
        ...BC,
      ));
      if (ignore) return;
      setClasses(classSnap.docs.filter(d => allIds.includes(d.id)).map(d => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });

    const unsubEnrol = onSnapshot(
      query(collection(db, "enrollments"), where("schoolId", "==", schoolId), ...BC, where("teacherId", "==", teacherData.id)),
      (snap) => setEnrollments(snap.docs.map(d => ({ ...d.data(), id: d.id })))
    );
    const unsubAtnd = onSnapshot(
      query(collection(db, "attendance"), where("schoolId", "==", schoolId), ...BC, where("teacherId", "==", teacherData.id)),
      (snap) => setAttendanceRecords(snap.docs.map(d => ({ ...d.data(), id: d.id })))
    );
    const unsubScores = onSnapshot(
      query(collection(db, "test_scores"), where("schoolId", "==", schoolId), ...BC, where("teacherId", "==", teacherData.id)),
      (snap) => setScoresRecords(snap.docs.map(d => ({ ...d.data(), id: d.id })))
    );

    return () => { ignore = true; unsubAssign(); unsubEnrol(); unsubAtnd(); unsubScores(); };
  }, [teacherData?.id, teacherData?.schoolId, teacherData?.branchId]);

  const getMetrics = (classId: string) => {
    const attArr   = attendanceRecords.filter(r => r.classId === classId);
    const present  = attArr.filter(r => r.status === "present" || r.status === "late").length;
    const atndRaw  = attArr.length > 0 ? (present / attArr.length) * 100 : -1;

    const scoreArr   = scoresRecords.filter(r => r.classId === classId);
    const totalScore = scoreArr.reduce((acc, r) => acc + parseFloat(String(r.percentage ?? r.score ?? 0)), 0);
    const perfRaw    = scoreArr.length > 0 ? totalScore / scoreArr.length : -1;

    const studentCount = enrollments.filter(e => e.classId === classId).length;
    const isAttention  = atndRaw >= 0 && atndRaw < 85;

    return {
      atndDisplay: atndRaw >= 0 ? `${atndRaw.toFixed(1)}%` : "—",
      perfDisplay: perfRaw >= 0 ? `${perfRaw.toFixed(1)}%` : "—",
      atndRaw,
      perfRaw,
      studentCount,
      isAttention,
    };
  };

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center" style={{ background: BG_D }}>
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: B1 }} />
    </div>
  );

  // 3D tilt handlers (desktop)
  const handle3DEnter = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.transition = "transform 0.06s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.2s ease";
  };
  const handle3DMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotX = (((y / rect.height) - 0.5) * -7).toFixed(2);
    const rotY = (((x / rect.width) - 0.5) * 7).toFixed(2);
    el.style.transform = `perspective(1100px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-3px) scale(1.006)`;
    const glow = el.querySelector<HTMLDivElement>('[data-glow]');
    if (glow) {
      glow.style.opacity = "1";
      glow.style.background = `radial-gradient(420px circle at ${x}px ${y}px, rgba(0,85,255,0.13), transparent 45%)`;
    }
  };
  const handle3DLeave = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.transition = "transform 0.5s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.3s ease";
    el.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)";
    const glow = el.querySelector<HTMLDivElement>('[data-glow]');
    if (glow) glow.style.opacity = "0";
  };

  const teacherInitial = (teacherData?.name?.[0] || "T").toUpperCase();

  // ── Derived header values ────────────────────────────────────────
  const allMetrics    = classes.map(cls => getMetrics(cls.id));
  const totalStudents = allMetrics.reduce((s, m) => s + m.studentCount, 0);

  const validAtnd = allMetrics.map(m => m.atndRaw).filter(r => r >= 0);
  const avgAtnd   = validAtnd.length > 0 ? validAtnd.reduce((s, v) => s + v, 0) / validAtnd.length : -1;
  const avgAtndStr = avgAtnd >= 0 ? `${avgAtnd.toFixed(1)}%` : "—";

  const validPerf = allMetrics.map(m => m.perfRaw).filter(r => r >= 0);
  const avgPerf   = validPerf.length > 0 ? validPerf.reduce((s, v) => s + v, 0) / validPerf.length : -1;
  const avgPerfStr = avgPerf >= 0 ? `${avgPerf.toFixed(1)}%` : "—";

  const attentionCount = allMetrics.filter(m => m.isAttention).length;
  const activeCount = classes.length - attentionCount;

  const filteredClasses = classes.filter(cls => {
    const nameMatch = cls.name?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!nameMatch) return false;
    if (filter === "All") return true;
    const { isAttention } = getMetrics(cls.id);
    return filter === "Attention" ? isAttention : !isAttention;
  });

  const filterChips: { key: FilterType; label: string; Icon: typeof LayoutGrid }[] = [
    { key: "All",       label: `All (${classes.length})`, Icon: LayoutGrid   },
    { key: "Active",    label: "Active",                  Icon: CheckCircle  },
    { key: "Attention", label: "Attention",               Icon: AlertCircle  },
  ];

  return (
    <div style={{ fontFamily: FONT_D, background: BG_D }} className="min-h-screen text-left">

      {/* ═══════════════════ MOBILE VIEW — Blue Apple ═══════════════════ */}
      <div className="md:hidden animate-in fade-in duration-500">

        {/* Header: brand + bell + avatar */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-[7px]">
            <div className="w-[7px] h-[7px] rounded-full animate-pulse" style={{ background: "#00CC55", boxShadow: "0 0 0 2.5px rgba(0,204,85,0.2)" }} />
            <span className="text-[16px] font-bold" style={{ color: B1 }}>EduIntellect</span>
          </div>
          <div className="flex items-center gap-[9px]">
            <div className="w-9 h-9 rounded-full flex items-center justify-center relative"
              style={{ background: "#fff", border: `0.5px solid ${BLUE_BDR}`, boxShadow: SH_D }}>
              <Bell className="w-4 h-4" style={{ color: "rgba(0,85,255,0.60)" }} strokeWidth={1.8} />
              {attentionCount > 0 && (
                <span className="absolute top-[1px] right-[1px] w-2 h-2 rounded-full" style={{ background: ORANGE, border: "1.5px solid white" }} />
              )}
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
              style={{ background: `linear-gradient(140deg, ${B1}, ${B2})`, boxShadow: "0 3px 12px rgba(0,85,255,0.36), 0 0 0 2px rgba(255,255,255,0.85)" }}>
              {teacherInitial}
            </div>
          </div>
        </div>

        {/* Page Head */}
        <div className="px-5 pt-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: TT4 }}>
            {getSemesterLabel()}
          </div>
          <h1 className="text-[26px] font-bold leading-[1.1]" style={{ color: TT1, letterSpacing: "-0.7px" }}>My Classes</h1>
          <p className="text-[12px] mt-[4px] font-normal" style={{ color: TT3 }}>
            {classes.length} assigned {classes.length === 1 ? "class" : "classes"} · {activeCount} active
          </p>
        </div>

        {/* Hero gradient card with stats */}
        <div className="mx-5 mt-[14px] rounded-[30px] px-5 py-5 relative overflow-hidden"
          style={{ background: "linear-gradient(140deg, #0033CC 0%, #0055FF 40%, #2277FF 70%, #55AAFF 100%)", boxShadow: SH_BTN_D }}>
          <div className="absolute -top-11 -right-8 w-[180px] h-[180px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 65%)" }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)",
            backgroundSize: "22px 22px"
          }} />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-[5px] px-3 py-[5px] rounded-full mb-3 text-[9px] font-bold uppercase tracking-[0.10em]"
              style={{ background: "rgba(255,255,255,0.18)", border: "0.5px solid rgba(255,255,255,0.28)", color: "rgba(255,255,255,0.80)", backdropFilter: "blur(8px)" }}>
              <Sparkles className="w-[11px] h-[11px]" strokeWidth={2.5} />
              Classroom Overview
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: avgAtndStr, label: "Attendance", sub: avgAtnd >= 0 ? "all sessions" : "no data" },
                { val: avgPerfStr, label: "Performance", sub: avgPerf >= 0 ? "from scores" : "no scores" },
                { val: `${totalStudents}`, label: "Students", sub: `${classes.length} ${classes.length === 1 ? "class" : "classes"}` },
              ].map(({ val, label, sub }) => (
                <div key={label} className="rounded-[14px] py-3 px-2 flex flex-col items-center gap-1"
                  style={{ background: "rgba(255,255,255,0.14)", border: "0.5px solid rgba(255,255,255,0.22)", backdropFilter: "blur(8px)" }}>
                  <div className="text-[18px] font-bold text-white leading-none" style={{ letterSpacing: "-0.5px" }}>{val}</div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.55)" }}>{label}</div>
                  <div className="text-[8px]" style={{ color: "rgba(255,255,255,0.40)" }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mx-5 mt-4">
          <Search className="absolute left-[14px] top-1/2 -translate-y-1/2 w-[15px] h-[15px]" style={{ color: "rgba(0,85,255,0.40)" }} strokeWidth={2.3} />
          <input type="text" placeholder="Search classes…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-10 pr-4 rounded-[16px] text-[13px] outline-none"
            style={{ background: "#fff", border: `0.5px solid ${BLUE_BDR}`, boxShadow: SH_D, color: TT1, letterSpacing: "-0.1px" }} />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 px-5 pt-[14px] overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {filterChips.map(({ key, label, Icon }) => {
            const isAct = filter === key;
            return (
              <button key={key} type="button" onClick={() => setFilter(key)}
                className="flex items-center gap-[6px] px-4 py-[9px] rounded-[14px] text-[12px] font-bold shrink-0 active:scale-[0.94] transition-transform whitespace-nowrap"
                style={isAct
                  ? { background: `linear-gradient(135deg, ${B1}, ${B2})`, color: "#fff", boxShadow: SH_BTN_D, letterSpacing: "-0.1px" }
                  : { background: "#fff", color: TT3, border: `0.5px solid ${BLUE_BDR}`, boxShadow: SH_D, letterSpacing: "-0.1px" }}>
                <Icon className="w-[13px] h-[13px]" strokeWidth={isAct ? 2.5 : 2.2} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Class Cards */}
        {filteredClasses.length === 0 ? (
          <div className="mx-5 mt-[14px] bg-white rounded-[28px] py-12 px-6 flex flex-col items-center text-center relative overflow-hidden"
            style={{ boxShadow: SH_LG_D, border: "0.5px solid rgba(0,85,255,0.10)" }}>
            <div className="absolute -top-[50px] -right-[40px] w-[180px] h-[180px] rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(0,85,255,0.05) 0%, transparent 70%)" }} />
            <div className="w-[72px] h-[72px] rounded-[28px] flex items-center justify-center mb-4 relative z-10"
              style={{ background: `linear-gradient(135deg, ${B1}, ${B2})`, boxShadow: SH_BTN_D }}>
              <GraduationCap className="w-8 h-8 text-white" strokeWidth={2.2} />
            </div>
            <div className="text-[18px] font-bold mb-1 relative z-10" style={{ color: TT1, letterSpacing: "-0.3px" }}>No classes yet</div>
            <div className="text-[12px] leading-[1.6] max-w-[240px] relative z-10" style={{ color: TT3 }}>
              Your principal will assign classes soon. Check back later.
            </div>
          </div>
        ) : (
          <div className="mx-5 mt-[14px] flex flex-col gap-3">
            {filteredClasses.map((cls, idx) => {
              const m        = getMetrics(cls.id);
              const nextTime = startTimesMap.get(cls.id) || cls.startTime || cls.scheduleTime;
              const subject  = cls.subject || teacherData?.subject || "Subject";
              const g        = CARD_GRADS[idx % CARD_GRADS.length];

              return (
                <div key={cls.id}
                  onClick={() => navigate(`/my-classes/${cls.id}`)}
                  role="button"
                  tabIndex={0}
                  className="bg-white rounded-[28px] overflow-hidden relative active:scale-[0.98] transition-transform cursor-pointer"
                  style={{ boxShadow: SH_LG_D, border: "0.5px solid rgba(0,85,255,0.10)" }}>
                  <div className="absolute -top-[25px] -right-[20px] w-[130px] h-[130px] rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${g.glow} 0%, transparent 70%)` }} />
                  <div className="h-1" style={{ background: g.bg }} />

                  <div className="p-5 flex flex-col relative z-10">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-[50px] h-[50px] rounded-[15px] flex items-center justify-center"
                        style={{ background: g.bg, boxShadow: g.sh }}>
                        <Home className="w-6 h-6 text-white" strokeWidth={2.2} />
                      </div>
                      <div className="flex items-center gap-[5px] px-[10px] py-[5px] rounded-full text-[10px] font-bold"
                        style={m.isAttention
                          ? { background: "rgba(255,136,0,0.10)", color: "#884400", border: "0.5px solid rgba(255,136,0,0.22)" }
                          : { background: "rgba(0,200,83,0.10)", color: GREEN_D_COL, border: "0.5px solid rgba(0,200,83,0.22)" }}>
                        <span className="w-[5px] h-[5px] rounded-full" style={{ background: m.isAttention ? ORANGE : GREEN }} />
                        {m.isAttention ? "Attention" : "Active"}
                      </div>
                    </div>

                    {/* Title + subtitle */}
                    <h3 className="text-[19px] font-bold leading-tight mb-1" style={{ color: TT1, letterSpacing: "-0.3px" }}>
                      {cls.name || "Class"}
                    </h3>
                    <p className="flex items-center gap-[5px] text-[11px] font-medium mb-4" style={{ color: TT3 }}>
                      <Users className="w-3 h-3 shrink-0" strokeWidth={2.3} />
                      {subject} · {m.studentCount} {m.studentCount === 1 ? "student" : "students"}
                    </p>

                    {/* 3-col metrics */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { icon: BarChart2, label: "Attendance", val: m.atndDisplay, color: m.atndRaw >= 85 ? GREEN_D_COL : m.atndRaw >= 0 ? ORANGE : TT4, iconColor: B1, bg: "rgba(0,85,255,0.06)", bdr: BLUE_BDR },
                        { icon: TrendingUp, label: "Performance", val: m.perfDisplay, color: m.perfRaw >= 60 ? GREEN_D_COL : m.perfRaw >= 0 ? RED : TT4, iconColor: VIOLET, bg: "rgba(107,33,232,0.06)", bdr: "rgba(107,33,232,0.18)" },
                        { icon: Calendar, label: "Next", val: nextTime || "—", color: TT2, iconColor: ORANGE, bg: "rgba(255,136,0,0.06)", bdr: "rgba(255,136,0,0.18)" },
                      ].map(({ icon: Ico, label, val, color, iconColor, bg, bdr }) => (
                        <div key={label} className="rounded-[12px] p-3" style={{ background: bg, border: `0.5px solid ${bdr}` }}>
                          <Ico className="w-[14px] h-[14px] mb-2" style={{ color: iconColor }} strokeWidth={2.3} />
                          <p className="text-[9px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: TT4 }}>{label}</p>
                          <p className="text-[13px] font-bold leading-none truncate" style={{ color, letterSpacing: "-0.2px" }}>{val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/my-classes/${cls.id}`); }}
                        className="flex-1 h-11 rounded-[13px] text-[12px] font-bold text-white flex items-center justify-center gap-[5px] active:scale-[0.97] transition-transform"
                        style={{ background: `linear-gradient(135deg, ${B1}, ${B2})`, boxShadow: SH_BTN_D, letterSpacing: "-0.1px" }}>
                        View Class
                      </button>
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); navigate("/attendance"); }}
                        className="flex-1 h-11 rounded-[13px] text-[12px] font-bold flex items-center justify-center gap-[5px] active:scale-[0.97] transition-transform"
                        style={{ background: BG_D, color: TT2, border: `0.5px solid ${BLUE_BDR}`, boxShadow: SH_D, letterSpacing: "-0.1px" }}>
                        <CheckCircle className="w-[13px] h-[13px]" style={{ color: B1 }} strokeWidth={2.3} /> Mark
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="h-6" />
      </div>{/* ═══════════ END MOBILE VIEW ═══════════ */}

      {/* ═══════════════════ DESKTOP VIEW — Blue Apple + 3D hover ═══════════════════ */}
      <div className="hidden md:block animate-in fade-in duration-500 -m-4 sm:-m-6 md:-m-8 min-h-[calc(100vh-64px)]"
        style={{ background: BG_D }}>
        <div className="w-full px-6 pt-8 pb-12">

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1 flex items-center gap-[7px]" style={{ color: TT4 }}>
                <span className="w-[6px] h-[6px] rounded-full animate-pulse" style={{ background: GREEN, boxShadow: "0 0 0 3px rgba(0,200,83,0.2)" }} />
                Teacher Dashboard · My Classes
              </div>
              <h1 className="text-[32px] font-bold leading-none" style={{ color: TT1, letterSpacing: "-0.8px" }}>My Classes</h1>
              <div className="text-[13px] font-normal mt-[6px]" style={{ color: TT3 }}>
                {getSemesterLabel()} · {classes.length} assigned {classes.length === 1 ? "class" : "classes"}
              </div>
            </div>
            <div className="flex items-center gap-[10px]">
              <div className="relative">
                <Search className="absolute left-[14px] top-1/2 -translate-y-1/2 w-[15px] h-[15px]" style={{ color: "rgba(0,85,255,0.40)" }} strokeWidth={2.3} />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search classes…"
                  className="pl-10 pr-5 py-[11px] rounded-[14px] text-[13px] outline-none w-[260px]"
                  style={{ background: "#fff", border: `0.5px solid ${BLUE_BDR}`, boxShadow: SH_D, color: TT1, letterSpacing: "-0.1px" }} />
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white"
                style={{ background: `linear-gradient(140deg, ${B1}, ${B2})`, boxShadow: "0 3px 12px rgba(0,85,255,0.36), 0 0 0 2px rgba(255,255,255,0.8)" }}>
                {teacherInitial}
              </div>
            </div>
          </div>

          {/* Stat cards (4-col, 3D hover, functional) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5" style={{ perspective: "1200px" }}>
            {[
              { label: "Total Classes", val: `${classes.length}`, color: B1, icon: LayoutGrid, grad: `linear-gradient(135deg, ${B1}, ${B3})`, sh: "0 3px 10px rgba(0,85,255,0.28)", glow: "rgba(0,85,255,0.09)", onClick: () => setFilter("All"), active: filter === "All" },
              { label: "Active", val: `${activeCount}`, color: GREEN, icon: CheckCircle, grad: `linear-gradient(135deg, ${GREEN}, #22EE66)`, sh: "0 3px 10px rgba(0,200,83,0.28)", glow: "rgba(0,200,83,0.09)", onClick: () => setFilter("Active"), active: filter === "Active" },
              { label: "Attention", val: `${attentionCount}`, color: ORANGE, icon: AlertCircle, grad: `linear-gradient(135deg, ${ORANGE}, #FFCC22)`, sh: "0 3px 10px rgba(255,136,0,0.28)", glow: "rgba(255,136,0,0.09)", onClick: () => setFilter("Attention"), active: filter === "Attention" },
              { label: "Students", val: `${totalStudents}`, color: VIOLET, icon: Users, grad: `linear-gradient(135deg, ${VIOLET}, #A87FF8)`, sh: "0 3px 10px rgba(107,33,232,0.28)", glow: "rgba(107,33,232,0.09)", onClick: () => {}, active: false },
            ].map(({ label, val, color, icon: Ico, grad, sh, glow, onClick, active }) => (
              <button key={label} type="button"
                onMouseEnter={handle3DEnter}
                onMouseMove={handle3DMove}
                onMouseLeave={handle3DLeave}
                onClick={onClick}
                className="bg-white rounded-[28px] px-6 py-5 relative overflow-hidden text-left cursor-pointer"
                style={{
                  boxShadow: active ? `${SH_LG_D}, 0 0 0 2px ${color}` : SH_D,
                  border: "0.5px solid rgba(0,85,255,0.10)",
                  transformStyle: "preserve-3d",
                  willChange: "transform",
                }}>
                <div data-glow className="absolute inset-0 pointer-events-none transition-opacity duration-300" style={{ opacity: 0 }} />
                <div className="absolute -top-[20px] -right-[20px] w-[100px] h-[100px] rounded-full pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 70%)` }} />
                <div className="flex items-center justify-between mb-3 relative">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: TT4 }}>{label}</span>
                  <div className="w-11 h-11 rounded-[13px] flex items-center justify-center"
                    style={{ background: grad, boxShadow: sh, transform: "translateZ(18px)" }}>
                    <Ico className="w-[18px] h-[18px] text-white" strokeWidth={2.3} />
                  </div>
                </div>
                <div className="text-[34px] font-bold leading-none relative" style={{ color, letterSpacing: "-1px", transform: "translateZ(10px)" }}>{val}</div>
                {active && (
                  <div className="absolute bottom-3 right-5 text-[10px] font-bold uppercase tracking-[0.10em] flex items-center gap-[4px]" style={{ color }}>
                    <CheckCircle className="w-[11px] h-[11px]" strokeWidth={2.5} /> Active
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Main row: Class grid (col-2) + Summary sidebar */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2">
              {filteredClasses.length === 0 ? (
                <div className="bg-white rounded-[28px] py-20 flex flex-col items-center text-center relative overflow-hidden px-6"
                  style={{ boxShadow: SH_LG_D, border: "0.5px solid rgba(0,85,255,0.10)" }}>
                  <div className="absolute -top-[60px] -right-[40px] w-[240px] h-[240px] rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(0,85,255,0.05) 0%, transparent 70%)" }} />
                  <div className="w-[88px] h-[88px] rounded-[28px] flex items-center justify-center mb-5 relative z-10"
                    style={{ background: `linear-gradient(135deg, ${B1}, ${B2})`, boxShadow: `${SH_BTN_D}, 0 0 0 10px rgba(0,85,255,0.08)` }}>
                    <GraduationCap className="w-10 h-10 text-white" strokeWidth={2} />
                  </div>
                  <div className="text-[22px] font-bold mb-2 relative z-10" style={{ color: TT1, letterSpacing: "-0.5px" }}>No classes yet</div>
                  <div className="text-[13px] leading-[1.6] max-w-[400px] relative z-10" style={{ color: TT3 }}>
                    Your principal will assign classes soon. Check back later.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ perspective: "1200px" }}>
                  {filteredClasses.map((cls, idx) => {
                    const m = getMetrics(cls.id);
                    const nextTime = startTimesMap.get(cls.id) || cls.startTime || cls.scheduleTime;
                    const subject = cls.subject || teacherData?.subject || "Subject";
                    const g = CARD_GRADS[idx % CARD_GRADS.length];

                    return (
                      <div key={cls.id}
                        onMouseEnter={handle3DEnter}
                        onMouseMove={handle3DMove}
                        onMouseLeave={handle3DLeave}
                        onClick={() => navigate(`/my-classes/${cls.id}`)}
                        role="button"
                        tabIndex={0}
                        className="bg-white rounded-[28px] overflow-hidden relative cursor-pointer"
                        style={{
                          boxShadow: SH_LG_D,
                          border: "0.5px solid rgba(0,85,255,0.10)",
                          transformStyle: "preserve-3d",
                          willChange: "transform",
                        }}>
                        <div data-glow className="absolute inset-0 pointer-events-none transition-opacity duration-300" style={{ opacity: 0 }} />
                        <div className="absolute -top-[30px] -right-[25px] w-[160px] h-[160px] rounded-full pointer-events-none"
                          style={{ background: `radial-gradient(circle, ${g.glow} 0%, transparent 70%)` }} />
                        <div className="h-[4px]" style={{ background: g.bg }} />

                        <div className="p-6 relative z-10">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-5">
                            <div className="w-14 h-14 rounded-[16px] flex items-center justify-center"
                              style={{ background: g.bg, boxShadow: g.sh, transform: "translateZ(22px)" }}>
                              <Home className="w-7 h-7 text-white" strokeWidth={2.2} />
                            </div>
                            <div className="flex items-center gap-[5px] px-3 py-[6px] rounded-full text-[11px] font-bold"
                              style={m.isAttention
                                ? { background: "rgba(255,136,0,0.10)", color: "#884400", border: "0.5px solid rgba(255,136,0,0.22)", transform: "translateZ(14px)" }
                                : { background: "rgba(0,200,83,0.10)", color: GREEN_D_COL, border: "0.5px solid rgba(0,200,83,0.22)", transform: "translateZ(14px)" }}>
                              <span className="w-[5px] h-[5px] rounded-full" style={{ background: m.isAttention ? ORANGE : GREEN }} />
                              {m.isAttention ? "Attention" : "Active"}
                            </div>
                          </div>

                          {/* Title */}
                          <h3 className="text-[22px] font-bold leading-tight mb-1" style={{ color: TT1, letterSpacing: "-0.5px", transform: "translateZ(12px)" }}>
                            {cls.name || "Class"}
                          </h3>
                          <p className="flex items-center gap-[5px] text-[12px] font-medium mb-5" style={{ color: TT3 }}>
                            <Users className="w-[12px] h-[12px] shrink-0" strokeWidth={2.3} />
                            {subject} · {m.studentCount} {m.studentCount === 1 ? "student" : "students"}
                          </p>

                          {/* 3 metric rows */}
                          <div className="space-y-2 mb-5" style={{ transform: "translateZ(6px)" }}>
                            {[
                              { icon: BarChart2, label: "Attendance", val: m.atndDisplay, color: m.atndRaw >= 85 ? GREEN_D_COL : m.atndRaw >= 0 ? ORANGE : TT4, iconBg: "rgba(0,85,255,0.10)", iconBdr: BLUE_BDR, iconColor: B1 },
                              { icon: TrendingUp, label: "Performance", val: m.perfDisplay, color: m.perfRaw >= 60 ? GREEN_D_COL : m.perfRaw >= 0 ? RED : TT4, iconBg: "rgba(107,33,232,0.10)", iconBdr: "rgba(107,33,232,0.22)", iconColor: VIOLET },
                              { icon: Calendar, label: "Next Class", val: nextTime ? `Today · ${nextTime}` : "—", color: TT2, iconBg: "rgba(255,136,0,0.10)", iconBdr: "rgba(255,136,0,0.22)", iconColor: ORANGE },
                            ].map(({ icon: Ico, label, val, color, iconBg, iconBdr, iconColor }) => (
                              <div key={label} className="flex items-center justify-between px-3 py-[10px] rounded-[12px]"
                                style={{ background: BG_D, border: `0.5px solid ${SEP_D}` }}>
                                <div className="flex items-center gap-[10px]">
                                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                                    style={{ background: iconBg, border: `0.5px solid ${iconBdr}` }}>
                                    <Ico className="w-[14px] h-[14px]" style={{ color: iconColor }} strokeWidth={2.3} />
                                  </div>
                                  <span className="text-[12px] font-medium" style={{ color: TT3 }}>{label}</span>
                                </div>
                                <span className="text-[13px] font-bold" style={{ color, letterSpacing: "-0.2px" }}>{val}</span>
                              </div>
                            ))}
                          </div>

                          {/* Actions */}
                          <div className="grid grid-cols-2 gap-2" style={{ transform: "translateZ(14px)" }}>
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); navigate(`/my-classes/${cls.id}`); }}
                              className="h-11 rounded-[13px] text-[12px] font-bold text-white flex items-center justify-center gap-[5px] transition-transform hover:scale-[1.02]"
                              style={{ background: `linear-gradient(135deg, ${B1}, ${B2})`, boxShadow: SH_BTN_D, letterSpacing: "-0.1px" }}>
                              View Class
                            </button>
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); navigate('/attendance'); }}
                              className="h-11 rounded-[13px] text-[12px] font-bold flex items-center justify-center gap-[5px] transition-transform hover:scale-[1.02]"
                              style={{ background: BG_D, color: TT2, border: `0.5px solid ${BLUE_BDR}`, boxShadow: SH_D, letterSpacing: "-0.1px" }}>
                              <CheckCircle className="w-[13px] h-[13px]" style={{ color: B1 }} strokeWidth={2.3} /> Attendance
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar: Dark blue summary + AI tip */}
            <div className="space-y-4">
              <div
                onMouseEnter={handle3DEnter}
                onMouseMove={handle3DMove}
                onMouseLeave={handle3DLeave}
                className="rounded-[28px] p-7 relative overflow-hidden text-white"
                style={{
                  background: "linear-gradient(140deg, #001888 0%, #0033CC 48%, #0055FF 100%)",
                  boxShadow: "0 8px 30px rgba(0,51,204,0.34), 0 0 0 0.5px rgba(255,255,255,0.14)",
                  transformStyle: "preserve-3d",
                  willChange: "transform",
                }}>
                <div data-glow className="absolute inset-0 pointer-events-none transition-opacity duration-300" style={{ opacity: 0 }} />
                <div className="absolute -top-[50px] -right-[35px] w-[220px] h-[220px] rounded-full pointer-events-none"
                  style={{ background: "radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 65%)" }} />
                <div className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.014) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }} />
                <div className="relative z-10" style={{ transform: "translateZ(14px)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] mb-3" style={{ color: "rgba(255,255,255,0.50)" }}>Classroom Overview</div>
                  <div className="text-[22px] font-bold leading-[1.2] mb-5" style={{ letterSpacing: "-0.5px" }}>This Term</div>
                  <div className="space-y-2">
                    {[
                      { label: "Avg attendance", val: avgAtndStr },
                      { label: "Avg performance", val: avgPerfStr },
                      { label: "Total students", val: `${totalStudents}` },
                      { label: "Active / Attention", val: `${activeCount} / ${attentionCount}` },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex items-center justify-between py-3" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.10)" }}>
                        <span className="text-[11px] font-bold uppercase tracking-[0.10em]" style={{ color: "rgba(255,255,255,0.50)" }}>{label}</span>
                        <span className="text-[15px] font-bold text-white" style={{ letterSpacing: "-0.2px" }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                onMouseEnter={handle3DEnter}
                onMouseMove={handle3DMove}
                onMouseLeave={handle3DLeave}
                className="bg-white rounded-[28px] p-5 relative overflow-hidden"
                style={{ boxShadow: SH_LG_D, border: "0.5px solid rgba(0,85,255,0.10)", transformStyle: "preserve-3d", willChange: "transform" }}>
                <div data-glow className="absolute inset-0 pointer-events-none transition-opacity duration-300" style={{ opacity: 0 }} />
                <div className="absolute -top-[20px] -right-[20px] w-[120px] h-[120px] rounded-full pointer-events-none"
                  style={{ background: "radial-gradient(circle, rgba(107,33,232,0.08) 0%, transparent 70%)" }} />
                <div className="flex items-center gap-3 mb-3 relative z-10" style={{ transform: "translateZ(12px)" }}>
                  <div className="w-11 h-11 rounded-[14px] flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${VIOLET}, #A87FF8)`, boxShadow: "0 3px 12px rgba(107,33,232,0.28)" }}>
                    <Sparkles className="w-5 h-5 text-white" strokeWidth={2.3} />
                  </div>
                  <div>
                    <div className="text-[15px] font-bold" style={{ color: TT1, letterSpacing: "-0.2px" }}>AI Quick Tip</div>
                    <div className="text-[11px] font-normal" style={{ color: TT3 }}>Action suggestions</div>
                  </div>
                </div>
                <p className="text-[12px] leading-[1.6] relative z-10" style={{ color: TT3 }}>
                  {attentionCount > 0
                    ? `${attentionCount} ${attentionCount === 1 ? "class needs" : "classes need"} attention. Click "Attention" tab above to filter and review them.`
                    : "All classes are tracking well. Keep engaging — check back after next attendance cycle."}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>{/* ═══════════ END DESKTOP VIEW ═══════════ */}

    </div>
  );
};

export default MyClasses;