import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from "../lib/firebase";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { AIController } from "../ai/controller/ai-controller";
import { Upload, X, Check, BrainCircuit, Loader2, Sparkles, Layers, FileDown } from 'lucide-react';

const CreateAssignment = ({ onCancel, onCreate }: { onCancel: () => void, onCreate: () => void }) => {
  const { teacherData } = useAuth();
  
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiData, setAiData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
     title: "",
     description: "",
     gradeClass: teacherData?.classes || "8A"
  });

  const [rubrics, setRubrics] = useState({
    autoGrading: true,
    lateSubmissions: false,
    plagiarismCheck: true
  });

  const handleAIGeneration = async () => {
     if (!topic) return alert("Please enter a topic first!");
     setIsGenerating(true);
     try {
       // Simulate querying real students from db for calibration
       const studentsSnap = await getDocs(query(collection(db, "students"), limit(10)));
       let classStudents = studentsSnap.docs.map(d => d.data());
       classStudents = classStudents.filter(s => 
          formData.gradeClass.toLowerCase().includes(String(s.grade).toLowerCase()) || 
          String(s.class).toLowerCase() === formData.gradeClass.toLowerCase()
       );

       let avgScore = 0;
       classStudents.forEach(s => avgScore += parseFloat(s.averageScore || "75"));
       if (classStudents.length > 0) avgScore = avgScore / classStudents.length;

       const payload = {
          topic: topic,
          target_class: formData.gradeClass,
          students_count: classStudents.length,
          previous_hw_avg: avgScore || 0,
          students_list: classStudents.map(s => s.name).slice(0,10)
       };

       const result = await AIController.getAssignmentCreation(payload);
       if(result.status === "success" && result.data) {
          setAiData(result.data);
          setFormData({
             ...formData,
             title: result.data.generated_assignment?.title || topic,
             description: result.data.generated_assignment?.description || ""
          });
       } else {
          alert(result.message || "Failed to generate AI Assignment");
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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
             <BrainCircuit className="w-6 h-6 text-[#1e3a8a]"/> AI Curriculum Builder
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Auto-generate difficulty-calibrated assignments.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="px-6 py-2.5 rounded-lg border bg-white text-sm font-bold shadow-sm">
            Cancel
          </button>
          <button onClick={onCreate} className="px-6 py-2.5 rounded-lg bg-[#1e3a8a] text-white text-sm font-bold shadow-sm">
            Publish Assignment
          </button>
        </div>
      </div>

      <div className="bg-card border rounded-[2rem] shadow-sm mb-6 overflow-hidden">
         <div className="p-8 bg-indigo-50/50 border-b border-indigo-100 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full">
               <label className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-2 block">Topic to Teach</label>
               <input 
                 value={topic} onChange={e => setTopic(e.target.value)}
                 type="text" placeholder="e.g. Algebraic Expressions, Thermodynamics..."
                 className="w-full px-5 py-4 rounded-2xl border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold placeholder:font-medium"
               />
            </div>
            <button 
               onClick={handleAIGeneration} disabled={isGenerating}
               className="h-14 sm:mt-6 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black shadow-lg shadow-indigo-500/30 flex items-center justify-center min-w-[200px] w-full sm:w-auto"
            >
               {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5 mr-2" /> Generate with AI</>}
            </button>
         </div>

         {aiData && (
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white border-b border-slate-100">
               {/* FEATURE 9: Difficulty Calibration */}
               <div className="bg-orange-50/50 border border-orange-100 rounded-3xl p-6">
                  <h3 className="text-sm font-black text-orange-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                     <Layers className="w-5 h-5" /> Difficulty Calibration
                  </h3>
                  <p className="text-sm font-bold text-orange-900 leading-relaxed bg-white/60 p-4 rounded-xl shadow-sm border border-orange-200/50">
                     {aiData.difficulty_calibration}
                  </p>
               </div>

               {/* FEATURE 10: Personalized Groups */}
               <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6">
                  <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                     <BrainCircuit className="w-5 h-5" /> Personalized Trajectories
                  </h3>
                  <div className="space-y-3">
                     {aiData.personalized_groups?.map((grp:any, i:number) => (
                        <div key={i} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm flex items-start gap-3">
                           <div className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-black">{grp.difficulty_level}</div>
                           <div>
                              <p className="text-xs font-black text-slate-800 mb-0.5">{grp.group_name}</p>
                              <p className="text-[11px] font-bold text-slate-500 leading-tight">{grp.suggested_tasks}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         )}
      </div>

      <div className="bg-card border rounded-[2rem] p-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Assignment Title <span className="text-red-500">*</span></label>
              <input value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} type="text" className="w-full px-5 py-4 rounded-2xl border font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50"/>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Description / Instructions</label>
              <textarea value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} rows={5} className="w-full px-5 py-4 rounded-2xl border font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50 resize-none"></textarea>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Class Target</label>
                  <input value={formData.gradeClass} disabled className="w-full px-5 py-4 rounded-2xl border font-bold bg-slate-100 opacity-80" />
               </div>
               <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Total Points</label>
                  <input type="number" defaultValue="100" className="w-full px-5 py-4 rounded-2xl border font-bold bg-slate-50" />
               </div>
            </div>
            
            {aiData?.generated_assignment?.questions && (
               <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6">
                  <h3 className="text-xs font-black text-[#1e3a8a] uppercase tracking-widest mb-4 flex justify-between items-center">
                     Auto-Generated Questions
                     <button className="flex items-center gap-1 bg-[#1e3a8a] text-white px-3 py-1.5 rounded-lg shadow-sm hover:scale-105 transition-transform">
                        <FileDown className="w-3 h-3"/> PDF Export
                     </button>
                  </h3>
                  <div className="space-y-3">
                     {aiData.generated_assignment.questions.map((q: string, i: number) => (
                        <div key={i} className="flex gap-3 text-sm font-bold text-slate-700 bg-white p-4 rounded-xl border border-blue-50 shadow-sm">
                           <span className="text-blue-500">{i+1}.</span>
                           <p className="leading-snug">{q}</p>
                        </div>
                     ))}
                  </div>
               </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Smart Grading & Rubrics</label>
              <div className="space-y-3 bg-slate-50 p-3 rounded-[2rem] border border-slate-100">
                {[
                  { id: 'autoGrading', label: 'Enable AI Auto-Grading Framework' },
                  { id: 'plagiarismCheck', label: 'Active Plagiarism Fingerprinting' },
                  { id: 'lateSubmissions', label: 'Allow Late Submissions (-10%)' }
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setRubrics(prev => ({ ...prev, [option.id]: !prev[option.id as keyof typeof rubrics] }))}
                    className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl border transition-all text-sm font-bold shadow-sm ${
                      rubrics[option.id as keyof typeof rubrics] 
                        ? 'border-indigo-500 bg-indigo-500 text-white' 
                        : 'border-white hover:border-slate-200 text-slate-500 bg-white'
                    }`}
                  >
                    {option.label}
                    {rubrics[option.id as keyof typeof rubrics] && <Check className="w-5 h-5" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Manual Attachment Upload</label>
              <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition-colors cursor-pointer group">
                <Upload className="w-10 h-10 text-slate-300 group-hover:text-[#1e3a8a] transition-colors mb-4" />
                <p className="text-sm font-black text-slate-700">Drag and drop resource files here</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Or click to browse standard files</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAssignment;
