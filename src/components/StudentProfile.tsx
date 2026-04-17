import { useEffect, useMemo, useState, useRef } from "react";
import { Loader2, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, TrendingUp, MessageSquare, FileText, BookOpen, Calendar, BarChart3, Activity, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../lib/AuthContext";
import { toast } from "sonner";

// ── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  bg: "#f8fafc", white: "#fff", ink: "#0f172a", ink2: "#475569", ink3: "#94a3b8",
  bdr: "#e2e8f0", s1: "#f1f5f9", s2: "#e2e8f0",
  blue: "#3B5BDB", blBg: "#EDF2FF",
  grn: "#16a34a", glBg: "#f0fdf4",
  red: "#dc2626", rlBg: "#fef2f2",
  amb: "#d97706", alBg: "#fffbeb",
};

const toDate = (v: any): Date | null => { if (!v) return null; if (v?.toDate) return v.toDate(); if (v?.seconds) return new Date(v.seconds * 1000); const d = new Date(v); return isNaN(d.getTime()) ? null : d; };
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const timeAgo = (v: any) => { const d = toDate(v); if (!d) return ""; const s = (Date.now()-d.getTime())/1000; if (s<3600) return `${Math.floor(s/60)}m ago`; if (s<86400) return `${Math.floor(s/3600)}h ago`; return d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}).toUpperCase(); };

// ── 3D Card ──────────────────────────────────────────────────────────────────
const Card = ({children,title,action,style}:{children:React.ReactNode;title?:string;action?:React.ReactNode;style?:React.CSSProperties}) => {
  const [tilt,setTilt] = useState({x:0,y:0});
  const [hov,setHov] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e:React.MouseEvent) => { if (!ref.current) return; const r=ref.current.getBoundingClientRect(); setTilt({x:(((e.clientY-r.top)/r.height)-0.5)*-8,y:(((e.clientX-r.left)/r.width)-0.5)*8}); };
  return (
    <div ref={ref} onMouseMove={onMove} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{setTilt({x:0,y:0});setHov(false);}}
      style={{
        position:"relative",background:T.white,border:`1px solid ${hov?"rgba(59,91,219,0.25)":T.bdr}`,borderRadius:16,overflow:"hidden",
        transform:`perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${hov?"translateY(-4px) scale(1.01)":""}`,
        transition:"transform 0.2s ease,border-color 0.3s,box-shadow 0.3s",willChange:"transform",
        boxShadow:hov?"0 20px 40px rgba(59,91,219,0.1),0 8px 16px rgba(0,0,0,0.06)":"0 1px 3px rgba(0,0,0,0.04)",
        ...style,
      }}>
      {hov&&<div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:1,borderRadius:16,background:`radial-gradient(circle at ${(tilt.y/8+0.5)*100}% ${(-tilt.x/8+0.5)*100}%,rgba(59,91,219,0.06) 0%,transparent 60%)`}}/>}
      {title&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${T.s2}`,position:"relative",zIndex:2}}>
        <span style={{fontSize:14,fontWeight:600,color:T.ink}}>{title}</span>{action||null}
      </div>}
      <div style={{padding:"16px 20px",position:"relative",zIndex:2}}>{children}</div>
    </div>
  );
};
const DLink = () => <span style={{fontSize:11,color:T.blue,fontWeight:500,cursor:"pointer"}}>Details →</span>;

// ═══════════════════════════════════════════════════════════════════════════════
interface Props { student: any; onBack: () => void; }

export default function StudentProfile({ student, onBack }: Props) {
  const { teacherData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [masterProfile, setMasterProfile] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [testScores, setTestScores] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [parentNotes, setParentNotes] = useState<any[]>([]);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [calMonth, setCalMonth] = useState(new Date());
  const [feedbackText, setFeedbackText] = useState("");
  const [sending, setSending] = useState(false);

  const sid = student.id || student.studentId || "";
  const email = (student.email || student.studentEmail || "").toLowerCase();

  useEffect(() => {
    if (!sid) { setLoading(false); return; }
    const unsub = onSnapshot(doc(db, "students", sid), d => { if (d.exists()) setMasterProfile(d.data()); });

    const run = async () => {
      setLoading(true);
      try {
        const byId = (col: string) => getDocs(query(collection(db, col), where("studentId", "==", sid)));
        const byEm = (col: string) => email ? getDocs(query(collection(db, col), where("studentEmail", "==", email))) : Promise.resolve(null as any);
        const merge = (a: any, b: any) => { const l: any[] = []; if (a) a.docs.forEach((d: any) => l.push({ id: d.id, ...d.data() })); if (b) b.docs.forEach((d: any) => { if (!l.find(x => x.id === d.id)) l.push({ id: d.id, ...d.data() }); }); return l; };

        const [aI, aE, sI, sE, rI, rE, subI, subE, inc, pn, iv] = await Promise.all([
          byId("attendance"), byEm("attendance"), byId("test_scores"), byEm("test_scores"),
          byId("results"), byEm("results"), byId("submissions"), byEm("submissions"),
          byId("incidents"), byId("parent_notes"), byId("interventions"),
        ]);
        setAttendance(merge(aI, aE));
        setTestScores([...merge(sI, sE), ...merge(rI, rE)]);
        setSubmissions(merge(subI, subE));
        setIncidents(inc.docs.map(d => ({ id: d.id, ...d.data() })));
        setParentNotes(pn.docs.map(d => ({ id: d.id, ...d.data() })));
        setInterventions(iv.docs.map(d => ({ id: d.id, ...d.data() })));

        const classId = student.classId || merge(await byId("enrollments"), await byEm("enrollments"))[0]?.classId;
        if (classId) {
          const as2 = await getDocs(query(collection(db, "assignments"), where("classId", "==", classId)));
          setAssignments(as2.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    run();
    return () => unsub();
  }, [sid]);

  // ── Metrics ────────────────────────────────────────────────────────────────
  const m = useMemo(() => {
    const tot = attendance.length, pres = attendance.filter(r => r.status === "present").length, late = attendance.filter(r => r.status === "late").length;
    const abs = tot - pres - late, attRate = tot > 0 ? ((pres + late) / tot) * 100 : 0;
    const vals = testScores.map(t => Number(t.percentage ?? t.score ?? 0)).filter(n => !isNaN(n) && n > 0);
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const subScores: Record<string, number> = {}, subCounts: Record<string, number> = {};
    testScores.forEach(t => { const sub = (t.subject || t.subjectName || "General").toUpperCase(); const p = Number(t.percentage ?? t.score ?? 0); if (isNaN(p) || p <= 0) return; subScores[sub] = (subScores[sub] || 0) + p; subCounts[sub] = (subCounts[sub] || 0) + 1; });
    Object.keys(subScores).forEach(k => { subScores[k] = Math.round(subScores[k] / subCounts[k]); });
    const sorted = [...testScores].sort((a, b) => (toDate(b.timestamp || b.createdAt)?.getTime() || 0) - (toDate(a.timestamp || a.createdAt)?.getTime() || 0));
    const r3 = sorted.slice(0, 3).map(t => Number(t.percentage ?? t.score ?? 0)).filter(n => !isNaN(n));
    const p3 = sorted.slice(3, 6).map(t => Number(t.percentage ?? t.score ?? 0)).filter(n => !isNaN(n));
    const rA = r3.length ? r3.reduce((a, b) => a + b, 0) / r3.length : 0, pA = p3.length ? p3.reduce((a, b) => a + b, 0) / p3.length : 0;
    const trend: "up" | "down" | "flat" = rA - pA >= 5 ? "up" : pA - rA >= 5 ? "down" : "flat";
    const now = new Date();
    const monthly = Array.from({ length: 6 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1); const mA = attendance.filter(r => { const dt = toDate(r.date); return dt && dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear(); }); const mS = testScores.filter(t => { const dt = toDate(t.timestamp || t.createdAt); return dt && dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear(); }); const mP = mA.filter(r => r.status === "present" || r.status === "late").length; return { month: MONTHS[d.getMonth()], score: Math.round(mS.map(t => Number(t.percentage ?? t.score ?? 0)).filter(n => !isNaN(n) && n > 0).reduce((a, b, _, arr) => a + b / arr.length, 0)), attendance: Math.round(mA.length > 0 ? (mP / mA.length) * 100 : 0) }; });
    const completion = assignments.length > 0 ? (submissions.length / assignments.length) * 100 : 0;
    const days = new Set(attendance.map(a => toDate(a.date)?.toDateString())).size;
    return { tot, pres, late, abs, attRate, avg, subScores, trend, monthly, completion, days, subCount: submissions.length, asgCount: assignments.length };
  }, [attendance, testScores, submissions, assignments]);

  const overallRisk = Math.round((Math.max(0, 100 - m.attRate) + Math.max(0, 100 - m.avg) + Math.max(0, 100 - m.completion) + Math.min(100, incidents.length * 25)) / 4);
  const riskLevel = overallRisk < 20 ? "STABLE" : overallRisk < 45 ? "MONITOR" : overallRisk < 70 ? "ELEVATED" : "CRITICAL";
  const riskColor = overallRisk < 20 ? T.grn : overallRisk < 45 ? T.amb : T.red;
  const subEntries = Object.entries(m.subScores);
  const radarData = subEntries.map(([s, sc]) => ({ subject: s.slice(0, 10), score: sc, fullMark: 100 }));
  const initials = (student.name || student.studentName || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const sName = student.name || student.studentName || "Student";

  // Calendar
  const calY = calMonth.getFullYear(), calM = calMonth.getMonth();
  const firstD = new Date(calY, calM, 1).getDay(), dim = new Date(calY, calM + 1, 0).getDate();
  const calDays = Array.from({ length: 42 }, (_, i) => { const dn = i - firstD + 1; if (dn < 1 || dn > dim) return null; const d = new Date(calY, calM, dn); const ds = d.toISOString().split("T")[0]; const rec = attendance.find(a => { const ad = toDate(a.date); return ad && ad.toISOString().split("T")[0] === ds; }); return { dayNum: dn, date: d, status: rec?.status || null }; });
  const calP = attendance.filter(a => { const d = toDate(a.date); return d && d.getMonth() === calM && d.getFullYear() === calY && a.status === "present"; }).length;
  const calL = attendance.filter(a => { const d = toDate(a.date); return d && d.getMonth() === calM && d.getFullYear() === calY && a.status === "late"; }).length;
  const calA = attendance.filter(a => { const d = toDate(a.date); return d && d.getMonth() === calM && d.getFullYear() === calY && a.status === "absent"; }).length;

  // Score history
  const scoreHist = [...testScores].sort((a, b) => (toDate(b.timestamp || b.createdAt)?.getTime() || 0) - (toDate(a.timestamp || a.createdAt)?.getTime() || 0)).slice(0, 6);
  const barData = [...scoreHist].reverse().map(t => ({ name: (t.subject || "TEST").slice(0, 8), score: Number(t.percentage ?? t.score ?? 0) }));

  // Send feedback
  const handleSendFeedback = async () => {
    if (!feedbackText.trim() || !teacherData?.id) return;
    setSending(true);
    try {
      await addDoc(collection(db, "parent_notes"), {
        teacherId: teacherData.id, teacherName: teacherData.name || "Teacher",
        studentId: sid, studentEmail: email, studentName: sName,
        content: feedbackText.trim(), from: "teacher", createdAt: serverTimestamp(),
      });
      setFeedbackText(""); toast.success("Feedback sent!");
    } catch { toast.error("Failed to send."); }
    setSending(false);
  };

  const today = new Date();

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 10 }}>
      <Loader2 className="animate-spin" size={20} color={T.blue} /><span style={{ fontSize: 13, color: T.ink3 }}>Loading profile...</span>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Inter',-apple-system,sans-serif" }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: `1px solid ${T.bdr}`, background: T.white, color: T.ink2, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <ArrowLeft size={14} /> All students
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => window.print()} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${T.bdr}`, background: T.white, color: T.ink2, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Export</button>
          <button style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: T.blue, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Contact Parent</button>
        </div>
      </div>

      {/* ═══ HERO 3-COL ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px 1fr", gap: 20, marginBottom: 20 }}>
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="Academic Performance">
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div style={{ position: "relative", width: 64, height: 64 }}>
                <svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke={T.s2} strokeWidth="6" /><circle cx="32" cy="32" r="26" fill="none" stroke={T.blue} strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 26} strokeDashoffset={2 * Math.PI * 26 * (1 - m.avg / 100)} transform="rotate(-90 32 32)" style={{ transition: "stroke-dashoffset 1s" }} /></svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: T.blue }}>{(m.avg / 25).toFixed(1)}</div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.ink }}>{Math.round(m.avg)}%</div>
                <div style={{ fontSize: 11, color: T.ink3, display: "flex", alignItems: "center", gap: 4 }}>Avg // {testScores.length} tests{m.trend === "up" && <TrendingUp size={12} color={T.grn} />}</div>
              </div>
            </div>
            {subEntries.slice(0, 5).map(([sub, sc]) => (<div key={sub} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span style={{ fontSize: 11, color: T.ink3, width: 100, flexShrink: 0 }}>{sub}</span><div style={{ flex: 1, height: 6, background: T.s1, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${sc}%`, background: sc >= 75 ? T.blue : sc >= 50 ? T.amb : T.red, borderRadius: 3 }} /></div><span style={{ fontSize: 12, fontWeight: 600, color: sc >= 75 ? T.blue : sc >= 50 ? T.amb : T.red, width: 30, textAlign: "right" }}>{sc}</span></div>))}
          </Card>
          <Card title="Attendance">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative", width: 72, height: 72 }}>
                <svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="28" fill="none" stroke={T.s2} strokeWidth="7" /><circle cx="36" cy="36" r="28" fill="none" stroke={m.attRate >= 85 ? T.grn : T.amb} strokeWidth="7" strokeLinecap="round" strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - m.attRate / 100)} transform="rotate(-90 36 36)" style={{ transition: "stroke-dashoffset 1s" }} /></svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: m.attRate >= 85 ? T.grn : T.amb }}>{Math.round(m.attRate)}%</div>
              </div>
              <div><div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Present</div><div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>Late: {m.late} // Abs: {m.abs}</div></div>
            </div>
          </Card>
          <Card title="Subject Mastery" action={<DLink />}>
            {radarData.length >= 3 && <div style={{ height: 180, marginBottom: 12 }}><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}><PolarGrid stroke={T.s2} /><PolarAngleAxis dataKey="subject" tick={{ fill: T.ink3, fontSize: 10 }} /><Radar dataKey="score" stroke={T.blue} fill={T.blue} fillOpacity={0.15} strokeWidth={2} /></RadarChart></ResponsiveContainer></div>}
            {subEntries.map(([sub, sc]) => (<div key={sub} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 11, color: T.ink3, width: 90, flexShrink: 0 }}>{sub}</span><div style={{ flex: 1, height: 6, background: T.s1, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${sc}%`, background: sc >= 75 ? T.blue : sc >= 50 ? T.grn : T.red, borderRadius: 3 }} /></div><span style={{ fontSize: 12, fontWeight: 600, color: T.ink, width: 28, textAlign: "right" }}>{sc}</span></div>))}
          </Card>
        </div>

        {/* CENTER */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 20 }}>
          <div style={{ width: 140, height: 140, borderRadius: "50%", border: `4px solid ${T.blue}`, background: T.blBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: "0 8px 30px rgba(59,91,219,0.15)" }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: T.blue }}>{initials}</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: T.ink, textAlign: "center", marginBottom: 4 }}>{sName}</h2>
          <p style={{ fontSize: 12, color: T.ink3, textAlign: "center", marginBottom: 4 }}>{student.className || student.class || masterProfile?.className || "—"}</p>
          <p style={{ fontSize: 11, color: T.ink3, textAlign: "center", marginBottom: 12 }}>Roll: {student.rollNo || student.roll || "—"} // ID: {sid.slice(0, 6).toUpperCase()}</p>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ padding: "4px 12px", borderRadius: 20, background: T.glBg, color: T.grn, fontSize: 10, fontWeight: 600 }}>ACTIVE</span>
            <span style={{ padding: "4px 12px", borderRadius: 20, background: riskColor === T.grn ? T.glBg : riskColor === T.amb ? T.alBg : T.rlBg, color: riskColor, fontSize: 10, fontWeight: 600 }}>{riskLevel}</span>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="Behaviour Record" action={<DLink />}>
            {incidents.length === 0 ? <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: T.glBg, borderRadius: 10 }}><CheckCircle2 size={14} color={T.grn} /><span style={{ fontSize: 12, color: T.grn, fontWeight: 500 }}>No incidents</span></div>
              : incidents.slice(0, 3).map(inc => <div key={inc.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0", borderBottom: `1px solid ${T.s2}` }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: T.red, marginTop: 5, flexShrink: 0 }} /><div><span style={{ fontSize: 12, fontWeight: 600, color: T.red }}>{(inc.type || "INCIDENT").toUpperCase()}</span><p style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>{(inc.description || inc.content || "").slice(0, 80)}</p></div></div>)}
          </Card>
          <Card title="AI Intelligence" action={<DLink />}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}><span style={{ fontSize: 11, color: T.ink3 }}>Predicted:</span><span style={{ fontSize: 20, fontWeight: 700, color: T.blue }}>{Math.min(100, Math.round(m.avg + (100 - m.avg) * 0.05))}%</span></div>
            <div style={{ fontSize: 11, color: T.ink3, lineHeight: 1.6 }}>{m.trend === "up" ? "Positive trend. Student shows growth." : m.trend === "down" ? "Declining. Consider intervention." : "Stable performance."}</div>
          </Card>
          <Card title="Parent Communication" action={<DLink />}>
            {parentNotes.slice(0, 2).map(n => <div key={n.id} style={{ padding: "8px 0", borderBottom: `1px solid ${T.s2}` }}><div style={{ fontSize: 10, color: n.from === "teacher" ? T.blue : T.grn, fontWeight: 600, marginBottom: 2 }}>{n.from === "teacher" ? (n.teacherName || "TEACHER") : "PARENT"} // {timeAgo(n.createdAt)}</div><p style={{ fontSize: 12, color: T.ink2, lineHeight: 1.5, margin: 0 }}>{(n.content || n.message || "").slice(0, 100)}</p></div>)}
            {parentNotes.length === 0 && <p style={{ fontSize: 12, color: T.ink3, textAlign: "center" }}>No messages</p>}
          </Card>
          <Card title="Teacher Observations">
            {parentNotes.filter(n => n.from === "teacher").length > 0 ? <div style={{ padding: "10px 14px", background: T.blBg, borderLeft: `3px solid ${T.blue}`, borderRadius: 8 }}><p style={{ fontSize: 12, color: T.ink2, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>"{(parentNotes.find(n => n.from === "teacher")?.content || "").slice(0, 150)}"</p></div> : <p style={{ fontSize: 12, color: T.ink3, textAlign: "center" }}>No observations</p>}
          </Card>
        </div>
      </div>

      {/* Performance Timeline */}
      <Card title="Performance Timeline" action={<DLink />} style={{ marginBottom: 20 }}>
        <div style={{ height: 200 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={m.monthly}><defs><linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.blue} stopOpacity={0.15} /><stop offset="95%" stopColor={T.blue} stopOpacity={0} /></linearGradient><linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.grn} stopOpacity={0.15} /><stop offset="95%" stopColor={T.grn} stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={T.s2} /><XAxis dataKey="month" tick={{ fill: T.ink3, fontSize: 11 }} /><YAxis tick={{ fill: T.ink3, fontSize: 11 }} domain={[0, 100]} /><Tooltip contentStyle={{ background: T.white, border: `1px solid ${T.bdr}`, borderRadius: 8, fontSize: 12 }} /><Area type="monotone" dataKey="score" stroke={T.blue} fill="url(#bg1)" strokeWidth={2.5} /><Area type="monotone" dataKey="attendance" stroke={T.grn} fill="url(#bg2)" strokeWidth={2} strokeDasharray="5 3" /></AreaChart></ResponsiveContainer></div>
      </Card>

      {/* Assignments + Risk */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <Card title={`Assignments · ${m.subCount}/${m.asgCount}`} action={<span style={{ fontSize: 11, color: T.blue, cursor: "pointer" }}>View All →</span>}>
          {[...assignments].sort((a, b) => (toDate(b.dueDate)?.getTime() || 0) - (toDate(a.dueDate)?.getTime() || 0)).slice(0, 5).map(a => { const sub = submissions.find((s: any) => s.assignmentId === a.id); return <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${T.s2}` }}><CheckCircle2 size={14} color={sub ? T.grn : T.ink3} /><span style={{ fontSize: 13, color: T.ink, flex: 1 }}>{(a.title || "Assignment").slice(0, 35)}</span></div>; })}
        </Card>
        <Card title="Risk Assessment" action={<DLink />}>
          <div style={{ fontSize: 22, fontWeight: 800, color: riskColor, marginBottom: 14 }}>{riskLevel}</div>
          {[{ l: "ATTENDANCE", v: m.attRate }, { l: "ACADEMIC", v: m.avg }, { l: "SUBMISSION", v: m.completion }, { l: "BEHAVIOURAL", v: incidents.length === 0 ? 100 : Math.max(0, 100 - incidents.length * 25) }].map(r => <div key={r.l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span style={{ fontSize: 11, color: T.ink3, width: 100 }}>{r.l}</span><div style={{ flex: 1, height: 6, background: T.s1, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${r.v}%`, background: r.v >= 80 ? T.blue : r.v >= 50 ? T.amb : T.red, borderRadius: 3 }} /></div><span style={{ fontSize: 12, fontWeight: 600, color: r.v >= 80 ? T.blue : r.v >= 50 ? T.amb : T.red, width: 50, textAlign: "right" }}>{r.l === "BEHAVIOURAL" && incidents.length > 0 ? `${incidents.length} Events` : `${Math.round(r.v)}%`}</span></div>)}
        </Card>
      </div>

      {/* Calendar + Support */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <Card title="Attendance Calendar">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 14 }}>
            <button onClick={() => setCalMonth(new Date(calY, calM - 1))} style={{ background: "none", border: "none", cursor: "pointer", color: T.ink3 }}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{MONTHS[calM]} {calY}</span>
            <button onClick={() => setCalMonth(new Date(calY, calM + 1))} style={{ background: "none", border: "none", cursor: "pointer", color: T.ink3 }}><ChevronRight size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[{ v: calP, c: T.grn, l: "PRESENT" }, { v: calL, c: T.amb, l: "LATE" }, { v: calA, c: T.red, l: "ABSENT" }].map(x => <div key={x.l} style={{ textAlign: "center", padding: "10px 0", background: x.c === T.grn ? T.glBg : x.c === T.amb ? T.alBg : T.rlBg, borderRadius: 10 }}><div style={{ fontSize: 20, fontWeight: 700, color: x.c }}>{x.v}</div><div style={{ fontSize: 10, color: x.c }}>{x.l}</div></div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, textAlign: "center" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} style={{ fontSize: 10, fontWeight: 600, color: T.ink3, padding: "4px 0" }}>{d}</div>)}
            {calDays.map((d, i) => { if (!d) return <div key={i} />; const isT = d.date.toDateString() === today.toDateString(); const bg = d.status === "present" ? T.grn : d.status === "late" ? T.amb : d.status === "absent" ? T.red : "transparent"; return <div key={i} style={{ width: 32, height: 32, borderRadius: isT ? "50%" : 8, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: isT ? 700 : 400, color: d.status ? "#fff" : T.ink, background: isT && !d.status ? T.blue : bg, ...(isT && !d.status ? { color: "#fff" } : {}) }}>{d.dayNum}</div>; })}
          </div>
        </Card>
        <Card title="Support Actions" action={<DLink />}>
          {interventions.length === 0 ? <p style={{ fontSize: 12, color: T.ink3, textAlign: "center", padding: "20px 0" }}>No active interventions</p>
            : interventions.map(iv => <div key={iv.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 0", borderBottom: `1px solid ${T.s2}` }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: iv.status === "completed" ? T.grn : T.amb, marginTop: 5, flexShrink: 0 }} /><div style={{ flex: 1 }}><div style={{ fontSize: 11, color: T.ink3, marginBottom: 2 }}>{timeAgo(iv.createdAt)}</div><div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{iv.actionTitle || iv.title || "Intervention"}</div><div style={{ display: "flex", gap: 6, marginTop: 4 }}><span style={{ padding: "2px 8px", borderRadius: 4, background: T.blBg, color: T.blue, fontSize: 10, fontWeight: 600 }}>{(iv.actionType || "GENERAL").toUpperCase()}</span><span style={{ padding: "2px 8px", borderRadius: 4, background: iv.status === "completed" ? T.glBg : T.alBg, color: iv.status === "completed" ? T.grn : T.amb, fontSize: 10, fontWeight: 600 }}>{iv.status === "completed" ? "Complete" : "Active"}</span></div></div></div>)}
        </Card>
      </div>

      {/* Comms + Score History */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <Card title={`Communications · ${parentNotes.length} entries`}>
          {parentNotes.slice(0, 3).map(n => <div key={n.id} style={{ padding: "12px 0", borderBottom: `1px solid ${T.s2}` }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{n.from === "teacher" ? (n.teacherName || "TEACHER") : "PARENT"}</span><span style={{ padding: "2px 8px", borderRadius: 4, background: n.from === "teacher" ? T.blBg : T.glBg, color: n.from === "teacher" ? T.blue : T.grn, fontSize: 10, fontWeight: 600 }}>{n.from === "teacher" ? "FACULTY" : "PARENT"}</span><span style={{ fontSize: 10, color: T.ink3, marginLeft: "auto" }}>{timeAgo(n.createdAt)}</span></div><p style={{ fontSize: 12, color: T.ink2, lineHeight: 1.5, margin: 0 }}>{(n.content || n.message || "").slice(0, 120)}</p></div>)}
          {/* Quick send */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Send a note to parent..." style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `1px solid ${T.bdr}`, fontSize: 12, outline: "none" }} onKeyDown={e => { if (e.key === "Enter") handleSendFeedback(); }} />
            <button onClick={handleSendFeedback} disabled={sending || !feedbackText.trim()} style={{ padding: "8px 16px", borderRadius: 10, background: T.blue, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: feedbackText.trim() ? 1 : 0.5 }}>Send</button>
          </div>
        </Card>
        <Card title={`Score History · ${testScores.length} records`}>
          {barData.length > 0 && <div style={{ height: 150, marginBottom: 12 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={barData}><CartesianGrid strokeDasharray="3 3" stroke={T.s2} /><XAxis dataKey="name" tick={{ fill: T.ink3, fontSize: 9 }} /><YAxis tick={{ fill: T.ink3, fontSize: 9 }} domain={[0, 100]} /><Tooltip contentStyle={{ background: T.white, border: `1px solid ${T.bdr}`, borderRadius: 8, fontSize: 11 }} /><Bar dataKey="score" fill={T.blue} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}><thead><tr>{["SUBJECT", "DATE", "SCORE"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, color: T.ink3, fontWeight: 600, borderBottom: `1px solid ${T.s2}` }}>{h}</th>)}</tr></thead><tbody>{scoreHist.map(t => { const d = toDate(t.timestamp || t.createdAt); return <tr key={t.id} style={{ borderBottom: `1px solid ${T.s2}` }}><td style={{ padding: "8px", color: T.ink }}>{(t.subject || "TEST").slice(0, 20)}</td><td style={{ padding: "8px", color: T.ink3 }}>{d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }).toUpperCase() : "—"}</td><td style={{ padding: "8px", fontWeight: 600, color: T.blue }}>{Number(t.percentage ?? t.score ?? 0)}%</td></tr>; })}</tbody></table>
        </Card>
      </div>

      {/* Status bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", background: T.white, border: `1px solid ${T.bdr}`, borderRadius: 12, fontSize: 10, color: T.ink3 }}>
        <span>★ ENGAGEMENT: {Math.min(100, parentNotes.length * 20)}%</span><span>★ Status: Active</span><span>★ Data: Live</span><span>★ STUDENT ID: {sid.slice(0, 8).toUpperCase()}</span>
      </div>
    </div>
  );
}