import React, { useState } from 'react';
import { ChevronLeft, AlertCircle, CheckCircle2, TrendingUp, Cpu, Link, Video, FileText, Loader2, Sparkles } from 'lucide-react';
import { AIController } from '../ai/controller/ai-controller';

interface ConceptMasteryDetailProps {
  student: any;
  concepts: string[];
  scores: number[];
  onBack: () => void;
}

const ConceptMasteryDetail = ({ student, concepts, scores, onBack }: ConceptMasteryDetailProps) => {
  const [selectedRemedial, setSelectedRemedial] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiData, setAiData] = useState<any>(null);

  const mappedConcepts = concepts.map((c, i) => ({
     title: c,
     score: scores[i],
     desc: scores[i] >= 80 ? "Strong understanding observed." : (scores[i] >= 50 ? "Progressing steadily." : "Critical gap identified.")
  }));

  const mastered = mappedConcepts.filter(c => c.score >= 80);
  const developing = mappedConcepts.filter(c => c.score >= 50 && c.score < 80);
  const weak = mappedConcepts.filter(c => c.score < 50);

  const handleRemedialGeneration = async (concept: string) => {
     setSelectedRemedial(concept);
     setIsGenerating(true);
     setAiData(null);
     try {
        const payload = {
           student_name: student.name,
           failed_concept: concept,
           past_scores: mappedConcepts
        };
        const result = await AIController.getConceptRemedial(payload);
        if (result.status === "success" && result.data) {
           setAiData(result.data);
        } else {
           alert(result.message || "Failed to generate remedial AI plan.");
        }
     } catch (e) {
        console.error(e);
     } finally {
        setIsGenerating(false);
     }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 border-2 border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto">
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className={`w-16 h-16 rounded-[2rem] bg-[#1e3a8a] flex items-center justify-center text-white text-xl font-black shadow-sm`}>
            {student.initials}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 leading-tight">{student.name}</h1>
            <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mt-1">
              Class {student.grade || "8A"} • ID: SR-{student.grade}00 • Mastery Analytics
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Mastered Column */}
        <div className="bg-emerald-50/30 border border-emerald-100 rounded-[2rem] p-8 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-sm font-black text-emerald-800 uppercase tracking-widest">Mastered Base</h2>
          </div>
          <div className="space-y-4">
            {mastered.slice(0, 3).map((c, i) => (
              <div key={i} className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
                 <div className="flex justify-between items-center mb-3">
                   <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{c.title}</span>
                   <span className="text-emerald-600 font-black">{c.score}%</span>
                 </div>
                 <div className="h-2 bg-emerald-50 rounded-full overflow-hidden mb-2">
                   <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.score}%` }} />
                 </div>
              </div>
            ))}
            {mastered.length === 0 && <p className="text-xs font-bold text-slate-400 text-center py-6">No mastered concepts yet.</p>}
          </div>
        </div>

        {/* Developing Column */}
        <div className="bg-amber-50/30 border border-amber-100 rounded-[2rem] p-8 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shadow-sm">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-sm font-black text-amber-800 uppercase tracking-widest">Developing Flow</h2>
          </div>
          <div className="space-y-4">
            {developing.slice(0, 3).map((c, i) => (
              <div key={i} className="bg-white border border-amber-100 rounded-2xl p-5 shadow-sm">
                 <div className="flex justify-between items-center mb-3">
                   <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{c.title}</span>
                   <span className="text-amber-500 font-black">{c.score}%</span>
                 </div>
                 <div className="h-2 bg-amber-50 rounded-full overflow-hidden mb-2">
                   <div className="h-full bg-amber-400 rounded-full" style={{ width: `${c.score}%` }} />
                 </div>
              </div>
            ))}
            {developing.length === 0 && <p className="text-xs font-bold text-slate-400 text-center py-6">No developing concepts yet.</p>}
          </div>
        </div>

        {/* Weak Column */}
        <div className="bg-rose-50/30 border border-rose-100 rounded-[2rem] p-8 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shadow-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 animate-pulse" />
            </div>
            <h2 className="text-sm font-black text-rose-800 uppercase tracking-widest">Crucial Weak Areas</h2>
          </div>
          <div className="space-y-4">
            {weak.slice(0, 3).map((c, i) => (
              <div key={i} className="bg-white border border-rose-100 rounded-2xl p-5 shadow-sm group hover:border-rose-300 transition-colors">
                 <div className="flex justify-between items-center mb-3">
                   <span className="text-xs font-black text-slate-800 uppercase tracking-widest">{c.title}</span>
                   <span className="text-rose-600 font-black animate-bounce">{c.score}%</span>
                 </div>
                 <div className="h-2 bg-rose-50 rounded-full overflow-hidden mb-4">
                   <div className="h-full bg-rose-500 rounded-full" style={{ width: `${c.score}%` }} />
                 </div>
                 <button 
                    onClick={() => handleRemedialGeneration(c.title)} disabled={isGenerating}
                    className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 hover:text-rose-700 transition-colors flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                 >
                    {isGenerating && selectedRemedial === c.title ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                    {isGenerating && selectedRemedial === c.title ? 'Synthesizing...' : 'Generate Auto-Remedial'}
                 </button>
              </div>
            ))}
            {weak.length === 0 && <p className="text-xs font-bold text-slate-400 text-center py-6">No critical weak concepts detected. Great job!</p>}
          </div>
        </div>
      </div>

      {/* AI Remedial Plan Section */}
      {aiData && selectedRemedial && (
         <div className="bg-white border border-indigo-100 rounded-[2rem] shadow-lg shadow-indigo-500/10 overflow-hidden animate-in slide-in-from-bottom-8 duration-700">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-8 text-white relative overflow-hidden">
               <Cpu className="absolute -bottom-6 -right-6 w-32 h-32 text-indigo-400 opacity-20" />
               <h3 className="text-xs font-black text-indigo-200 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-300"/> Adaptive Intelligence Response
               </h3>
               <h2 className="text-2xl font-black leading-tight max-w-lg relative z-10">Remedial Blueprint: {selectedRemedial}</h2>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-6">
                  {/* FEATURE 15: AI Learning Gap Detection */}
                  <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-[2rem]">
                     <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4"/> Precise Gap Detection
                     </h4>
                     <p className="text-sm font-bold text-indigo-900 leading-relaxed italic border-l-4 border-indigo-400 pl-4">{aiData.learning_gap}</p>
                  </div>

                  {/* FEATURE 17: Prerequisite Chain Root Cause */}
                  <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem]">
                     <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Link className="w-4 h-4"/> Prerequisite Root Cause
                     </h4>
                     <p className="text-sm font-bold text-rose-900 leading-snug">{aiData.prerequisite_chain}</p>
                  </div>
               </div>

               <div className="space-y-6">
                  {/* FEATURE 16: Remedial Plan Generator */}
                  <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
                     <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4"/> Step-by-Step Remedial Plan
                     </h4>
                     <ol className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-slate-100">
                        {aiData.remedial_plan?.map((step: string, i: number) => (
                           <li key={i} className="flex gap-4 relative">
                              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-black flex items-center justify-center shrink-0 z-10 shadow-sm ring-4 ring-white">{i+1}</span>
                              <p className="text-xs font-bold text-slate-700 leading-relaxed mt-1">{step}</p>
                           </li>
                        ))}
                     </ol>
                  </div>

                  {/* FEATURE 18: Auto Resource Suggestion */}
                  <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
                     <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Video className="w-4 h-4"/> Curated Target Resources
                     </h4>
                     <div className="space-y-3">
                        {aiData.auto_resources?.map((res: any, i: number) => (
                           <a key={i} href="#" onClick={(e)=>e.preventDefault()} className="flex items-center justify-between p-3 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-100 transition-colors group">
                              <div className="flex items-center gap-3">
                                 {res.type?.toLowerCase().includes("video") ? <Video className="w-4 h-4 text-amber-600" /> : <FileText className="w-4 h-4 text-emerald-600" />}
                                 <span className="text-xs font-black text-slate-800 group-hover:text-amber-900 transition-colors uppercase tracking-widest truncate max-w-[200px]">{res.title}</span>
                              </div>
                              <span className="text-[9px] font-black bg-white px-2 py-1 rounded text-slate-400 capitalize">{res.type}</span>
                           </a>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default ConceptMasteryDetail;
