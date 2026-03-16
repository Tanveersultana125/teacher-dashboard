import { useState } from "react";
import GenerateReport from "@/components/GenerateReport";
import { FileText, Eye, Star } from "lucide-react";

const reports = [
  { title: "Class Performance Report", desc: "Comprehensive analysis of class performance including grades, attendance, and progress trends.", popular: true, icon: <Star className="w-4 h-4 text-edu-yellow fill-edu-yellow" /> },
  { title: "Individual Progress Report", desc: "Detailed report for individual students covering all academic metrics and recommendations.", popular: true, icon: <Star className="w-4 h-4 text-edu-yellow fill-edu-yellow" /> },
  { title: "Attendance Summary", desc: "Monthly or term-wise attendance report with statistics and absentee analysis.", popular: false, icon: null },
  { title: "At-Risk Students Report", desc: "List of students with academic or attendance concerns requiring intervention.", popular: false, icon: null },
];

const Reports = () => {
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState("");

  const handleOpenGenerate = (title: string) => {
    setSelectedReport(title);
    setIsGenerateOpen(true);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Reports Center</h1>
        <p className="text-sm font-medium text-muted-foreground mt-1 tracking-tight">Generate and download comprehensive academic reports for your classes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((r) => (
          <div key={r.title} className="bg-white border border-border rounded-2xl p-6 shadow-sm hover:border-[#1e3a8a]/30 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-primary/5 rounded-xl text-primary">
                <FileText className="w-6 h-6" />
              </div>
              {r.popular && (
                <span className="bg-edu-yellow/10 text-edu-yellow text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-edu-yellow/20">
                  Popular
                </span>
              )}
            </div>
            
            <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
              {r.title}
              {r.icon}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 font-medium leading-relaxed">{r.desc}</p>
            
            <div className="flex items-center justify-between mt-auto">
              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenGenerate(r.title)}
                  className="bg-[#1e3a8a] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1e4fc0] transition-colors shadow-md flex items-center gap-2"
                >
                  Generate
                </button>
                <button className="border border-border px-6 py-2.5 rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors shadow-sm flex items-center gap-2">
                  <Eye className="w-4 h-4" /> Preview
                </button>
              </div>
              
              <div className="flex gap-1.5">
                {['PDF', 'XLS'].map(ext => (
                  <span key={ext} className="text-[9px] font-black text-slate-400 border border-slate-100 px-2 py-0.5 rounded italic">
                    {ext}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <GenerateReport 
        isOpen={isGenerateOpen} 
        onOpenChange={setIsGenerateOpen} 
        reportType={selectedReport} 
      />
    </div>
  );
};

export default Reports;
