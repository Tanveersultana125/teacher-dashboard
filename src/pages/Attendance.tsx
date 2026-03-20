import { useState, useEffect } from "react";
import StatCard from "@/components/StatCard";
import MarkAttendance from "@/components/MarkAttendance";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, getDocs, limit } from "firebase/firestore";
import { Loader2, CalendarClock, AlertCircle, TrendingUp, UserCheck, UserX, Clock } from "lucide-react";

const Attendance = () => {
  const [isMarking, setIsMarking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({
    rate: "0%",
    presentToday: 0,
    absentToday: 0,
    lateToday: 0
  });
  const [weeklyOverview, setWeeklyOverview] = useState<any[]>([]);

  useEffect(() => {
    // 1. Fetch all attendance records to calculate stats
    const q = query(collection(db, "attendance"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendanceRecords(records);

      if (records.length > 0) {
        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = records.filter((r: any) => r.date === today);
        
        const presentToday = todayRecords.filter((r: any) => r.status === 'present').length;
        const absentToday = todayRecords.filter((r: any) => r.status === 'absent').length;
        const lateToday = todayRecords.filter((r: any) => r.status === 'late').length;

        const totalOverall = records.length;
        const totalPresentOverall = records.filter((r: any) => r.status === 'present' || r.status === 'late').length;
        const rate = totalOverall > 0 ? ((totalPresentOverall / totalOverall) * 100).toFixed(1) + "%" : "0%";

        setStats({
          rate,
          presentToday,
          absentToday,
          lateToday
        });

        // Generate weekly overview (last 5 days)
        const days = [];
        for (let i = 4; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const dayRecords = records.filter((r: any) => r.date === dateStr);
          
          if (dayRecords.length > 0) {
            const p = dayRecords.filter((r: any) => r.status === 'present' || r.status === 'late').length;
            const a = dayRecords.filter((r: any) => r.status === 'absent').length;
            days.push({
              day: d.toLocaleDateString('en-US', { weekday: 'short' }),
              date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              present: p,
              absent: a,
              rate: ((p / (p + a)) * 100).toFixed(1) + "%"
            });
          }
        }
        setWeeklyOverview(days);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isMarking) {
    return <MarkAttendance onBack={() => setIsMarking(false)} />;
  }

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground">Attendance Center</h1>
          <p className="text-muted-foreground font-medium mt-1">Real-time tracking and automated scholarly presence analysis.</p>
        </div>
        <button 
          onClick={() => setIsMarking(true)}
          className="bg-[#1e3a8a] text-white px-6 py-3.5 rounded-2xl text-sm font-black shadow-lg shadow-blue-900/20 hover:bg-[#1e4fc0] transition-colors flex items-center gap-2"
        >
          <CalendarClock className="w-4 h-4" /> Mark Today's Attendance
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600"><TrendingUp className="w-5 h-5"/></div>
           <div><p className="text-2xl font-black text-foreground">{stats.rate}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overall Rate</p></div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600"><UserCheck className="w-5 h-5"/></div>
           <div><p className="text-2xl font-black text-foreground">{stats.presentToday}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Present Today</p></div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600"><UserX className="w-5 h-5"/></div>
           <div><p className="text-2xl font-black text-foreground">{stats.absentToday}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Absent Today</p></div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600"><Clock className="w-5 h-5"/></div>
           <div><p className="text-2xl font-black text-foreground">{stats.lateToday}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Late Today</p></div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center bg-white border border-dashed border-slate-200 rounded-[2rem] shadow-sm">
           <Loader2 className="w-8 h-8 text-[#1e3a8a] animate-spin mb-4" />
           <p className="text-sm font-bold text-slate-500">Syncing with Attendance Roster...</p>
        </div>
      ) : attendanceRecords.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center bg-white border border-dashed border-slate-200 rounded-[2rem] shadow-sm text-center px-6">
           <CalendarClock className="w-16 h-16 text-slate-200 mb-6" />
           <h2 className="text-xl font-black text-slate-800 mb-2">Attendance Vault Empty</h2>
           <p className="text-sm font-bold text-slate-400 max-w-sm uppercase tracking-tight leading-relaxed mb-6">
             After you mark your first attendance, real-time analytics and weekly trends will appear here automatically.
           </p>
           <button onClick={() => setIsMarking(true)} className="px-8 py-3 bg-[#1e3a8a] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md">
             Initialize Attendance
           </button>
        </div>
      ) : (
        <>
          {/* Weekly Attendance */}
          <div className="bg-card border border-border rounded-[2rem] p-8 shadow-sm mb-8">
            <div className="mb-8">
              <h2 className="text-lg font-black text-foreground uppercase tracking-wider">Weekly Attendance Roster</h2>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Snapshot of the last 5 teaching days</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {weeklyOverview.map((d, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:bg-white transition-all hover:shadow-md group">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{d.day}</p>
                  <p className="text-lg font-black text-slate-900 mb-4">{d.date}</p>
                  <div className="space-y-2 border-t border-slate-200/50 pt-4">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-500">Present</span>
                      <span className="text-emerald-600 font-black">{d.present}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-500">Absent</span>
                      <span className="text-rose-600 font-black">{d.absent}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-between">
                     <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{d.rate}</span>
                     <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-200"></div>
                  </div>
                </div>
              ))}
              
              {/* Mark Today - Highlighted */}
              <div className="bg-[#1e3a8a] border border-[#1e3a8a] rounded-2xl p-5 shadow-xl shadow-blue-500/20 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-bl-full"></div>
                <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Today</p>
                <p className="text-lg font-black text-white mb-4">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                <button 
                  onClick={() => setIsMarking(true)}
                  className="w-full bg-white text-[#1e3a8a] text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest shadow-sm hover:scale-105 transition-transform"
                >
                  Mark Now
                </button>
              </div>
            </div>
          </div>

          {/* Attendance Issues - Real Data Filtering */}
          <div className="bg-card border border-border rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-black text-foreground uppercase tracking-wider">Attendance Concern Monitor</h2>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Students with frequent absences or late marks</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {/* Logic: Group by student and count absences */}
               {(() => {
                  const studentAbsences: any = {};
                  attendanceRecords.forEach((r: any) => {
                     if (r.status === 'absent' || r.status === 'late') {
                        if (!studentAbsences[r.studentId]) {
                           studentAbsences[r.studentId] = { name: r.studentName, count: 0, late: 0, absent: 0 };
                        }
                        if (r.status === 'absent') { studentAbsences[r.studentId].absent++; studentAbsences[r.studentId].count++; }
                        if (r.status === 'late') { studentAbsences[r.studentId].late++; studentAbsences[r.studentId].count++; }
                     }
                  });
                  
                  const concerns = Object.values(studentAbsences).filter((s:any) => s.count >= 2);
                  
                  if (concerns.length === 0) {
                     return (
                        <div className="col-span-3 py-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No critical attendance concerns detected</p>
                        </div>
                     )
                  }

                  return concerns.map((c: any, i: number) => (
                    <div key={i} className={`flex items-center gap-4 p-5 rounded-2xl border ${c.absent >= 3 ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0 ${c.absent >= 3 ? 'bg-rose-500' : 'bg-amber-500'}`}>
                        {c.name?.substring(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-foreground mb-1">{c.name}</h3>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${c.absent >= 3 ? 'text-rose-600' : 'text-amber-600'}`}>
                           {c.absent} Absences • {c.late} Late
                        </p>
                      </div>
                    </div>
                  ));
               })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Attendance;
