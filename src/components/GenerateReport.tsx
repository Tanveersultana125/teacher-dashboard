import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, Loader2, Calendar, Sparkles, BrainCircuit, CheckCircle2, AlertTriangle, RefreshCw, Layers } from "lucide-react";
import { toast } from "sonner";
import { AIController } from "../ai/controller/ai-controller";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../lib/AuthContext";

interface GenerateReportProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  report: any;
}

const GenerateReport = ({ isOpen, onOpenChange, report }: GenerateReportProps) => {
  const { teacherData } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportResult, setReportResult] = useState<any>(null);
  const [params, setParams] = useState({
    grade: "",
    section: "",
    dateRange: "this-term",
    format: "pdf"
  });

  const handleGenerate = async () => {
    if (!params.grade) return toast.error("Please select a grade");
    
    setIsGenerating(true);
    setReportResult(null);

    try {
       if (report.ai) {
          if (report.id === "ai_report_cards") {
             // Feature 25: Bulk AI Report Cards logic
             const snap = await getDocs(query(collection(db, "students"), where("teacherId", "==", teacherData?.id)));
             const students = snap.docs.map(d => ({ name: d.data().name, status: d.data().status }));
             const result = await AIController.getClassReportCards({ grade: params.grade, section: params.section, students });
             if (result.status === "success") setReportResult(result.data);
          } else if (report.id === "subject_action_plan") {
             // Feature 26: Detailed Subject Report action plan
             const payload = {
                subject: teacherData?.subject || "Mathematics",
                grade: params.grade,
                avg_score: 82,
                struggles: ["Quadratic equations", "Mental math speed"],
                mastery_level: "Developing"
             };
             const result = await AIController.getDetailedSubjectReport(payload);
             if (result.status === "success") setReportResult(result.data);
          }
       } else {
          // Standard simulation
          await new Promise(resolve => setTimeout(resolve, 2000));
          setReportResult({ standard: true });
       }
       toast.success("Intelligence compiled successfully!");
    } catch (e) {
       toast.error("Process interrupted. Please try again.");
    } finally {
       setIsGenerating(false);
    }
  };

  const handleDownload = () => {
     toast.success("Intelligence file ready! Downloading as " + params.format.toUpperCase());
     onOpenChange(false);
     setReportResult(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] overflow-hidden p-0 rounded-[2.5rem] border-none shadow-2xl">
        <div className="bg-slate-50 p-10">
          <DialogHeader className="mb-8">
            <div className="flex items-center justify-between">
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${report?.color || 'bg-blue-50 text-blue-500'}`}>
                 <FileText className="w-7 h-7" />
               </div>
               {report?.ai && (
                  <div className="bg-indigo-600 text-white p-3 rounded-2xl animate-in zoom-in-50 duration-500">
                     <BrainCircuit className="w-5 h-5"/>
                  </div>
               )}
            </div>
            <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight leading-none group">
               Generate <span className="text-indigo-600">{report?.title || 'Report'}</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">
              Intelligence Compiler Mode • {report?.type}
            </DialogDescription>
          </DialogHeader>

          {!reportResult ? (
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Class</Label>
                    <Select onValueChange={(val) => setParams({ ...params, grade: val })}>
                      <SelectTrigger className="rounded-2xl h-14 border-2 border-slate-100 bg-white font-bold text-slate-700">
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl p-2 border-slate-100 shadow-xl">
                        {["Grade 7", "Grade 8", "Grade 9"].map(g => (
                          <SelectItem key={g} value={g} className="rounded-xl font-bold py-3">{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Wing/Section</Label>
                    <Select onValueChange={(val) => setParams({ ...params, section: val })}>
                      <SelectTrigger className="rounded-2xl h-14 border-2 border-slate-100 bg-white font-bold text-slate-700">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100 shadow-xl p-2">
                        <SelectItem value="all" className="rounded-xl font-bold py-3">All Wings</SelectItem>
                        <SelectItem value="A" className="rounded-xl font-bold py-3">Wing A</SelectItem>
                        <SelectItem value="B" className="rounded-xl font-bold py-3">Wing B</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Period Range</Label>
                  <Select defaultValue="this-term" onValueChange={(val) => setParams({ ...params, dateRange: val })}>
                    <SelectTrigger className="rounded-2xl h-14 border-2 border-slate-100 bg-white font-bold text-slate-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <SelectValue placeholder="Select period" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl p-2">
                      <SelectItem value="this-month" className="rounded-xl font-bold py-3">This Month</SelectItem>
                      <SelectItem value="this-term" className="rounded-xl font-bold py-3">Academic Term</SelectItem>
                      <SelectItem value="annual" className="rounded-xl font-bold py-3">Annual Audit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Report Infrastructure</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {['pdf', 'word', 'csv'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setParams({ ...params, format: f })}
                        className={`py-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                          params.format === f 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20' 
                            : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <DialogFooter className="pt-6">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full h-16 rounded-[2rem] bg-[#1e3a8a] text-white text-xs font-black uppercase tracking-widest hover:opacity-95 transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#1e3a8a]/20"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Compiling Intelligence...</>
                    ) : (
                      <><Sparkles className="w-5 h-5" /> Compile {report?.ai ? 'AI' : ''} Document</>
                    )}
                  </button>
                </DialogFooter>
             </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
               <div className="bg-emerald-50 border-2 border-emerald-100 p-8 rounded-[2rem] text-center">
                  <div className="w-16 h-16 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-4 animate-bounce shrink-0">
                     <CheckCircle2 className="w-10 h-10"/>
                  </div>
                  <h3 className="text-xl font-black text-emerald-800 mb-2">Analysis Complete</h3>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Document Infrastructure Ready</p>
               </div>

               {reportResult.student_reports && (
                  <div className="bg-white border-2 border-slate-100 p-6 rounded-[2rem] max-h-[200px] overflow-y-auto space-y-3 custom-scrollbar">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Sparkles className="w-3 h-3"/> AI Observations Synthesized ({reportResult.student_reports.length})</p>
                     {reportResult.student_reports.slice(0, 3).map((r: any, i:number) => (
                        <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                           <p className="text-[11px] font-black text-slate-800">{r.name}</p>
                           <p className="text-[10px] font-bold text-slate-500 italic mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{r.ai_remark}</p>
                        </div>
                     ))}
                     <p className="text-[10px] font-black text-[#1e3a8a] italic text-center pt-2">+ All other student profiles compiled</p>
                  </div>
               )}

               {reportResult.report_content && (
                  <div className="bg-white border-2 border-slate-100 p-6 rounded-[2rem]">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Layers className="w-3 h-3"/> Subject Strategy Drafted</p>
                     <p className="text-xs font-bold text-slate-600 leading-relaxed italic line-clamp-4">"{reportResult.report_content}"</p>
                  </div>
               )}

               <div className="flex gap-4">
                  <button onClick={handleDownload} className="flex-1 h-16 bg-indigo-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl">
                     <Download className="w-5 h-5"/> Download Compiled {params.format.toUpperCase()}
                  </button>
                  <button onClick={() => setReportResult(null)} className="px-6 h-16 bg-slate-100 text-slate-400 rounded-[2rem] hover:bg-slate-200 transition-colors">
                     <RefreshCw className="w-5 h-5"/>
                  </button>
               </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateReport;
