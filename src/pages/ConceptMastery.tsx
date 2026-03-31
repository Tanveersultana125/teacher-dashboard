import { useState, useEffect } from "react";
import ConceptMasteryDetail from "@/components/ConceptMasteryDetail";
import { BrainCircuit, Loader2, Target, Users, Sparkles, BookOpen, ChevronRight, GraduationCap, Clock, Award, ShieldAlert, BarChart3 } from "lucide-react";
import { AIController } from "../ai/controller/ai-controller";
import { db } from "../lib/firebase";
import { collection, query, onSnapshot, getDocs, where, Timestamp } from "firebase/firestore";
import { useAuth } from "../lib/AuthContext";
import { toast } from "sonner";

const cellColor = (pct: number) => {
  if (pct >= 80) return "bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm shadow-emerald-500/5";
  if (pct >= 50) return "bg-amber-50 text-amber-600 border border-amber-100 shadow-sm shadow-amber-500/5";
  if (pct >= 1) return "bg-rose-50 text-rose-600 border border-rose-100 shadow-sm shadow-rose-500/5";
  return "bg-slate-50 text-slate-300 border border-slate-100 italic";
};

const ConceptMastery = () => {
  const { teacherData } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  
  const [dynamicHeaders, setDynamicHeaders] = useState<string[]>([]);
  const [masteryData, setMasteryData] = useState<any[]>([]);
  const [classAverages, setClassAverages] = useState<number[]>([]);
  
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 1. Fetch Teacher's Active Assignments
  useEffect(() => {
    if (!teacherData?.id) return;
    const q = query(collection(db, "teaching_assignments"), where("teacherId", "==", teacherData.id), where("status", "==", "active"));
    const unsub = onSnapshot(q, async (snap) => {
      const assignments = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const classSnap = await getDocs(query(collection(db, "classes")));
      const classMap = new Map();
      classSnap.docs.forEach(d => classMap.set(d.id, d.data()));

      const assignmentOptions = assignments.map(a => {
        const cls = classMap.get(a.classId);
        return {
          id: a.id, 
          classId: a.classId,
          name: `${cls?.name || 'Class'} - ${a.subjectName || a.subject || 'Subject'}`
        };
      });
      
      const qLegacy = query(collection(db, "classes"), where("teacherId", "==", teacherData.id));
      const legacySnap = await getDocs(qLegacy);
      const lOps = legacySnap.docs.map(d => ({ id: d.id, classId: d.id, name: d.data().name }));
      
      const combined = [...assignmentOptions];
      lOps.forEach(lo => { if(!combined.some(c => c.classId === lo.classId)) combined.push(lo); });

      setClasses(combined);
      if (combined.length > 0 && !selectedClassId) setSelectedClassId(combined[0].id);
      if (combined.length === 0) setLoading(false);
    });
    return () => unsub();
  }, [teacherData?.id]);

  // 2. LIVE SYNC ENGINE (STRICT MARKS-BASED JUDGMENT)
  useEffect(() => {
    if (!teacherData?.id || !selectedClassId) return;
    setLoading(true);

    const selAssignment = classes.find(c => c.id === selectedClassId);
    const targetClassId = selAssignment?.classId || selectedClassId;

    // A. Fetch Registry Components (Tests/Gradebook Columns)
    const unsubRegistry = onSnapshot(query(collection(db, "gradebook_columns"), where("classId", "==", targetClassId)), (gbSnap) => {
       const gbCols = gbSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
       
       onSnapshot(query(collection(db, "tests_registry"), where("classId", "==", targetClassId)), (tSnap) => {
          const classTests = tSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
          
          const potentialTopicsSet = new Set<string>();
          classTests.forEach(t => { if (t.topics && Array.isArray(t.topics)) t.topics.forEach((c: string) => potentialTopicsSet.add(c.toUpperCase())); });
          gbCols.forEach(col => { if(col.name) potentialTopicsSet.add(col.name.toUpperCase()); });
          const potentialTopics = Array.from(potentialTopicsSet).sort();

          // B. RE-ACTIVE SCORE LISTENERS (Summative + Formative + Results)
          let s1:any=[], s2:any=[], s3:any=[];
          
          const processMatrix = (roster: any[]) => {
             const activeConceptsMap = new Map<string, boolean>();
             const builtMatrix = roster.map((s: any) => {
                const sEmail = s.email?.toLowerCase();
                const sId = s.realId;
                const filterByStudent = (arr: any[]) => arr.filter(item => (sId && (item.studentId === sId || item.id?.includes(sId))) || (sEmail && item.studentEmail?.toLowerCase() === sEmail));
                
                const sSum = filterByStudent(s1);
                const sFor = filterByStudent(s2);
                const sRes = filterByStudent(s3);

                const conceptScores = potentialTopics.map(concept => {
                   const rSum = sSum.filter(sc => classTests.find(t => t.id === sc.testId)?.topics?.some((t:any) => t.trim().toUpperCase() === concept));
                   const rFor = sFor.filter(sc => sc.columnName?.trim().toUpperCase() === concept || sc.columnId === gbCols.find(c => c.name?.trim().toUpperCase() === concept)?.id);
                   const rRes = sRes.filter(sc => sc.testName?.trim().toUpperCase() === concept || sc.assignmentTitle?.trim().toUpperCase() === concept || sc.title?.trim().toUpperCase() === concept);

                   const combined = [...rSum, ...rFor, ...rRes];
                   if (combined.length === 0) return 0;
                   activeConceptsMap.set(concept, true);

                   let total = 0, count = 0;
                   combined.forEach(sc => {
                      let pct = Number(sc.percentage ?? (sc.mark/sc.maxMarks*100) ?? (sc.score/sc.maxScore*100) ?? sc.score ?? 0);
                      if (pct >= 0) { total += pct; count++; }
                   });
                   return count > 0 ? Math.round(total / count) : 0;
                });
                return { ...s, rawConcepts: conceptScores };
             });

             const filteredHeaders = potentialTopics.filter(h => activeConceptsMap.has(h));
             setDynamicHeaders(filteredHeaders);

             const final = builtMatrix.map(s => ({
                ...s, concepts: potentialTopics.map((h, i) => ({h, v: s.rawConcepts[i]})).filter(it => activeConceptsMap.has(it.h)).map(it => it.v)
             })).sort((a,b) => a.name.localeCompare(b.name));

             const avgs = filteredHeaders.map((_, idx) => {
                let sum = 0, count = 0;
                final.forEach(st => { if (st.concepts[idx] > 0) { sum += st.concepts[idx]; count++; } });
                return count > 0 ? Math.round(sum / count) : 0;
             });

             setClassAverages(avgs);
             setMasteryData(final);
             setLoading(false);
          };

          onSnapshot(query(collection(db, "enrollments"), where("classId", "==", targetClassId)), (enrollSnap) => {
             const roster = enrollSnap.docs.map(d => {
                const e = d.data();
                return { id: d.id, realId: e.studentId, email: e.studentEmail, name: e.studentName, initials: e.studentName?.substring(0,2).toUpperCase() || "SC", color: "bg-[#1e3a8a]" };
             });

             onSnapshot(query(collection(db, "test_scores"), where("classId", "==", targetClassId)), (snap) => { s1 = snap.docs.map(d => d.data()); processMatrix(roster); });
             onSnapshot(query(collection(db, "gradebook_scores"), where("classId", "==", targetClassId)), (snap) => { s2 = snap.docs.map(d => d.data()); processMatrix(roster); });
             onSnapshot(query(collection(db, "results"), where("classId", "==", targetClassId)), (snap) => { s3 = snap.docs.map(d => d.data()); processMatrix(roster); });
          });
       });
    });

    return () => unsubRegistry();
  }, [teacherData?.id, selectedClassId, classes]);

  if (selectedStudent) {
    return <ConceptMasteryDetail student={selectedStudent} concepts={dynamicHeaders} scores={selectedStudent.concepts} onBack={() => setSelectedStudent(null)} />;
  }

  return (
    <div className="animate-in fade-in duration-700 pb-20 text-left">
      <div className="bg-[#0f172a] rounded-[3.5rem] p-12 mb-12 shadow-2xl relative overflow-hidden group border border-white/5">
         <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 group-hover:rotate-45 transition-all duration-1000">
            <BrainCircuit size={200} className="text-white" />
         </div>
         <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">
            <div className="text-left font-sans">
               <div className="flex items-center gap-4 mb-6">
                  <Award className="w-5 h-5 text-indigo-400" />
                  <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em]">Merit & Trajectory Audit</p>
               </div>
               <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none mb-6">Scholastic Pulse</h1>
               <p className="text-lg font-bold text-slate-400 max-w-2xl leading-relaxed">
                  Judging student proficiency strictly on <span className="text-indigo-300 italic">Database Merit</span>. Every point manifestation across Gradebooks and Tests is archived here.
               </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 w-full lg:w-auto">
               <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Subject Portal</p>
                  <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="h-20 px-10 bg-white/5 border border-white/10 rounded-[2.2rem] text-xs font-black text-white uppercase tracking-widest focus:ring-4 ring-indigo-500/20 transition-all cursor-pointer min-w-[320px]">
                     {classes.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)}
                  </select>
               </div>
            </div>
         </div>
      </div>

      {loading ? (
        <div className="py-48 flex flex-col items-center justify-center bg-white border border-slate-50 rounded-[4rem] shadow-sm mx-4">
           <div className="w-40 h-40 border-4 border-[#1e3a8a]/5 border-t-[#1e3a8a] rounded-full animate-spin flex items-center justify-center mb-12"><BrainCircuit className="w-12 h-12 text-[#1e3a8a] animate-pulse" /></div>
           <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">Scanning Registry Merit...</p>
        </div>
      ) : masteryData.length === 0 ? (
        <div className="py-48 flex flex-col items-center justify-center bg-white border border-dashed border-slate-200 rounded-[4rem] text-center mx-4 group">
           <ShieldAlert size={80} className="mb-10 text-slate-200 group-hover:text-rose-500 transition-colors" />
           <h2 className="text-4xl font-black text-slate-800 mb-6 tracking-tighter uppercase italic">No Active Merit Trails</h2>
           <p className="text-base font-bold text-slate-400 max-w-sm mb-12">Registry Manifestation requires <span className="text-[#1e3a8a]">Gradebook Scores</span> to initialize scholarly judgment.</p>
        </div>
      ) : (
        <div className="mx-4 bg-white border border-slate-100 rounded-[4rem] overflow-hidden shadow-2xl relative text-left">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/100 border-b border-slate-200">
                    <th className="py-14 px-12 text-[11px] font-black text-slate-400 uppercase tracking-widest min-w-[360px] text-left sticky left-0 z-20 bg-slate-50/100 backdrop-blur-md border-r border-slate-100 uppercase italic">Scholar Registry</th>
                    {dynamicHeaders.map((h) => (
                      <th key={h} className="text-center py-14 px-10 text-[12px] font-black text-[#1e3a8a] uppercase tracking-tighter min-w-[220px] border-r border-slate-50 last:border-0 italic">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {masteryData.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td onClick={() => setSelectedStudent(s)} className="py-10 px-12 cursor-pointer sticky left-0 z-10 bg-white group-hover:bg-slate-50/80 transition-all border-r border-slate-200 shadow-[20px_0_40px_-20px_rgba(0,0,0,0.15)]">
                        <div className="flex items-center gap-10">
                          <div className={`w-20 h-20 rounded-[2.5rem] ${s.color} flex items-center justify-center text-white text-2xl font-black shadow-2xl group-hover:rotate-12 transition-all`}>{s.initials}</div>
                          <div className="text-left flex-1 min-w-0">
                            <p className="font-black text-slate-900 text-2xl tracking-tighter uppercase leading-none mb-3 group-hover:text-[#1e3a8a] transition-all truncate">{s.name}</p>
                            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] truncate">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      {s.concepts.map((c:number, i:number) => (
                        <td key={i} className="py-10 px-10 text-center border-r border-slate-50 last:border-0 focus-within:bg-indigo-50/20">
                          <div className={`text-[17px] font-black px-12 py-7 rounded-[2.5rem] inline-flex items-center justify-center min-w-[140px] shadow-sm transition-all group-hover:scale-110 ${cellColor(c)}`}>
                            {c > 0 ? `${c}%` : "—"}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                  
                  {classAverages.length > 0 && (
                    <tr className="bg-[#1e3a8a] border-t-8 border-white/10 shadow-2xl relative z-30">
                      <td className="py-16 px-12 font-black text-white uppercase italic tracking-[0.4em] text-[13px] sticky left-0 z-10 bg-[#1e3a8a] border-r border-white/10 flex items-center gap-4"><BarChart3 className="shrink-0" /> Subdivision Aggregate</td>
                      {classAverages.map((avg, i) => (
                        <td key={`avg-${i}`} className="py-16 px-10 text-center border-r border-white/5 last:border-0 font-black text-indigo-100 text-4xl tracking-tighter italic">
                          {avg > 0 ? `${avg}%` : "—"}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>
      )}
    </div>
  );
};

export default ConceptMastery;
