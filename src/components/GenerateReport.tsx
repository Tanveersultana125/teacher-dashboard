import React, { useState } from 'react';
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
import { FileText, Download, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";

interface GenerateReportProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: string;
}

const GenerateReport = ({ isOpen, onOpenChange, reportType }: GenerateReportProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [params, setParams] = useState({
    grade: "",
    section: "",
    dateRange: "This Month",
    format: "pdf"
  });

  const handleGenerate = async () => {
    if (!params.grade) {
      toast.error("Please select a grade");
      return;
    }

    setIsGenerating(true);
    // Simulate generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsGenerating(false);
    toast.success(`${reportType} generated successfully in ${params.format.toUpperCase()} format!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold text-[#1e294b]">Generate {reportType}</DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            Select parameters to generate your customized report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Select Grade</Label>
              <Select onValueChange={(val) => setParams({ ...params, grade: val })}>
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  {["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 10"].map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Section</Label>
              <Select onValueChange={(val) => setParams({ ...params, section: val })}>
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                  <SelectItem value="C">Section C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Time Period</Label>
            <Select defaultValue="this-month" onValueChange={(val) => setParams({ ...params, dateRange: val })}>
              <SelectTrigger className="rounded-xl border-slate-200">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <SelectValue placeholder="Select period" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-term">This Term</SelectItem>
                <SelectItem value="academic-year">Full Academic Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Export Format</Label>
            <div className="grid grid-cols-3 gap-2">
              {['pdf', 'excel', 'csv'].map((f) => (
                <button
                  key={f}
                  onClick={() => setParams({ ...params, format: f })}
                  className={`py-2.5 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${
                    params.format === f 
                      ? 'bg-primary text-white border-primary shadow-md' 
                      : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-6">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full h-12 rounded-xl bg-[#1e3a8a] text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Report
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateReport;
