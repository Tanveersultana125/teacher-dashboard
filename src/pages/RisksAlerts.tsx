import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, onSnapshot, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { AlertTriangle, UserX, GraduationCap, Clock, CheckCircle2, Loader2, Send, MessageSquare, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface Alert {
  id: string;
  studentId: string;
  name: string;
  initials: string;
  severity: "Critical" | "High Priority" | "Medium Priority";
  type: "Attendance" | "Grades" | "Submissions" | "Behavior";
  issue: string;
  details: string[];
  cls: string;
  resolved?: boolean;
}

const severityColors: Record<string, string> = {
  Critical: "bg-rose-500 text-white shadow-rose-200 shadow-lg",
  "High Priority": "bg-amber-500 text-white shadow-amber-200 shadow-lg",
  "Medium Priority": "bg-blue-600 text-white shadow-blue-200 shadow-lg",
};

const RisksAlerts = () => {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTab, setActiveTab] = useState("All Alerts");
  const [stats, setStats] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    resolved: 0
  });

  useEffect(() => {
    // 1. Listen for global students, attendance, grades and manual risks
    const qStudents = query(collection(db, "students"));
    const unsubscribe = onSnapshot(qStudents, async (snapshot) => {
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch Attendance & Grades for calculation-based risks
      const attSnap = await getDocs(collection(db, "attendance"));
      const gradeSnap = await getDocs(collection(db, "grades"));
      const risksSnap = await getDocs(collection(db, "risks"));

      const allAtt = attSnap.docs.map(d => d.data());
      const allGrades = gradeSnap.docs.map(d => d.data());
      const manualRisks = risksSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const generatedAlerts: Alert[] = [];

      students.forEach((s: any) => {
        const studentAtt = allAtt.filter((a: any) => a.studentId === s.id);
        const presentCount = studentAtt.filter((a: any) => a.status === 'present' || a.status === 'late').length;
        const totalCount = studentAtt.length;
        const rate = totalCount > 0 ? (presentCount / totalCount) * 100 : 100;

        // Condition 1: Low Attendance (< 75%)
        if (rate < 75 && totalCount >= 5) {
          generatedAlerts.push({
            id: `att_${s.id}`,
            studentId: s.id,
            name: s.name,
            initials: s.name?.substring(0, 2).toUpperCase() || "ST",
            severity: rate < 60 ? "Critical" : "High Priority",
            type: "Attendance",
            issue: `Attendance dropped to ${rate.toFixed(1)}% - ${totalCount - presentCount} absences detected.`,
            details: [`Pattern: Last 3 weeks analysis`, `Rate: ${rate.toFixed(1)}%`],
            cls: s.grade || s.class || "8-A"
          });
        }

        // Condition 2: Low Grades (Avg < 50%)
        const studentGrade: any = allGrades.find((g: any) => g.studentId === s.id);
        if (studentGrade) {
           const total = (studentGrade.hw1 || 0) + (studentGrade.hw2 || 0) + (studentGrade.hw3 || 0) + 
                         (studentGrade.q1 || 0) + (studentGrade.q2 || 0) + (studentGrade.ut1 || 0) + 
                         (studentGrade.ut2 || 0) + (studentGrade.mid || 0) + (studentGrade.proj || 0);
           const avg = (total / 330) * 100;
           if (avg < 50) {
              generatedAlerts.push({
                id: `grd_${s.id}`,
                studentId: s.id,
                name: s.name,
                initials: s.name?.substring(0, 2).toUpperCase() || "ST",
                severity: "Critical",
                type: "Grades",
                issue: `Academic achievement at ${avg.toFixed(1)}% - Falling below risk threshold.`,
                details: [`Current Avg: ${avg.toFixed(1)}%`, `At risk of absolute failure`],
                cls: s.grade || s.class || "8-A"
              });
           }
        }
      });

      // Add Manual/AI Risks from DB
      manualRisks.forEach((r: any) => {
        if (!r.resolved) {
          generatedAlerts.push({
             id: r.id,
             studentId: r.studentId,
             name: r.studentName,
             initials: r.studentName?.substring(0, 2).toUpperCase() || "ST",
             severity: r.severity || "High Priority",
             type: r.type || "Behavior",
             issue: r.issue,
             details: r.details || [],
             cls: r.class || "8-A"
          });
        }
      });

      setAlerts(generatedAlerts);
      setStats({
        critical: generatedAlerts.filter(a => a.severity === 'Critical').length,
        high: generatedAlerts.filter(a => a.severity === 'High Priority').length,
        medium: generatedAlerts.filter(a => a.severity === 'Medium Priority').length,
        resolved: (manualRisks as any[]).filter(r => r.resolved).length
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleResolve = async (alertId: string) => {
    try {
      if (alertId.startsWith('att_') || alertId.startsWith('grd_')) {
        toast.info("This is a system-generated alert. It will resolve once data improves.");
        return;
      }
      await updateDoc(doc(db, "risks", alertId), { resolved: true });
      toast.success("Risk marked as resolved!");
    } catch (e) {
      toast.error("Failed to update status.");
    }
  };

  const tabs = ["All Alerts", "Attendance", "Grades", "Submissions", "Behavior"];
  const filteredAlerts = alerts.filter(a => activeTab === "All Alerts" || a.type === activeTab);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-[#1e293b] tracking-tight">Safeguarding & Risks</h1>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">AI-Driven early warning system for scholars.</p>
        </div>
        <button className="bg-[#1e3a8a] text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:scale-105 transition-transform flex items-center gap-2">
           <ShieldAlert className="w-4 h-4"/> AI Diagnostic Sweep
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-rose-50 border-2 border-rose-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 shadow-lg shadow-rose-200 flex items-center justify-center text-white"><AlertTriangle className="w-6 h-6"/></div>
            <div>
              <p className="text-3xl font-black text-rose-600 leading-tight">{stats.critical}</p>
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Critical</p>
            </div>
        </div>
        <div className="bg-amber-50 border-2 border-amber-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 shadow-lg shadow-amber-200 flex items-center justify-center text-white"><AlertTriangle className="w-6 h-6"/></div>
            <div>
              <p className="text-3xl font-black text-amber-600 leading-tight">{stats.high}</p>
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">High Priority</p>
            </div>
        </div>
        <div className="bg-blue-50 border-2 border-blue-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 shadow-lg shadow-blue-200 flex items-center justify-center text-white"><Clock className="w-6 h-6"/></div>
            <div>
              <p className="text-3xl font-black text-blue-600 leading-tight">{stats.medium}</p>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Medium</p>
            </div>
        </div>
        <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200 flex items-center justify-center text-white"><CheckCircle2 className="w-6 h-6"/></div>
            <div>
              <p className="text-3xl font-black text-emerald-600 leading-tight">{stats.resolved}</p>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Resolved</p>
            </div>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] shadow-sm overflow-hidden mt-8">
        {/* Tabs */}
        <div className="flex px-10 pt-4 border-b border-slate-50 overflow-x-auto gap-8">
          {tabs.map((t) => (
            <button 
              key={t} 
              onClick={() => setActiveTab(t)}
              className={`px-2 py-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative
                ${activeTab === t ? "text-[#1e3a8a]" : "text-slate-400 hover:text-slate-600"}`}
            >
              {t} {t === "All Alerts" ? `(${alerts.length})` : `(${alerts.filter(a => a.type === t).length})`}
              {activeTab === t && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1e3a8a] rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* content */}
        <div className="p-8 space-y-6 bg-slate-50/20">
          {loading ? (
             <div className="py-24 text-center">
                <Loader2 className="w-12 h-12 text-[#1e3a8a] animate-spin mx-auto mb-4" />
                <p className="text-sm font-black text-[#1e3a8a] uppercase tracking-widest">Scanning Student Risks...</p>
             </div>
          ) : filteredAlerts.length === 0 ? (
             <div className="py-24 text-center flex flex-col items-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-200 mb-4" />
                <h3 className="text-xl font-black text-slate-800">No Active Risks</h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-tight mt-1">All scholars are meeting institutional performance thresholds.</p>
             </div>
          ) : (
            filteredAlerts.map((a) => (
              <div key={a.id} className={`flex flex-col lg:flex-row items-start lg:items-center gap-6 p-6 rounded-[2rem] border-2 bg-white shadow-sm transition-all hover:shadow-xl hover:scale-[1.01] ${a.severity === 'Critical' ? 'border-rose-100' : 'border-slate-50'}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-[10px] font-black shadow-lg shrink-0 ${a.severity === 'Critical' ? 'bg-rose-500 shadow-rose-200' : a.severity === 'High Priority' ? 'bg-amber-500 shadow-amber-200' : 'bg-blue-600 shadow-blue-200'}`}>
                    {a.initials}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-black text-lg text-slate-800 tracking-tight">{a.name}</h3>
                    <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${severityColors[a.severity]}`}>
                        {a.severity}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 px-3 py-1 rounded-lg">{a.cls}</span>
                  </div>
                  
                  <p className="text-base font-bold text-slate-700 mb-3">{a.issue}</p>
                  
                  <div className="flex items-center gap-6 flex-wrap">
                    {a.details.map((d, j) => (
                      <p key={j} className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-slate-200" /> {d}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 shrink-0 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-50 mt-4 lg:mt-0">
                    <button className="flex-1 lg:flex-none px-6 py-3 bg-[#1e3a8a] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-800 transition-all flex items-center justify-center gap-2">
                        <Send className="w-4 h-4"/> Take Action
                    </button>
                    <button 
                      onClick={() => handleResolve(a.id)}
                      className="flex-1 lg:flex-none px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-white border-2 border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-emerald-200 hover:text-emerald-600 transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 className="w-4 h-4"/> Resolved
                    </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RisksAlerts;
