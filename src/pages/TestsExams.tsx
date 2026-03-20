import { useState, useEffect } from "react";
import StatCard from "@/components/StatCard";
import CreateTest from "@/components/CreateTest";
import EnterScores from "@/components/EnterScores";
import { db } from "../lib/firebase";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { Loader2, FilePlus, Sparkles } from "lucide-react";

const classPerf = [
  { cls: "Class 8-A", pct: 78.5, color: "bg-edu-green" },
  { cls: "Class 9-B", pct: 72.3, color: "bg-edu-yellow" },
  { cls: "Class 7-C", pct: 81.2, color: "bg-edu-green" },
];

const topicPerf = [
  { topic: "Algebra", pct: "82%" },
  { topic: "Geometry", pct: "71%" },
  { topic: "Statistics", pct: "79%" },
];

const TestsExams = () => {
  const [view, setView] = useState<'list' | 'create' | 'enter-scores'>('list');
  const [selectedTest, setSelectedTest] = useState<string>("");
  
  const [testsData, setTestsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      try {
         const snap = await getDocs(query(collection(db, "tests"), limit(10)));
         const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
         setTestsData(fetched);
      } catch (e) {
         console.warn("Tests empty or not found");
      } finally {
         setLoading(false);
      }
    };
    fetchTests();
  }, [view]);

  const handleEnterScores = (testName: string) => {
    setSelectedTest(testName);
    setView('enter-scores');
  };

  if (view === 'create') return <CreateTest onCancel={() => setView('list')} onCreate={() => setView('list')} />;
  if (view === 'enter-scores') return <EnterScores testName={selectedTest} onBack={() => setView('list')} />;

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground">Tests & Exams</h1>
          <p className="text-muted-foreground font-medium mt-1">Manage tests, generate smart papers, and run score analytics.</p>
        </div>
        <button 
          onClick={() => setView('create')}
          className="bg-[#1e3a8a] text-white px-6 py-3.5 rounded-2xl text-sm font-black shadow-md shadow-blue-900/20 hover:bg-[#1e4fc0] transition-colors flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4"/> Build Smart Exam
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        <StatCard value={String(testsData.length)} label="Active Tests" iconColor="blue" />
        <StatCard value="0" label="Completed" iconColor="green" />
        <StatCard value={String(testsData.length)} label="Pending Analysis" iconColor="red" />
        <StatCard value="74.5%" label="Class Expected Avg" iconColor="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Tests Area */}
        <div className="lg:col-span-2 flex flex-col gap-6">
           <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest pl-2">Exam Schedule Directory</h2>
           
           {loading ? (
             <div className="flex-1 flex flex-col items-center justify-center p-16 bg-card border border-dashed border-border rounded-[2rem]">
               <Loader2 className="w-8 h-8 text-[#1e3a8a] animate-spin mb-4" />
             </div>
           ) : testsData.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center py-24 bg-white border border-dashed border-slate-200 rounded-[2rem] shadow-sm">
               <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6">
                  <FilePlus className="w-10 h-10 text-blue-300" />
               </div>
               <h3 className="text-xl font-black text-slate-800 mb-2">Examination Vault is Empty</h3>
               <p className="text-sm font-bold text-slate-400 max-w-sm text-center uppercase tracking-tight leading-relaxed mb-6">
                 No upcoming assessments found. Use the AI Paper Generator to instantly create a balanced test with its Answer Key!
               </p>
               <button onClick={() => setView('create')} className="px-6 py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all text-sm uppercase tracking-widest">
                 Draft First Exam
               </button>
             </div>
           ) : (
             <div className="space-y-4">
               {testsData.map((test, i) => (
                 <div key={i} className="bg-white border rounded-[2rem] p-6 shadow-sm hover:border-blue-200 transition-colors">
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <h3 className="text-lg font-black text-foreground mb-1">{test.title || "Untitled Assessment"}</h3>
                       <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{test.class || "Class 8A"} • {test.duration || "60 mins"} • {test.marks || "50"} Marks</p>
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600">Pending</span>
                   </div>
                   <div className="flex gap-3">
                     <button onClick={() => handleEnterScores(test.title)} className="bg-emerald-500 text-white text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors shadow-sm">
                       Upload Scores & Analytics
                     </button>
                     <button className="bg-slate-50 text-slate-600 text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                       View Keys
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* Global Performance Overview widget */}
        <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm h-fit">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Performance Benchmarks</h2>
          <p className="text-[10px] font-bold text-slate-400 mb-6 uppercase tracking-wider">Historical System Trends</p>
          
          <div className="space-y-6">
            {classPerf.map((c, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-600 font-bold uppercase tracking-widest">{c.cls}</span>
                  <span className={`font-black ${c.pct >= 75 ? "text-edu-green" : c.pct >= 65 ? "text-edu-yellow" : "text-edu-red"}`}>{c.pct}%</span>
                </div>
                <div className="w-full bg-slate-50 border border-slate-100 rounded-full h-3 p-0.5">
                  <div className={`h-full rounded-full ${c.color} shadow-sm`} style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Topic Mastery Matrix</h3>
            <div className="space-y-3">
              {topicPerf.map((t, i) => (
                <div key={i} className="flex justify-between items-center text-xs bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <span className="text-slate-600 font-bold">{t.topic}</span>
                  <span className="font-black text-primary bg-blue-100 px-2 py-1 rounded-md">{t.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestsExams;
