import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Check, FileSpreadsheet, BrainCircuit, Loader2, Sparkles, TrendingDown } from 'lucide-react';
import { AIController } from '../ai/controller/ai-controller';

interface EnterScoresProps {
  testName: string;
  onBack: () => void;
}

const studentsData = [
  { id: 1, name: "Aditya Rao", roll: "801", initials: "AR", color: "bg-blue-500", score: "42", grade: "A", percentage: "84%" },
  { id: 2, name: "Bhavya Singh", roll: "802", initials: "BS", color: "bg-green-500", score: "38", grade: "B", percentage: "76%" },
  { id: 3, name: "Divya Verma", roll: "803", initials: "DV", color: "bg-orange-500", score: "28", grade: "C", percentage: "56%" },
  { id: 4, name: "Karthik Menon", roll: "804", initials: "KM", color: "bg-red-500", score: "18", grade: "D", percentage: "36%" }
];

const EnterScores = ({ testName, onBack }: EnterScoresProps) => {
  const [students, setStudents] = useState(studentsData);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiData, setAiData] = useState<any>(null);

  const handleExcelUpload = () => {
     alert("Excel/CSV simulated upload successful! Scores populated.");
  };

  const handleResultAnalysis = async () => {
     if (students.length === 0) return alert("No scores available to analyze.");
     setIsAnalyzing(true);
     try {
        const payload = {
           test_name: testName,
           total_marks: 50,
           scores: students.map(s => ({ name: s.name, score: s.score }))
        };
        const result = await AIController.getResultAnalysis(payload);
        if(result.status === "success" && result.data) {
           setAiData(result.data);
        } else {
           alert(result.message || "Failed to analyze results.");
        }
     } catch (e) {
        console.error(e);
     } finally {
        setIsAnalyzing(false);
     }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-start justify-between mb-8 gap-4">
        <div>
          <button onClick={onBack} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#1e3a8a] flex items-center gap-1 mb-3 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Tests Vault
          </button>
          <h1 className="text-3xl font-black text-foreground max-w-2xl leading-tight">{testName}</h1>
          <p className="text-muted-foreground text-sm font-bold mt-1 uppercase tracking-widest">
             Class 8A • 50 marks • Result Analysis Mode
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={handleResultAnalysis} disabled={isAnalyzing} className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white px-8 py-3.5 rounded-2xl text-sm font-black hover:opacity-90 shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2">
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin"/> : <Sparkles className="w-5 h-5"/>} Deep Analytics AI
          </button>
          <button onClick={onBack} className="bg-emerald-500 text-white px-8 py-3.5 rounded-2xl text-sm font-black hover:opacity-90 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2">
            <Check className="w-5 h-5" /> Save Roster
          </button>
        </div>
      </div>

      {aiData && (
         <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-700">
            {/* FEATURE 13: Upload Result Analysis (Class Insights) */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-[2rem] p-8 shadow-sm">
               <h3 className="text-sm font-black text-[#1e3a8a] uppercase tracking-widest flex items-center gap-2 mb-4">
                  <BrainCircuit className="w-5 h-5"/> Class Intelligence Insights
               </h3>
               <p className="text-sm font-bold text-slate-700 leading-relaxed bg-white/70 p-6 rounded-2xl shadow-sm border border-indigo-50 italic">
                  "{aiData.class_insights}"
               </p>
            </div>

            {/* FEATURE 14: Question Item Analysis */}
            <div className="bg-rose-50/50 border border-rose-100 rounded-[2rem] p-8 shadow-sm">
               <h3 className="text-sm font-black text-rose-800 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <TrendingDown className="w-5 h-5"/> Failure Pattern Tracking (Item Analysis)
               </h3>
               <div className="space-y-4">
                  {aiData.question_item_analysis?.map((item: any, i:number) => (
                     <div key={i} className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-400"></div>
                        <div className="flex justify-between items-center mb-2 ms-2">
                           <h4 className="font-black text-rose-900">{item.question_topic}</h4>
                           <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2.5 py-1 rounded uppercase">{item.failure_rate} Error Rate</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 leading-snug ms-2">{item.reason}</p>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      )}

      <div className="content-card border rounded-[2rem] bg-card p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Excel Scoring Roster</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search student..." className="pl-11 pr-4 py-3 border-2 border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-0 focus:border-[#1e3a8a] bg-slate-50 font-bold transition-colors w-64"/>
            </div>
            <button onClick={handleExcelUpload} className="flex items-center gap-2 px-6 py-3 border-2 border-green-200 bg-green-50 text-green-700 rounded-2xl text-[11px] font-black shadow-sm uppercase tracking-widest hover:bg-green-100 transition-colors">
              <FileSpreadsheet className="w-4 h-4" /> Upload Excel CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {students.map((student) => (
            <div key={student.id} className="border-2 border-slate-100 rounded-[2rem] p-6 hover:border-[#1e3a8a]/30 transition-all bg-white shadow-sm relative overflow-hidden group">
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-12 h-12 rounded-full ${student.color} flex items-center justify-center text-white font-black shadow-sm group-hover:scale-110 transition-transform`}>
                  {student.initials}
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm font-black text-slate-800 leading-none mb-1">{student.name}</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">ID: SR-{student.roll}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-4">
                <input 
                  type="text" 
                  defaultValue={student.score}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 focus:outline-none focus:border-[#1e3a8a] transition-all bg-slate-50 font-black text-xl text-[#1e3a8a] text-center"
                />
                <span className="text-[11px] font-black text-slate-300 uppercase whitespace-nowrap tracking-widest">/ 50 PTS</span>
              </div>

              <div className="flex items-center justify-between mt-6 pt-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shadow-sm ${
                  student.grade === 'A' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 
                  student.grade === 'B' ? 'bg-blue-100 text-blue-600 border border-blue-200' :
                  student.grade === 'C' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 
                  'bg-rose-100 text-rose-600 border border-rose-200'
                }`}>
                  {student.grade}
                </div>
                <span className={`text-sm font-black ${
                   student.grade === 'A' ? 'text-emerald-500' : 
                   student.grade === 'B' ? 'text-blue-500' :
                   student.grade === 'C' ? 'text-amber-500' : 
                   'text-rose-500'
                }`}>{student.percentage} SCORE</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnterScores;
