import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { AIController } from "../ai/controller/ai-controller";
import { BookOpen, Users, Clock, ArrowRight, GraduationCap, Loader2, HeartPulse, Activity, BrainCircuit, Sparkles } from "lucide-react";

const MyClasses = () => {
  const navigate = useNavigate();
  const { teacherData, user } = useAuth();
  
  const assignedClass = teacherData?.classes;

  const [loading, setLoading] = useState(true);
  const [dataExists, setDataExists] = useState(false);
  const [aiData, setAiData] = useState<any>(null);
  const [placeholderMessage, setPlaceholderMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchClassInsights = async () => {
      try {
        if (!assignedClass) {
           setPlaceholderMessage("No class assigned to you yet. Please wait for the Principal.");
           setLoading(false);
           return;
        }

        // Real Developer Logic: Query REAL students assigned to this specific class
        const studentsSnap = await getDocs(query(collection(db, "students")));
        let classStudents = studentsSnap.docs.map(d => d.data());
        
        // Filter students belonging to this teacher's class
        classStudents = classStudents.filter(s => 
           assignedClass.toLowerCase().includes(String(s.grade).toLowerCase()) || 
           String(s.class).toLowerCase() === assignedClass.toLowerCase()
        );

        const exists = classStudents.length > 0;
        setDataExists(exists);

        if (!exists) {
           setPlaceholderMessage("After you add students to your class roster, these AI metrics will start working automatically.");
           setLoading(false);
           return;
        }

        // Calculate actual health metrics from the dynamically fetched students array
        const actualInput = {
           class_name: assignedClass,
           total_students: classStudents.length,
           timestamp: new Date().toISOString()
        };

        const result = await AIController.getClassInsights(actualInput);
        
        if (result.status === "no_data") {
           setPlaceholderMessage("After you add students to your class roster, these AI metrics will start working automatically.");
        } else if (result.status === "success" && result.data) {
           setAiData(result.data);
           setPlaceholderMessage(null);
        } else {
           setPlaceholderMessage(result.message || "Error analyzing insights.");
        }
      } catch (err) {
        console.error("MyClasses fetch error: ", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClassInsights();
  }, [assignedClass]);

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Classes</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">Manage all your assigned grades and students.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#1e3a8a]/5 border border-[#1e3a8a]/10 rounded-2xl px-5 py-2.5 flex flex-col items-end">
             <span className="text-[10px] font-bold text-[#1e3a8a] uppercase tracking-widest">Active Status</span>
             <span className="text-sm font-black text-[#1e3a8a] leading-none uppercase">Teaching Online</span>
          </div>
        </div>
      </div>

      {!assignedClass ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[40px] border border-dashed border-slate-200 shadow-inner px-6 text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
            <BookOpen className="w-12 h-12 text-slate-200" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">No Classes Assigned Yet</h2>
          <p className="text-sm font-bold text-slate-400 max-w-sm uppercase tracking-tight leading-relaxed">
            Please wait for the Principal to assign your grade/class from the Management Portal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Class Card */}
          <div className="lg:col-span-5 bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden h-fit">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#1e3a8a]/5 to-transparent rounded-bl-[120px] -mr-12 -mt-12 transition-transform group-hover:scale-110 duration-700 pointer-events-none" />
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] flex items-center justify-center text-white shadow-lg shadow-blue-500/20 transform group-hover:rotate-6 transition-transform">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div className="flex flex-col items-end">
                <span className="bg-green-50 text-green-600 text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-green-100 shadow-sm">
                  Live & Assigned
                </span>
                <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">Academic Year 2025-26</span>
              </div>
            </div>

            <div className="relative z-10">
              <h3 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">{assignedClass}</h3>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1e3a8a] animate-pulse" />
                {teacherData?.subject || 'Primary Educator'}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-3.5 h-3.5 text-[#1e3a8a]" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Students</span>
                  </div>
                  <p className="text-lg font-black text-slate-900">Active Roster</p>
                </div>
                
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-[#1e3a8a]" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Schedule</span>
                  </div>
                  <p className="text-lg font-black text-slate-900">Today's Class</p>
                </div>
              </div>

              <button
                onClick={() => navigate("/students")}
                className="w-full bg-[#1e3a8a] text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#1e4fc0] transition-all shadow-md flex items-center justify-center gap-3 group/btn h-14"
              >
                Go to Class Dashboard
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-2" />
              </button>
            </div>
          </div>

          {/* AI Insights Panel */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {loading ? (
               <div className="flex-1 flex flex-col items-center justify-center bg-card border border-dashed border-border rounded-[32px] p-8">
                  <Loader2 className="w-10 h-10 text-[#1e3a8a] animate-spin mb-4" />
                  <p className="text-sm font-bold text-slate-500">Generating class insights...</p>
               </div>
            ) : !dataExists || placeholderMessage ? (
               <div className="flex-1 flex flex-col items-center justify-center py-16 bg-card border border-dashed border-border rounded-[32px] shadow-sm px-6 text-center">
                  <Sparkles className="w-12 h-12 text-[#1e3a8a] mb-4 animate-pulse" />
                  <p className="text-sm font-bold text-slate-500 max-w-sm leading-relaxed mb-6">
                    {placeholderMessage || "After you add students to your class roster, these AI metrics will start working automatically."}
                  </p>
                  <button onClick={() => navigate("/students")} className="px-5 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest pointer-events-none">
                    Waiting for Roster
                  </button>
               </div>
            ) : (
               <>
                 {/* FEATURE 4: Class Health Score */}
                 <div className="bg-card border border-border rounded-[32px] p-8 shadow-sm relative overflow-hidden group">
                   <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6 relative z-10">
                      <div>
                         <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                           <Activity className="w-5 h-5 text-emerald-500"/> Overall Class Health Matrix
                         </h3>
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">AI Calculated • Aggregated Metrics</p>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="text-right">
                           <p className="text-4xl font-black text-emerald-500 tracking-tighter leading-none">{aiData?.class_health?.score || 0}</p>
                           <p className="text-[10px] uppercase font-black text-slate-400 mt-1 tracking-widest">/ 100 PTS</p>
                         </div>
                      </div>
                   </div>
                   
                   <div className="p-5 bg-slate-50/80 border border-slate-100 rounded-2xl relative z-10">
                      <p className="text-sm font-bold text-slate-700 italic border-l-4 border-emerald-400 pl-4 py-1 leading-relaxed">
                        "{aiData?.class_health?.breakdown}"
                      </p>
                   </div>
                 </div>

                 {/* FEATURE 5: Seating / Group Suggestions */}
                 <div className="bg-card border border-border rounded-[32px] shadow-sm flex-1 flex flex-col overflow-hidden">
                   <div className="p-8 border-b border-border bg-indigo-50/30">
                      <h3 className="text-lg font-black text-indigo-900 flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-indigo-500"/> Smart Group Synergy
                      </h3>
                      <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1.5">AI-Powered Interaction Suggestions</p>
                   </div>
                   
                   <div className="p-8 pb-4 flex-1">
                      {aiData?.seating_suggestions?.length === 0 ? (
                         <div className="text-center py-8">
                            <p className="text-sm font-bold text-slate-400">No synergy configurations found yet.</p>
                         </div>
                      ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {aiData?.seating_suggestions?.map((group: any, i: number) => (
                               <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-300 transition-colors">
                                  <h4 className="text-xs font-black text-indigo-700 uppercase tracking-wider mb-3 bg-indigo-50 inline-block px-3 py-1 rounded-md">
                                    {group.group_name}
                                  </h4>
                                  <div className="flex flex-wrap gap-2 mb-4">
                                     {group.students?.map((stu: string, j: number) => (
                                        <span key={j} className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 shadow-sm">{stu}</span>
                                     ))}
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    {group.reason}
                                  </p>
                               </div>
                            ))}
                         </div>
                      )}
                   </div>
                 </div>
               </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyClasses;
