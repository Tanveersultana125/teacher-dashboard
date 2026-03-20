import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, Loader2, Save, Trash2, UserCheck, UserX, Clock, Sparkles } from 'lucide-react';
import { db } from "../lib/firebase";
import { collection, query, getDocs, addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";
import { useAuth } from "../lib/AuthContext";
import { toast } from "sonner";

const MarkAttendance = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const q = query(collection(db, "students"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          status: 'none' // Default status for marking session
        }));
        setStudents(data);
      } catch (e) {
        console.error("Error fetching students:", e);
        toast.error("Failed to load student roster.");
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const stats = {
    present: students.filter(s => s.status === 'present').length,
    absent: students.filter(s => s.status === 'absent').length,
    late: students.filter(s => s.status === 'late').length,
    unmarked: students.filter(s => s.status === 'none').length,
  };

  const toggleStatus = (id: string, status: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: s.status === status ? 'none' : status } : s));
  };

  const markAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'present' })));
  };

  const handleSave = async () => {
    if (stats.unmarked > 0) {
      if (!confirm(`You have ${stats.unmarked} unmarked students. Proceed anyway?`)) return;
    }

    setSaving(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Save each marked student record
      const promises = students
        .filter(s => s.status !== 'none')
        .map(s => {
          const attendanceRef = doc(db, "attendance", `${s.id}_${today}`);
          return setDoc(attendanceRef, {
            studentId: s.id,
            studentName: s.name,
            status: s.status,
            date: today,
            teacherId: user?.uid,
            grade: s.grade || s.class || "Unknown",
            timestamp: serverTimestamp()
          });
        });

      await Promise.all(promises);
      toast.success("Attendance saved successfully for today!");
      onBack();
    } catch (e) {
      console.error("Error saving attendance:", e);
      toast.error("Failed to save attendance. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) || 
    String(s.roll || "").includes(search)
  );

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <div>
          <button 
            onClick={onBack}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#1e3a8a] flex items-center gap-1 mb-2 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Overview
          </button>
          <h1 className="text-3xl font-black text-foreground">Attendance Roster</h1>
          <p className="text-sm font-bold text-muted-foreground mt-1 uppercase tracking-widest flex items-center gap-2">
             Class 8-A • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl text-sm font-black shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Daily Roster
        </button>
      </div>

      <div className="bg-card border rounded-[2rem] p-6 mb-8 flex flex-wrap items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Automation:</span>
          <button 
            onClick={markAllPresent}
            disabled={loading}
            className="px-5 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-emerald-200 hover:bg-emerald-50 transition-all flex items-center gap-2"
          >
            <UserCheck className="w-3.5 h-3.5" /> Mark All Present
          </button>
        </div>
        
        <div className="flex items-center gap-8 bg-slate-50/50 px-8 py-3 rounded-2xl border border-slate-100">
          <div className="flex flex-col items-center">
            <span className="text-lg font-black text-emerald-600 leading-none">{stats.present}</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Present</span>
          </div>
          <div className="flex flex-col items-center border-x border-slate-200 px-8">
            <span className="text-lg font-black text-rose-600 leading-none">{stats.absent}</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Absent</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg font-black text-amber-600 leading-none">{stats.late}</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Late</span>
          </div>
        </div>
      </div>

      <div className="content-card border rounded-[2.5rem] bg-card p-10 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-10 pb-6 border-b border-border gap-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Student Daily Status</h2>
            <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mt-1">{students.length} Total Scholars Registered</p>
          </div>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input 
              type="text" 
              placeholder="Search by name or roll..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-6 py-4 border-2 border-slate-50 bg-slate-50/50 rounded-2xl text-sm font-bold focus:outline-none focus:border-[#1e3a8a] focus:bg-white transition-all w-80 shadow-inner"
            />
          </div>
        </div>

        {loading ? (
           <div className="py-24 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-[#1e3a8a] animate-spin mb-4" />
              <p className="text-sm font-extrabold text-[#1e3a8a] uppercase tracking-widest text-center">Configuring Digital Roster Memory...</p>
           </div>
        ) : filteredStudents.length === 0 ? (
           <div className="py-24 flex flex-col items-center justify-center text-center px-4">
              <UserX className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">No matching students found in the current roster.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredStudents.map((student) => (
              <div key={student.id} className="border-2 border-slate-50 rounded-3xl p-6 transition-all hover:shadow-xl hover:border-blue-100 bg-white group relative overflow-hidden">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#1e3a8a] font-black text-xl shadow-sm transition-transform group-hover:scale-110`}>
                    {student.name?.substring(0, 2).toUpperCase() || "ST"}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 leading-tight mb-1">{student.name}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Roll: {student.roll || "N/A"}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => toggleStatus(student.id, 'present')}
                    className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                      student.status === 'present' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' 
                        : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-400 hover:text-emerald-600'
                    }`}
                  >
                    Present
                  </button>
                  <button 
                    onClick={() => toggleStatus(student.id, 'absent')}
                    className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                      student.status === 'absent' 
                        ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-200' 
                        : 'bg-white text-slate-400 border-slate-100 hover:border-rose-400 hover:text-rose-600'
                    }`}
                  >
                    Absent
                  </button>
                  <button 
                    onClick={() => toggleStatus(student.id, 'late')}
                    className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                      student.status === 'late' 
                        ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-200' 
                        : 'bg-white text-slate-400 border-slate-100 hover:border-amber-400 hover:text-amber-500'
                    }`}
                  >
                    Late
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkAttendance;
