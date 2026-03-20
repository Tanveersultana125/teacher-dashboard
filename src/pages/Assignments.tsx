import React, { useState, useEffect } from "react";
import CreateAssignment from "@/components/CreateAssignment";
import GradeAssignment from "@/components/GradeAssignment";
import { db } from "../lib/firebase";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { Loader2, FilePlus, CopyPlus } from "lucide-react";

const Assignments = () => {
  const [view, setView] = useState<'list' | 'create' | 'grade'>('list');
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  
  const [assignmentsData, setAssignmentsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
         const snap = await getDocs(query(collection(db, "assignments"), limit(20)));
         const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
         setAssignmentsData(fetched);
      } catch (e) {
         console.warn("Assignments empty or not found");
      } finally {
         setLoading(false);
      }
    };
    fetchAssignments();
  }, [view]); // refetch when returning to list

  const handleAction = (action: string, assignment: any) => {
    if (action === "Grade") {
      setSelectedAssignment(assignment);
      setView('grade');
    }
  };

  if (view === 'create') {
    return <CreateAssignment onCancel={() => setView('list')} onCreate={() => setView('list')} />;
  }

  if (view === 'grade') {
    return <GradeAssignment assignment={selectedAssignment} onBack={() => setView('list')} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assignments</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">Create, manage, and auto-grade student alignments.</p>
        </div>
        <button 
          onClick={() => setView('create')}
          className="bg-[#1e3a8a] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-[#1e4fc0] transition-colors"
        >
          Create Assignment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-blue-100/50" />
          <div>
            <h2 className="text-3xl font-black text-foreground tracking-tight">{assignmentsData.length}</h2>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Active</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-yellow-100/60" />
          <div>
            <h2 className="text-3xl font-black text-foreground tracking-tight">0</h2>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Due This Week</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-red-100/60" />
          <div>
            <h2 className="text-3xl font-black text-foreground tracking-tight">0</h2>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pending Grading</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-green-100/50" />
          <div>
            <h2 className="text-3xl font-black text-foreground tracking-tight">0%</h2>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Avg. Submission</p>
          </div>
        </div>
      </div>

      {loading ? (
         <div className="py-24 flex flex-col items-center justify-center bg-card border border-dashed border-border rounded-[2rem]">
            <Loader2 className="w-8 h-8 text-[#1e3a8a] animate-spin mb-4" />
         </div>
      ) : assignmentsData.length === 0 ? (
         <div className="py-24 flex flex-col items-center justify-center bg-card border border-dashed border-border rounded-[2rem]">
            <FilePlus className="w-16 h-16 text-slate-200 mb-6" />
            <h2 className="text-xl font-bold text-slate-700 mb-2">No Assignments Created</h2>
            <p className="text-sm font-medium text-slate-500 max-w-sm text-center mb-6">Create an assignment using the AI Generator to calibrate difficulty and personalize groups automatically.</p>
            <button onClick={() => setView('create')} className="flex items-center gap-2 px-6 py-3 bg-[#1e3a8a] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e4fc0]">
               <CopyPlus className="w-4 h-4" /> Build with AI
            </button>
         </div>
      ) : (
         <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="bg-slate-50/50">
                        <th className="py-5 px-6 text-xs font-bold text-muted-foreground uppercase">Assignment</th>
                        <th className="py-5 px-6 text-xs font-bold text-muted-foreground uppercase">Class</th>
                        <th className="py-5 px-6 text-xs font-bold text-muted-foreground uppercase">Due Date</th>
                        <th className="py-5 px-6 text-xs font-bold text-muted-foreground uppercase">Status</th>
                        <th className="py-5 px-6 text-xs font-bold text-muted-foreground uppercase">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                     {assignmentsData.map((a, i) => (
                        <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                           <td className="py-4 px-6 min-w-[200px]">
                              <p className="font-bold text-foreground text-[15px] leading-tight mb-0.5">{a.title}</p>
                              <p className="text-[13px] font-semibold text-foreground line-clamp-1">{a.description}</p>
                           </td>
                           <td className="py-4 px-6 text-[13px] font-medium text-foreground">{a.class || 'N/A'}</td>
                           <td className="py-4 px-6 text-[13px] font-bold text-foreground">{a.dueDate || 'N/A'}</td>
                           <td className="py-4 px-6 text-[13px] font-medium text-foreground">
                              {a.status || 'Active'}
                           </td>
                           <td className="py-4 px-6">
                              <button onClick={() => handleAction("Grade", a)} className="text-[13px] bg-green-50 text-green-700 px-4 py-1.5 rounded-lg border border-green-200 font-bold hover:bg-green-100 text-left">
                                 Grade Submissions
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      )}

    </div>
  );
};

export default Assignments;
