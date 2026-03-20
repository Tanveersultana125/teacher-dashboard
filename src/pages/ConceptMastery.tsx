import { useState, useEffect } from "react";
import ConceptMasteryDetail from "@/components/ConceptMasteryDetail";
import { BrainCircuit, Loader2, Target, Users, Sparkles, BookOpen } from "lucide-react";
import { AIController } from "../ai/controller/ai-controller";
import { db } from "../lib/firebase";
import { collection, query, onSnapshot, getDocs } from "firebase/firestore";

const conceptHeaders = [
  "Algebraic Expressions", "Linear Equations", "Quadratic Equations", "Polynomials",
  "Geometry", "Triangles", "Circles", "Statistics", "Probability"
];

const cellColor = (pct: number) => {
  if (pct >= 80) return "bg-emerald-100/50 text-emerald-700 border border-emerald-200/50";
  if (pct >= 50) return "bg-amber-100/50 text-amber-700 border border-amber-200/50";
  return "bg-rose-100/50 text-rose-700 border border-rose-200/50";
};

const ConceptMastery = () => {
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [masteryData, setMasteryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiGaps, setAiGaps] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // 1. Fetch Students & Mastery in real-time
    const q = query(collection(db, "students"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // 2. Fetch Mastery collection
      const masterySnap = await getDocs(collection(db, "concept_mastery"));
      const masteryDocs = masterySnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const data = snapshot.docs.map(doc => {
        const s = doc.data();
        const mastery: any = masteryDocs.find((m: any) => m.studentId === doc.id) || {};
        
        // Map mastery scores to headers (fallback to 0 or random for visual if unranked?)
        // Better to leave as 0 or empty for "functional" feel
        const scores = conceptHeaders.map(h => mastery.scores?.[h] || 0);

        return {
          id: doc.id,
          name: s.name,
          grade: s.grade || s.class || "8",
          initials: s.name?.substring(0,2).toUpperCase() || "ST",
          color: "bg-[#1e3a8a]",
          concepts: scores
        };
      });

      setMasteryData(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleClassGapsAnalysis = async () => {
     if (masteryData.length === 0) return;
     setIsAnalyzing(true);
     try {
        const payload = {
           class: "Class 8A",
           topics: conceptHeaders,
           student_averages: masteryData.map(s => ({
              name: s.name,
              scores: s.concepts
           }))
        };
        const result = await AIController.getClassGaps(payload);
        if (result.status === "success" && result.data) {
           setAiGaps(result.data);
        }
     } catch (e) {
        console.error(e);
     } finally {
        setIsAnalyzing(false);
     }
  };

  if (selectedStudent) {
    return <ConceptMasteryDetail student={selectedStudent} concepts={conceptHeaders} scores={selectedStudent.concepts} onBack={() => setSelectedStudent(null)} />;
  }

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground">Concept Mastery</h1>
          <p className="text-muted-foreground mt-1 text-sm font-bold uppercase tracking-widest">Track micro-skills & learning trajectories.</p>
        </div>
        <button 
           onClick={handleClassGapsAnalysis} disabled={isAnalyzing || masteryData.length === 0}
           className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl text-sm font-black shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin"/> : <BrainCircuit className="w-5 h-5"/>} AI Learning Gap Detection
        </button>
      </div>

      <div className="flex items-center gap-6 mb-8 text-[11px] font-black uppercase tracking-widest text-slate-400">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-lg bg-emerald-400 shadow-sm" /> Mastered (80%+)</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-lg bg-amber-400 shadow-sm" /> Developing (50-79%)</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-lg bg-rose-400 shadow-sm" /> Weak (&lt;50%)</div>
      </div>

      {aiGaps?.class_level_gaps?.length > 0 && (
         <div className="bg-rose-50/50 border border-rose-200 rounded-[2rem] p-8 shadow-sm mb-8 animate-in slide-in-from-top-4">
            <h2 className="text-sm font-black text-rose-800 uppercase tracking-widest mb-4 flex items-center gap-2">
               <Target className="w-5 h-5"/> Institutional Learning Gaps Identified
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {aiGaps.class_level_gaps.map((gap: any, i:number) => (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm">
                     <div className="flex justify-between items-start mb-2">
                        <span className="bg-rose-100/50 text-rose-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg">{gap.concept}</span>
                     </div>
                     <p className="text-xs font-bold text-slate-600 mb-3">{gap.failure_reason}</p>
                     <p className="text-[10px] uppercase font-black tracking-widest text-indigo-500 border-t pt-3 border-slate-50 mt-2">Action: {gap.suggested_class_action}</p>
                  </div>
               ))}
            </div>
         </div>
      )}

      {loading ? (
        <div className="py-24 text-center bg-white border-2 border-slate-50 rounded-[2rem] shadow-sm">
           <Loader2 className="w-12 h-12 text-[#1e3a8a] animate-spin mx-auto mb-4" />
           <p className="text-xs font-black text-[#1e3a8a] uppercase tracking-widest">Building Mastery Matrix...</p>
        </div>
      ) : masteryData.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center bg-white border border-dashed border-slate-200 rounded-[3rem] shadow-sm text-center px-6">
           <Sparkles className="w-20 h-20 text-indigo-100 mb-6" />
           <h2 className="text-2xl font-black text-slate-800 mb-2">Matrix Ready for Deployment</h2>
           <p className="text-sm font-bold text-slate-400 max-w-sm uppercase tracking-tight leading-relaxed mb-6">
             After you assign topics to your students, their micro-skill scores will auto-populate this matrix in real-time.
           </p>
           <button className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2">
             <BookOpen className="w-4 h-4"/> Initialize Mastery Protocol
           </button>
        </div>
      ) : (
        <div className="content-card border rounded-[2rem] overflow-hidden shadow-sm bg-white p-1">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="text-left py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[220px] border-r border-slate-100 sticky left-0 z-10 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Scholars</th>
                  {conceptHeaders.map((h) => (
                    <th key={h} className="text-center py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[140px] leading-tight border-r border-slate-50 last:border-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {masteryData.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td onClick={() => setSelectedStudent(s)} className="py-5 px-8 cursor-pointer border-r border-slate-50 sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl ${s.color} flex items-center justify-center text-white text-[10px] font-black shadow-sm`}>{s.initials}</div>
                        <div>
                          <p className="font-black text-slate-800 text-sm whitespace-nowrap">{s.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 whitespace-nowrap">ID: SR-{s.grade}00</p>
                        </div>
                      </div>
                    </td>
                    {s.concepts.map((c:number, i:number) => (
                      <td key={i} className="py-5 px-4 text-center border-r border-slate-50 last:border-0">
                        <span className={`text-[11px] font-black px-5 py-2.5 rounded-2xl block w-fit mx-auto shadow-sm ${cellColor(c)}`}>
                          {c > 0 ? `${c}%` : "—"}
                        </span>
                      </td>
                    ))}
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

export default ConceptMastery;
