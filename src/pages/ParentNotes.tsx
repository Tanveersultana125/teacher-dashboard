import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Loader2, MessageSquare, Search, CheckCircle2, MoreVertical, X, Sparkles, Send, User, Trash2, Paperclip, Smile, Bot, ChevronLeft, Clock, Phone, Video, Check, CheckCheck 
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, writeBatch } from "firebase/firestore";
import { useAuth } from "../lib/AuthContext";
import { toast } from "sonner";
import { AIController } from "../ai/controller/ai-controller";

const STATS_CONFIG = [
  { label: "Messages", key: "total", icon: MessageSquare, color: "bg-blue-50 text-blue-500" },
  { label: "Pending", key: "pending", icon: Clock, color: "bg-amber-50 text-amber-500" },
  { label: "Resolved", key: "resolved", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-500" },
];

const TEMPLATES = [
  { id: "grade", label: "Grade Concern" },
  { id: "good", label: "Good Progress" },
  { id: "attendance", label: "Attendance Issue" },
  { id: "meeting", label: "PTM Request" },
];

const ParentNotes = () => {
  const { teacherData } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [allNotes, setAllNotes] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!teacherData?.id) return;
    
    // 1. Fetch Roster with Unified IDs
    const q1 = query(collection(db, "enrollments"), where("teacherId", "==", teacherData.id));
    const unsub1 = onSnapshot(q1, (snap) => {
       const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       // Deduplicate by sId or email
       const map = new Map();
       docs.forEach((d:any) => {
          const key = (d.studentId || d.studentEmail || d.id).toLowerCase();
          if(!map.has(key)) map.set(key, d);
       });
       setRoster(Array.from(map.values()));
    });

    // 2. High-Fidelity Universal Discourse Listener
    const q2 = query(collection(db, "parent_notes"), where("teacherId", "==", teacherData.id));
    const unsub2 = onSnapshot(q2, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a:any, b:any) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
      setAllNotes(data);
      setLoading(false);
    });

    return () => { unsub1(); unsub2(); };
  }, [teacherData?.id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [allNotes, selectedStudent]);

  const lastMessages = useMemo(() => {
    const map = new Map();
    [...allNotes].reverse().forEach(n => { 
       const key = (n.studentId || n.studentEmail)?.toLowerCase();
       if (key && !map.has(key)) map.set(key, n); 
    });
    return map;
  }, [allNotes]);

  const studentMessages = useMemo(() => {
    if(!selectedStudent) return [];
    const sId = selectedStudent.studentId?.toLowerCase();
    const sEmail = selectedStudent.studentEmail?.toLowerCase();
    return allNotes.filter(n => 
       (sId && n.studentId?.toLowerCase() === sId) || 
       (sEmail && n.studentEmail?.toLowerCase() === sEmail)
    );
  }, [allNotes, selectedStudent]);

  const filteredRoster = useMemo(() => {
    return roster.filter(s => s.studentName?.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a,b) => {
         const keyA = (a.studentId || a.studentEmail)?.toLowerCase();
         const keyB = (b.studentId || b.studentEmail)?.toLowerCase();
         return (lastMessages.get(keyB)?.createdAt?.toMillis?.() || 0) - (lastMessages.get(keyA)?.createdAt?.toMillis?.() || 0);
      });
  }, [roster, searchQuery, lastMessages]);

  const handleSendMessage = async () => {
    if (!selectedStudent || !messageContent.trim()) return;
    const content = messageContent.trim();
    setMessageContent("");
    try {
      await addDoc(collection(db, "parent_notes"), {
        teacherId: teacherData.id, 
        teacherName: teacherData.name || "Teacher",
        studentId: selectedStudent.studentId || "", 
        studentEmail: selectedStudent.studentEmail?.toLowerCase() || "",
        studentName: selectedStudent.studentName,
        parentName: `Parent of ${selectedStudent.studentName}`, 
        subject: "Institutional Discourse",
        content, status: "Sent", from: "teacher", createdAt: serverTimestamp()
      });
    } catch (e) { toast.error("Sync failure."); setMessageContent(content); }
  };

  const handleClearChat = async () => {
    if (!selectedStudent || !confirm(`Bhai, clear chat for ${selectedStudent.studentName}?`)) return;
    setLoading(true);
    try {
      const sId = selectedStudent.studentId;
      const q = query(collection(db, "parent_notes"), where("teacherId","==",teacherData.id), where("studentId","==",sId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      toast.success("Chat cleared!");
    } catch (e) { toast.error("Error."); } finally { setLoading(false); }
  };

  const generateAI = async () => {
    if (!selectedStudent) return;
    setIsGenerating(true);
    try {
      const result = await AIController.getParentNoteGeneration({ student_name: selectedStudent.studentName, type: "Update", tone: "Professional", points: messageContent || "General Performance" });
      if (result.status === "success" && result.data?.draft) setMessageContent(result.data.draft);
    } catch (e) { toast.error("AI Busy."); } finally { setIsGenerating(false); }
  };

  const stats = useMemo(() => {
    const total = allNotes.length;
    const studentThreads = new Map();
    allNotes.forEach(n => {
      studentThreads.set(n.studentId || n.studentEmail, n.from);
    });
    let pending = 0;
    let resolved = 0;
    studentThreads.forEach((lastFrom) => {
      if (lastFrom === 'parent') pending++;
      else resolved++;
    });
    return { total, pending, resolved };
  }, [allNotes]);

  return (
    <div className="h-full flex flex-col font-sans text-left">
      <div className="bg-[#0f172a] rounded-[3rem] p-12 mb-8 shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 group-hover:rotate-12 transition-all duration-1000"><MessageSquare size={200} className="text-white"/></div>
         <div className="relative z-10">
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none mb-4">Liaison Hub</h1>
            <p className="text-lg font-bold text-slate-400 max-w-xl">Unified, encrypted communication link between <span className="text-indigo-400">Scholars</span> and their <span className="text-emerald-400">Guardians</span>.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         {STATS_CONFIG.map(s => (
            <div key={s.key} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-xl transition-all">
               <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{s.label}</p><h4 className="text-4xl font-black text-slate-900">{stats[s.key as keyof typeof stats]}</h4></div>
               <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${s.color}`}><s.icon className="w-8 h-8" /></div>
            </div>
         ))}
      </div>

      <div className="flex-1 flex bg-white border border-slate-200 rounded-[3.5rem] shadow-2xl overflow-hidden min-h-[600px] mb-8 relative">
        <div className={`w-full md:w-[420px] border-r border-slate-100 flex flex-col bg-slate-50/30 ${selectedStudent ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-8">
             <div className="relative group">
                <input type="text" placeholder="Search roster..." value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="w-full pl-14 pr-6 h-16 bg-white border border-slate-100 rounded-[1.5rem] text-sm font-black focus:ring-4 focus:ring-indigo-500/10 transition-all uppercase tracking-widest placeholder:text-slate-200" />
                <Search className="w-6 h-6 text-slate-300 absolute left-5 top-1/2 -translate-y-1/2" />
             </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-6">
             {loading ? <div className="p-20 text-center animate-pulse"><Loader2 className="w-10 h-10 animate-spin mx-auto text-slate-200" /></div> :
                filteredRoster.map(s => {
                  const key = (s.studentId || s.studentEmail)?.toLowerCase();
                  const last = lastMessages.get(key);
                  const active = selectedStudent?.id === s.id;
                  return (
                    <button key={s.id} onClick={()=>setSelectedStudent(s)} className={`w-full p-8 flex items-center gap-6 border-b border-slate-50 transition-all rounded-[2.5rem] mb-2 ${active ? 'bg-white shadow-2xl z-20 ring-1 ring-slate-100' : 'hover:bg-white/50'}`}>
                       <div className={`w-16 h-16 rounded-[1.8rem] flex items-center justify-center text-lg font-black shadow-inner transition-all ${active ? 'bg-[#1e3a8a] text-white' : 'bg-slate-100 text-slate-300'}`}>{s.studentName?.substring(0,2).toUpperCase()}</div>
                       <div className="flex-1 text-left truncate">
                          <div className="flex justify-between items-center mb-1"><h4 className="text-lg font-black text-slate-900 truncate uppercase tracking-tighter italic">{s.studentName}</h4>{last && <span className="text-[10px] font-black text-slate-300 uppercase">{new Date(last.createdAt?.toDate?.() || Date.now()).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>}</div>
                          <p className={`text-[12px] truncate uppercase tracking-widest ${active ? 'text-indigo-600 font-black' : 'text-slate-400 font-bold'}`}>{last ? `${last.from==='teacher'?'✓ ':''}${last.content}` : 'Initiate trace...'}</p>
                       </div>
                    </button>
                  );
                })}
          </div>
        </div>

        <div className={`flex-1 flex flex-col ${!selectedStudent ? 'hidden md:flex' : 'flex'} relative bg-[#fafafa]`}>
          {selectedStudent ? (
            <>
              <div className="px-10 py-6 bg-white border-b border-slate-100 flex justify-between items-center z-20 shadow-sm">
                 <div className="flex items-center gap-6">
                    <button onClick={()=>setSelectedStudent(null)} className="md:hidden p-3 hover:bg-slate-50 rounded-full"><ChevronLeft/></button>
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center p-0.5 border border-white shadow-sm overflow-hidden text-indigo-400"><User size={28}/></div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic leading-none mb-2">{selectedStudent.studentName}</h3>
                       <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-2 animate-pulse"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Active Liaison Enabled</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <button className="h-14 w-14 flex items-center justify-center text-slate-400 hover:bg-slate-50 rounded-2xl transition-all shadow-sm"><Video size={24}/></button>
                    <button className="h-14 w-14 flex items-center justify-center text-slate-400 hover:bg-slate-50 rounded-2xl transition-all shadow-sm"><Phone size={22}/></button>
                    <div className="w-px h-8 bg-slate-100 mx-2" />
                    <button onClick={handleClearChat} className="h-14 w-14 flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all"><Trash2 size={24}/></button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar flex flex-col z-10 bg-[#f8fafc]/50">
                 {studentMessages.map((n, i) => {
                    const isT = n.from === "teacher";
                    return (
                      <div key={n.id} className={`flex flex-col ${isT ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-4 duration-500`}>
                         <div className={`relative px-8 py-5 rounded-[2rem] text-[15px] shadow-sm font-bold max-w-[80%] ${isT ? 'bg-[#1e3a8a] text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'}`}>
                            <p className="whitespace-pre-wrap leading-relaxed">{n.content}</p>
                            <div className={`mt-3 flex items-center justify-end gap-2 opacity-50 text-[9px] font-black uppercase tracking-widest ${isT ? 'text-indigo-100' : 'text-slate-400'}`}>
                               {new Date(n.createdAt?.toDate?.() || Date.now()).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                               {isT && <CheckCheck className="w-4 h-4 ml-1" />}
                            </div>
                         </div>
                      </div>
                    );
                 })}
                 <div ref={chatEndRef} />
              </div>

              <div className="p-8 bg-white border-t border-slate-100 z-20">
                 <div className="flex gap-3 overflow-x-auto no-scrollbar pb-6">
                    {TEMPLATES.map(t => (
                       <button key={t.id} onClick={()=>setMessageContent(t.label === 'Good Progress' ? `Professional Update: ${selectedStudent.studentName} is manifesting exceptional scholarly merit in recent cycles.` : `Institutional Alert: We have identified gaps in ${selectedStudent.studentName}'s trajectory regarding ${t.label}.`)} className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-[#1e3a8a] hover:text-[#1e3a8a] transition-all shadow-sm active:scale-95 whitespace-nowrap">{t.label}</button>
                    ))}
                 </div>
                 <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-[2.5rem] border border-slate-100 shadow-inner">
                    <button className="h-14 w-14 flex items-center justify-center text-slate-300 hover:text-indigo-500 bg-white shadow-sm rounded-full transition-all shrink-0"><Smile size={28}/></button>
                    <div className="flex-1 bg-white rounded-[1.8rem] shadow-sm border border-slate-50 flex items-center pr-4 overflow-hidden">
                       <textarea rows={1} value={messageContent} onChange={(e)=>setMessageContent(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSendMessage();}}} placeholder="Compose scholarly discourse..." className="flex-1 bg-transparent border-none focus:ring-0 px-6 py-4 text-sm font-black resize-none custom-scrollbar min-h-[60px]" />
                       <button onClick={generateAI} disabled={isGenerating} className="h-12 w-12 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all shrink-0">{isGenerating ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={24}/>}</button>
                    </div>
                    <button onClick={handleSendMessage} disabled={!messageContent.trim()} className={`h-16 w-16 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-2xl shrink-0 ${messageContent.trim() ? 'bg-[#1e3a8a] text-white' : 'bg-slate-200 text-slate-400'}`}><Send size={28}/></button>
                 </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center relative z-10 glass-pattern">
               <div className="w-48 h-48 bg-white rounded-full shadow-[0_50px_100px_-20px_rgba(30,58,138,0.25)] flex items-center justify-center mb-12 border-8 border-slate-50 group hover:rotate-6 transition-all duration-700">
                  <MessageSquare className="w-16 h-16 text-slate-100 group-hover:text-indigo-600 transition-colors" />
               </div>
               <h2 className="text-5xl font-black text-slate-900 mb-4 uppercase tracking-tighter italic">Discourse Registry</h2>
               <p className="text-sm font-black text-slate-300 max-w-sm uppercase tracking-[0.3em] leading-relaxed">Select a scholar from the manifest to establish an encrypted liaison node.</p>
               <div className="absolute bottom-16 text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em] flex items-center gap-3"><Bot size={20} className="animate-bounce" /> Distributed Scholastic Ledger Active</div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .glass-pattern { background-image: radial-gradient(#e2e8f0 1.5px, transparent 1.5px); background-size: 30px 30px; }
      `}</style>
    </div>
  );
};
export default ParentNotes;
