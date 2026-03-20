import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Download, Check, Sparkles, BrainCircuit, ShieldAlert, Loader2 } from 'lucide-react';
import { AIController } from '../ai/controller/ai-controller';

interface GradeAssignmentProps {
  assignment: any;
  onBack: () => void;
}

const GradeAssignment = ({ assignment, onBack }: GradeAssignmentProps) => {
  const [submissions, setSubmissions] = useState([
    { id: 1, name: "Aditya Rao", status: "Submitted", attachment: "worksheet.pdf", grade: "", feedback: "", isPlagiarized: false },
    { id: 2, name: "Bhavya Singh", status: "Submitted", attachment: "answers.pdf", grade: "", feedback: "", isPlagiarized: false },
    { id: 3, name: "Rahul Kumar", status: "Submitted", attachment: "copy_pasted.pdf", grade: "", feedback: "", isPlagiarized: false }
  ]);
  
  const [isGrading, setIsGrading] = useState(false);
  const [aiData, setAiData] = useState<any>(null);

  const handleAIGrading = async () => {
     if (submissions.length === 0) return alert("No submissions to grade!");
     setIsGrading(true);
     try {
       const payload = {
          assignment_title: assignment.title,
          submitting_students: submissions.map(s => ({ name: s.name, file: s.attachment }))
       };
       const result = await AIController.getAssignmentGrading(payload);
       if (result.status === "success" && result.data) {
          setAiData(result.data);
          
          // Apply results to local state
          const updatedSubs = submissions.map(sub => {
             const aiGrade = result.data.auto_graded_results?.find((x:any) => x.student_name === sub.name);
             const aiPlag = result.data.plagiarism_alerts?.find((x:any) => x.student_name === sub.name);
             return {
                ...sub,
                grade: aiGrade ? aiGrade.score : sub.grade,
                feedback: aiGrade ? aiGrade.feedback : sub.feedback,
                isPlagiarized: !!aiPlag,
                plagSource: aiPlag?.suspected_source
             };
          });
          setSubmissions(updatedSubs);
       } else {
          alert(result.message || "Failed to auto-grade.");
       }
     } catch (e) {
       console.error("Auto grading failed: ", e);
     } finally {
       setIsGrading(false);
     }
  };

  const gradedCount = submissions.filter(s => s.grade !== "").length;
  const totalSubmissions = submissions.length;

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-start justify-between mb-8 gap-4">
        <div>
          <button onClick={onBack} className="text-sm font-bold text-slate-400 hover:text-[#1e3a8a] flex items-center gap-1 mb-3 transition-colors uppercase tracking-widest">
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <h1 className="text-3xl font-black text-foreground">{assignment?.title || "Pending Grading"}</h1>
          <p className="text-muted-foreground text-sm font-bold mt-1 uppercase tracking-widest">
            Class {assignment?.class || "8A"} • {totalSubmissions} submissions
          </p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="bg-white border rounded-2xl px-5 py-3 shadow-sm">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Grading Progress</span>
            <div className="flex items-center gap-4">
               <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                 <div className="h-full bg-[#1e3a8a] transition-all duration-1000 rounded-full" style={{ width: `${totalSubmissions ? (gradedCount / totalSubmissions) * 100 : 0}%` }}></div>
               </div>
               <span className="text-sm font-black text-[#1e3a8a]">{gradedCount}/{totalSubmissions}</span>
            </div>
          </div>
          <button onClick={onBack} className="bg-emerald-500 text-white px-8 py-4 rounded-2xl text-sm font-black hover:opacity-90 shadow-sm flex items-center gap-2">
            <Check className="w-5 h-5" /> Save Roster
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
             onClick={handleAIGrading} disabled={isGrading || totalSubmissions === 0}
             className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3.5 rounded-2xl text-sm font-black shadow-lg shadow-indigo-500/30 flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
          >
             {isGrading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><BrainCircuit className="w-5 h-5" /> Auto-Grade with AI</>}
          </button>
        </div>
        <button className="flex items-center gap-2 px-6 py-3.5 border border-slate-200 bg-white rounded-2xl text-sm font-black text-slate-600 shadow-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {aiData?.plagiarism_alerts?.length > 0 && (
         <div className="mb-6 bg-red-50 border border-red-200 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
               <ShieldAlert className="w-8 h-8 text-red-600 animate-bounce" />
            </div>
            <div>
               <h3 className="text-red-800 text-lg font-black uppercase tracking-widest mb-1">AI Plagiarism Alert System triggered</h3>
               <p className="text-sm font-bold text-red-600 leading-relaxed">
                 Multiple submissions share suspiciously identical fingerprint logic. The system has automatically isolated and flagged the affected records below with source tracking.
               </p>
            </div>
         </div>
      )}

      {totalSubmissions === 0 ? (
         <div className="content-card border rounded-[2rem] bg-white text-center py-24 shadow-sm border-dashed">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-black text-slate-800 mb-1">No Submissions Pending</h3>
            <p className="text-sm font-medium text-slate-500">Auto-grading will activate once students upload their answers.</p>
         </div>
      ) : (
      <div className="content-card border rounded-[2rem] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="py-5 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Student Asset</th>
                <th className="py-5 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Submission</th>
                <th className="py-5 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Auto-Grade</th>
                <th className="py-5 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">AI Feedback Matrix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map((s, i) => (
                <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${s.isPlagiarized ? 'bg-red-50/30' : ''}`}>
                  <td className="py-6 px-6">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white text-xs font-black shadow-md">{s.name.substring(0,2).toUpperCase()}</div>
                       <div className="flex flex-col">
                         <span className="font-black text-slate-800">{s.name}</span>
                         <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">ID: SR-{s.id}00</span>
                         {s.isPlagiarized && <span className="text-[9px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase mt-1 w-fit border border-red-200">Plagiarized</span>}
                       </div>
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <button className="flex items-center gap-2 text-[#1e3a8a] hover:underline text-sm font-black bg-blue-50 px-4 py-2 rounded-xl transition-all w-max border border-blue-100">
                      <FileText className="w-4 h-4" /> {s.attachment}
                    </button>
                  </td>
                  <td className="py-6 px-6 relative">
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" value={s.grade} onChange={(e) => {
                           const newSubs = [...submissions]; newSubs[i].grade = e.target.value; setSubmissions(newSubs);
                        }}
                        className={`w-16 px-2 py-3 border-2 rounded-xl text-lg font-black text-center focus:ring-2 focus:ring-primary/20 outline-none ${
                           s.isPlagiarized ? 'border-red-300 text-red-600 bg-red-50 focus:border-red-500' : 'border-slate-200 text-[#1e3a8a] focus:border-[#1e3a8a]'
                        }`}
                      />
                      <span className="text-sm font-black text-slate-300 uppercase">/100 PTS</span>
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <textarea 
                      value={s.feedback} onChange={(e) => {
                         const newSubs = [...submissions]; newSubs[i].feedback = e.target.value; setSubmissions(newSubs);
                      }}
                      rows={2}
                      placeholder="Waiting for AI Analysis..." 
                      className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-bold resize-none focus:ring-2 outline-none ${
                        s.isPlagiarized ? 'border-red-300 bg-red-50/50 text-red-900 focus:border-red-500 focus:ring-red-200' : 'border-slate-200 bg-slate-50 focus:border-[#1e3a8a] focus:ring-blue-100 text-slate-700'
                      }`}
                    />
                    {s.isPlagiarized && <p className="text-[10px] uppercase font-black tracking-widest text-red-500 mt-2 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> AI TRACED TO: {s.plagSource}</p>}
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

export default GradeAssignment;
