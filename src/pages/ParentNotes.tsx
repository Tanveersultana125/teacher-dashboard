import { useState } from "react";
import { 
  Sparkles, Loader2, Copy, CheckCheck, MessageSquare, 
  FileText, Smile, AlertTriangle, BrainCircuit, Users,
  Send, RefreshCw, ChevronDown
} from "lucide-react";
import { AIController } from "../ai/controller/ai-controller";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../lib/AuthContext";

// Tone config
const TONES = [
  { id: "Friendly", label: "Friendly & Warm", icon: Smile, color: "bg-emerald-50 border-emerald-200 text-emerald-700", activeColor: "bg-emerald-500 text-white border-emerald-500", desc: "Encouraging, positive, and supportive tone." },
  { id: "Strict", label: "Strict & Firm", icon: AlertTriangle, color: "bg-rose-50 border-rose-200 text-rose-700", activeColor: "bg-rose-500 text-white border-rose-500", desc: "Professional, firm, and consequence-oriented tone." },
  { id: "Neutral", label: "Neutral & Formal", icon: FileText, color: "bg-slate-50 border-slate-200 text-slate-700", activeColor: "bg-slate-700 text-white border-slate-700", desc: "Objective, balanced, and factual tone." },
];

const MSG_TYPES = [
  { id: "PTM Note", label: "PTM Meeting Note", icon: MessageSquare, desc: "Quick note to parents before/after a parent-teacher meeting." },
  { id: "Term Progress Report Auto-Draft", label: "Progress Report Draft", icon: FileText, desc: "Complete term report card remarks with structured format." },
];

const ParentNotes = () => {
  const { teacherData } = useAuth();

  // Generator State
  const [studentName, setStudentName] = useState("");
  const [selectedType, setSelectedType] = useState("PTM Note");
  const [selectedTone, setSelectedTone] = useState("Friendly");
  const [keyPoints, setKeyPoints] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Students for autocomplete
  const [studentSuggestions, setStudentSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleStudentSearch = async (val: string) => {
    setStudentName(val);
    if (val.length < 2) { setShowSuggestions(false); return; }
    try {
      const snap = await getDocs(query(collection(db, "students"), where("teacherId", "==", teacherData?.id)));
      const results = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((s: any) => s.name.toLowerCase().includes(val.toLowerCase()));
      setStudentSuggestions(results);
      setShowSuggestions(true);
    } catch (e) {
      setShowSuggestions(false);
    }
  };

  const handleGenerate = async () => {
    setErrorMsg("");
    if (!studentName.trim()) { setErrorMsg("Please enter a student name."); return; }
    if (!keyPoints.trim()) { setErrorMsg("Please add at least a few bullet points about the student."); return; }
    
    setIsGenerating(true);
    setGeneratedDraft("");
    try {
      const payload = {
        student_name: studentName.trim(),
        type: selectedType,
        tone: selectedTone,
        points: keyPoints.trim(),
      };
      const result = await AIController.getParentNoteGeneration(payload);
      if (result.status === "success" && result.data?.draft) {
        setGeneratedDraft(result.data.draft);
      } else {
        setErrorMsg(result.message || "AI failed to generate a draft. Please try again.");
      }
    } catch (e) {
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDraft);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleReset = () => {
    setGeneratedDraft("");
    setKeyPoints("");
    setStudentName("");
    setErrorMsg("");
  };

  return (
    <div className="animate-in fade-in duration-500 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-foreground">Parent Communication Studio</h1>
          <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest mt-1.5">AI-Powered PTM Notes & Progress Report Drafting Engine</p>
        </div>
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 px-5 py-3.5 rounded-2xl shadow-sm">
          <BrainCircuit className="w-5 h-5 text-indigo-500" />
          <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">Powered by GPT-4.1 Mini</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        
        {/* LEFT — Input Panel */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Step 1: Student Name */}
          <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Step 1</p>
            <h3 className="text-base font-black text-slate-800 mb-5">Select Student</h3>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={studentName}
                onChange={(e) => handleStudentSearch(e.target.value)}
                onFocus={() => studentSuggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Type student name..."
                className="w-full pl-14 pr-4 py-4 border-2 border-slate-100 rounded-2xl text-sm font-bold bg-slate-50 focus:outline-none focus:border-[#1e3a8a] transition-colors"
              />
              {showSuggestions && studentSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 mt-2 overflow-hidden">
                  {studentSuggestions.slice(0, 5).map((s: any) => (
                    <button key={s.id} onMouseDown={() => { setStudentName(s.name); setShowSuggestions(false); }}
                      className="w-full text-left px-5 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0">
                      <div className="w-8 h-8 rounded-xl bg-[#1e3a8a] text-white text-xs font-black flex items-center justify-center">
                        {s.name.substring(0,2).toUpperCase()}
                      </div>
                      {s.name} <span className="text-slate-400 text-xs ml-auto">{s.grade}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Message Type */}
          <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Step 2</p>
            <h3 className="text-base font-black text-slate-800 mb-5">Choose Drafting Mode</h3>
            <div className="space-y-3">
              {MSG_TYPES.map((type) => {
                const Icon = type.icon;
                const isActive = selectedType === type.id;
                return (
                  <button key={type.id} onClick={() => setSelectedType(type.id)}
                    className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all ${ isActive ? "border-[#1e3a8a] bg-[#1e3a8a]/5" : "border-slate-100 bg-slate-50 hover:border-slate-200" }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ isActive ? "bg-[#1e3a8a] text-white" : "bg-white border border-slate-200 text-slate-400" }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`text-xs font-black uppercase tracking-widest ${ isActive ? "text-[#1e3a8a]" : "text-slate-700" }`}>{type.label}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">{type.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FEATURE 24: Tone Adjuster */}
          <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Step 3 · Feature 24</p>
            <h3 className="text-base font-black text-slate-800 mb-2">Tone Adjuster</h3>
            <p className="text-xs font-bold text-slate-400 mb-5">Switch communication tone for the generated draft.</p>
            <div className="space-y-3">
              {TONES.map((tone) => {
                const Icon = tone.icon;
                const isActive = selectedTone === tone.id;
                return (
                  <button key={tone.id} onClick={() => setSelectedTone(tone.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${ isActive ? tone.activeColor : tone.color }`}>
                    <Icon className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">{tone.label}</p>
                      <p className={`text-[10px] font-bold mt-0.5 ${isActive ? "opacity-80" : "opacity-60"}`}>{tone.desc}</p>
                    </div>
                    {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-white"></div>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — Input + Output Panel */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Step 4: Key Points */}
          <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Step 4 · Feature 22 & 23</p>
            <h3 className="text-base font-black text-slate-800 mb-1">Your Raw Teacher Points</h3>
            <p className="text-xs font-bold text-slate-400 mb-5">Write rough bullet points — AI will convert them into a polished professional draft.</p>
            <textarea
              rows={7}
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              placeholder={`e.g.\n- Math score dropped from 78 to 62 this term\n- Attendance is only 74%\n- Very distracted in class\n- Missing 3 assignments`}
              className="w-full p-5 border-2 border-slate-100 rounded-2xl text-sm font-bold bg-slate-50 focus:outline-none focus:border-[#1e3a8a] transition-colors resize-none leading-relaxed placeholder:text-slate-300 placeholder:font-medium"
            />

            {errorMsg && (
              <div className="mt-3 flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl px-5 py-3.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p className="text-xs font-black">{errorMsg}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full mt-5 bg-gradient-to-br from-[#1e3a8a] to-indigo-600 text-white py-5 rounded-2xl text-sm font-black shadow-xl shadow-indigo-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {isGenerating ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> AI is crafting your draft...</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Generate Professional Draft</>
              )}
            </button>
          </div>

          {/* GENERATED DRAFT OUTPUT */}
          {generatedDraft ? (
            <div className="bg-white border-2 border-indigo-100 rounded-[2rem] p-8 shadow-sm animate-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5"/> AI Generated</p>
                  <h3 className="text-base font-black text-slate-800">
                    {selectedType} — <span className="text-indigo-600">{selectedTone} Tone</span>
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleReset} className="p-3 rounded-2xl border-2 border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors" title="Start Over">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={handleCopy} className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all ${ isCopied ? "bg-emerald-500 text-white border-emerald-500" : "border-slate-100 text-slate-600 hover:border-[#1e3a8a] hover:text-[#1e3a8a]" }`}>
                    {isCopied ? <><CheckCheck className="w-4 h-4"/> Copied!</> : <><Copy className="w-4 h-4"/> Copy Draft</>}
                  </button>
                </div>
              </div>

              {/* Draft text area (editable for teacher to tweak) */}
              <div className="relative">
                <div className="absolute top-4 right-4 bg-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">Editable</div>
                <textarea
                  rows={12}
                  value={generatedDraft}
                  onChange={(e) => setGeneratedDraft(e.target.value)}
                  className="w-full p-6 border-2 border-indigo-100 rounded-2xl text-sm font-medium bg-indigo-50/30 focus:outline-none focus:border-indigo-300 transition-colors resize-none leading-relaxed text-slate-800"
                />
              </div>

              {/* Action row */}
              <div className="flex items-center gap-3 mt-5">
                <button className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#1e3a8a] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-md shadow-[#1e3a8a]/20">
                  <Send className="w-4 h-4"/> Send to Parent Portal
                </button>
                <button onClick={handleGenerate} disabled={isGenerating} className="px-6 py-4 border-2 border-slate-100 bg-white text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-[#1e3a8a] hover:text-[#1e3a8a] transition-colors flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 ${ isGenerating ? "animate-spin" : ""}`} /> Regenerate
                </button>
              </div>
            </div>
          ) : (
            // Empty State — no draft yet
            !isGenerating && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center py-20 text-center px-8">
                <div className="w-20 h-20 bg-white border-2 border-slate-200 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm">
                  <MessageSquare className="w-9 h-9 text-slate-300" />
                </div>
                <h3 className="text-lg font-black text-slate-700 uppercase tracking-widest mb-3">No Draft Generated Yet</h3>
                <p className="text-sm font-bold text-slate-400 max-w-xs leading-relaxed">
                  Fill in the student name, select a drafting mode and tone, then add your rough points. AI will instantly craft a professional message!
                </p>
              </div>
            )
          )}

          {isGenerating && !generatedDraft && (
            <div className="bg-indigo-50/50 border-2 border-indigo-100 rounded-[2rem] flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-indigo-100 rounded-3xl flex items-center justify-center mb-5">
                <BrainCircuit className="w-8 h-8 text-indigo-500 animate-pulse" />
              </div>
              <h3 className="text-sm font-black text-indigo-700 uppercase tracking-widest mb-2">Synthesizing Communication Draft</h3>
              <p className="text-xs font-bold text-indigo-400">AI is analyzing your points and crafting the perfect message...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentNotes;
