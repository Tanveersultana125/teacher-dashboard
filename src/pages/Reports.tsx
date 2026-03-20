import { useState } from "react";
import GenerateReport from "@/components/GenerateReport";
import { FileText, Eye, Star, Sparkles, TrendingUp, Download, PieChart, Layout, BrainCircuit, BookOpen } from "lucide-react";
import { useAuth } from "../lib/AuthContext";

const reports = [
  { 
    id: "class_perf", 
    title: "Class Performance Summary", 
    desc: "Detailed aggregate analysis of grades, attendance and engagement trends.", 
    popular: true, 
    type: "Standard",
    color: "bg-blue-50 border-blue-100 text-blue-600"
  },
  { 
    id: "ai_report_cards", 
    title: "AI Bulk Report Cards", 
    desc: "Feature 25: One-click generation of personalized AI remarks for the entire class.", 
    popular: true, 
    type: "AI Powered",
    color: "bg-purple-50 border-purple-100 text-purple-600",
    ai: true
  },
  { 
    id: "subject_action_plan", 
    title: "Subject Action Plan (PDF/Word)", 
    desc: "Feature 26: Generate a comprehensive year-end subject analysis with next-year goals.", 
    popular: false, 
    type: "Deep Analytics",
    color: "bg-emerald-50 border-emerald-100 text-emerald-600",
    ai: true
  },
  { 
    id: "at_risk", 
    title: "At-Risk Student Intervention", 
    desc: "Automatic flagging of students requiring academic or behavioral intervention.", 
    popular: false, 
    type: "Standard",
    color: "bg-rose-50 border-rose-100 text-rose-600"
  },
];

const Reports = () => {
  const { teacherData } = useAuth();
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const handleOpenGenerate = (report: any) => {
    setSelectedReport(report);
    setIsGenerateOpen(true);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Reports Center</h1>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mt-1">Compile comprehensive evidence of learning & progress</p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-sm">
           <Layout className="w-5 h-5 text-[#1e3a8a]"/>
           <span className="text-xs font-black uppercase tracking-widest text-slate-600">{teacherData?.schoolName || 'Main Branch'}</span>
        </div>
      </div>

      {/* Stats Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
         <div className="bg-white border-2 border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500"><Download className="w-6 h-6"/></div>
            <div>
               <p className="text-2xl font-black text-slate-800">128</p>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Downloads</p>
            </div>
         </div>
         <div className="bg-white border-2 border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500"><PieChart className="w-6 h-6"/></div>
            <div>
               <p className="text-2xl font-black text-slate-800">92%</p>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completion Rate</p>
            </div>
         </div>
         <div className="bg-white border-2 border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500"><Sparkles className="w-6 h-6"/></div>
            <div>
               <p className="text-2xl font-black text-slate-800">AI Active</p>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {reports.map((r) => (
          <div key={r.id} className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:border-[#1e3a8a]/20 transition-all group relative overflow-hidden flex flex-col h-full">
            {r.ai && (
               <div className="absolute top-0 right-0 p-6">
                  <div className="bg-[#1e3a8a]/5 text-[#1e3a8a] p-2 rounded-xl animate-pulse">
                     <BrainCircuit className="w-5 h-5"/>
                  </div>
               </div>
            )}
            
            <div className="flex items-center gap-4 mb-6">
               <div className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${r.color}`}>
                  {r.type}
               </div>
               {r.popular && (
                  <div className="bg-amber-100 text-amber-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                     <Star className="w-3 h-3 fill-amber-600"/>
                     <span className="text-[9px] font-black uppercase tracking-widest">Teacher's Choice</span>
                  </div>
               )}
            </div>

            <h2 className="text-2xl font-black text-slate-800 mb-3 group-hover:text-[#1e3a8a] transition-colors">{r.title}</h2>
            <p className="text-sm font-bold text-slate-500 leading-relaxed mb-8 flex-grow">{r.desc}</p>
            
            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
               <div className="flex gap-4">
                  <button 
                    onClick={() => handleOpenGenerate(r)}
                    className="bg-[#1e3a8a] text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#1e4fc0] transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                  >
                    Generate Now
                  </button>
                  <button className="text-slate-400 p-3.5 rounded-2xl border-2 border-slate-50 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                    <Eye className="w-5 h-5" />
                  </button>
               </div>
               <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400">PDF</div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400">CSV</div>
               </div>
            </div>
          </div>
        ))}
      </div>

      <GenerateReport 
        isOpen={isGenerateOpen} 
        onOpenChange={setIsGenerateOpen} 
        report={selectedReport} 
      />
    </div>
  );
};

export default Reports;
