import React, { useState } from 'react';
import { X, Check, BrainCircuit, Sparkles, Loader2, Layers, Key } from 'lucide-react';
import { AIController } from '../ai/controller/ai-controller';

const CreateTest = ({ onCancel, onCreate }: { onCancel: () => void, onCreate: () => void }) => {
  const [formData, setFormData] = useState({
     title: "Quadratic Equ.",
     topicStr: "Algebraic Expressions, Linear Equations",
     duration: "45 mins",
     marks: "50",
     class: "8A"
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [aiData, setAiData] = useState<any>(null);

  const handleAIPaperGeneration = async () => {
     if (!formData.topicStr) return alert("Enter topics!");
     setIsGenerating(true);
     try {
        const payload = {
           topics: formData.topicStr.split(","),
           class_target: formData.class,
           duration: formData.duration,
           total_marks: formData.marks
        };
        const result = await AIController.getTestCreation(payload);
        if (result.status === "success" && result.data) {
           setAiData(result.data);
           setFormData({ ...formData, title: result.data.generated_paper?.title || formData.title });
        } else {
           alert(result.message || "Failed to generate paper.");
        }
     } catch (e) {
        console.error(e);
     } finally {
        setIsGenerating(false);
     }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
             <BrainCircuit className="w-6 h-6 text-[#1e3a8a]"/> Engine Draft: Exam Paper
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Inject Bloom's Taxonomy balanced intelligent questions automatically.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="px-6 py-2.5 rounded-xl border bg-white text-sm font-bold text-foreground">Cancel</button>
          <button onClick={onCreate} className="px-6 py-2.5 rounded-xl bg-[#1e3a8a] text-white text-sm font-bold hover:opacity-90 shadow-sm shadow-[#1e3a8a]/30">Finalize & Print</button>
        </div>
      </div>

      <div className="bg-card border rounded-[2rem] p-8 shadow-sm mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-7">
          <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Topic Mix</label>
                    <input type="text" value={formData.topicStr} onChange={e=>setFormData({...formData, topicStr: e.target.value})} className="w-full px-5 py-3 rounded-xl border font-bold text-sm bg-slate-50 focus:border-[#1e3a8a] outline-none"/>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Grade / Class</label>
                    <input type="text" value={formData.class} onChange={e=>setFormData({...formData, class: e.target.value})} className="w-full px-5 py-3 rounded-xl border font-bold text-sm bg-slate-50 focus:border-[#1e3a8a] outline-none"/>
                 </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Duration Time</label>
                    <input type="text" value={formData.duration} onChange={e=>setFormData({...formData, duration: e.target.value})} className="w-full px-5 py-3 rounded-xl border font-bold text-sm bg-slate-50 focus:border-[#1e3a8a] outline-none"/>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Marks Expected</label>
                    <input type="number" value={formData.marks} onChange={e=>setFormData({...formData, marks: e.target.value})} className="w-full px-5 py-3 rounded-xl border font-bold text-sm bg-slate-50 focus:border-[#1e3a8a] outline-none"/>
                 </div>
             </div>
          </div>
          <div className="flex flex-col justify-center">
             <button disabled={isGenerating} onClick={handleAIPaperGeneration} className="w-full h-24 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2rem] text-white shadow-xl shadow-blue-500/30 flex flex-col items-center justify-center gap-1 hover:scale-[1.02] transition-transform">
                {isGenerating ? <Loader2 className="w-6 h-6 animate-spin"/> : <Sparkles className="w-6 h-6"/>}
                <span className="font-black tracking-wide">{isGenerating ? 'Structuring Intelligence...' : 'Generate Perfect Exam'}</span>
             </button>
             <p className="text-[10px] font-bold text-slate-400 text-center mt-4">AI will utilize Bloom's Taxonomy algorithm to generate perfectly leveled cognitive questions & logic.</p>
          </div>
        </div>
      </div>

      {aiData && (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* FEATURE 11: AI Paper Generator (+ Blooms) */}
            <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden flex flex-col group h-full">
               <div className="bg-slate-50 border-b border-slate-100 p-6">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                     <Layers className="w-5 h-5 text-indigo-500" /> Auto-Generated Test Paper
                  </h3>
               </div>
               <div className="p-6 flex-1 flex flex-col">
                  <div className="mb-6">
                     <h4 className="font-bold text-sm text-slate-700 mb-2">Bloom's Distribution Matrix:</h4>
                     <div className="flex flex-wrap gap-2">
                        {aiData.blooms_taxonomy_distribution && Object.entries(aiData.blooms_taxonomy_distribution).map(([key, val]) => (
                           <span key={key} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-black capitalize border border-indigo-100">{key}: {String(val)}</span>
                        ))}
                     </div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex-1">
                     <h2 className="text-xl font-black text-center mb-6 border-b pb-4">{aiData.generated_paper?.title}</h2>
                     <div className="space-y-4">
                        {aiData.generated_paper?.questions?.map((q: string, i: number) => (
                           <div key={i} className="flex gap-4">
                              <span className="font-black text-slate-400 w-6">Q{i+1}.</span>
                              <p className="font-bold text-sm text-slate-700 leading-snug">{q}</p>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            {/* FEATURE 12: AI Answer Key Generator */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] shadow-sm overflow-hidden flex flex-col h-full">
               <div className="bg-emerald-100 border-b border-emerald-200 p-6 flex justify-between items-center">
                  <h3 className="text-sm font-black text-emerald-900 uppercase tracking-widest flex items-center gap-2">
                     <Key className="w-5 h-5 text-emerald-600" /> Smart Answer Key
                  </h3>
                  <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded uppercase tracking-widest">Confidential</span>
               </div>
               <div className="p-6 flex-1 overflow-y-auto">
                  <div className="space-y-4">
                     {aiData.answer_key?.map((ans: any, i: number) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group">
                           <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-400 group-hover:bg-emerald-500 transition-colors"></div>
                           <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest mb-3 ms-2">Solution for Q{ans.question_number}</h4>
                           <div className="mb-3 ms-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Possible Acceptance:</p>
                              {ans.possible_answers?.map((p_ans: string, j: number) => (
                                 <p key={j} className="text-sm font-bold text-slate-700 leading-snug mb-1">✓ {p_ans}</p>
                              ))}
                           </div>
                           <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 ms-2 mt-3">
                              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Step Grading Scheme:</p>
                              <p className="text-xs font-medium text-amber-900 leading-relaxed italic">{ans.marking_scheme}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default CreateTest;
