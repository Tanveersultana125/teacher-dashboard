import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { collection, query, onSnapshot, where, setDoc, doc, writeBatch, deleteDoc, getDocs } from "firebase/firestore";
import { useAuth } from "../lib/AuthContext";
import { 
  Loader2, Search, FileSpreadsheet, Plus, Upload, Check, ChevronRight, Calculator, Trash2, Save, X, Settings2
} from "lucide-react";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ClassData {
  id: string;
  name: string;
  [key: string]: any;
}

interface CustomColumn {
  id: string;
  name: string;
  maxMarks: number;
}

const getGrade = (percentage: number) => {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
};

const gradeColor = (grade: string) => {
  if (grade === "A+" || grade === "A") return "text-emerald-500 bg-emerald-50";
  if (grade === "B") return "text-blue-500 bg-blue-50";
  if (grade === "C") return "text-amber-500 bg-amber-50";
  return "text-rose-500 bg-rose-50";
};

export default function Gradebook() {
  const { teacherData } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  
  const [students, setStudents] = useState<any[]>([]);
  const [columns, setColumns] = useState<CustomColumn[]>([]);
  const [scores, setScores] = useState<Record<string, any>>({}); 
  const [localScores, setLocalScores] = useState<Record<string, any>>({});
  
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal states
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColMax, setNewColMax] = useState("100");

  const [saving, setSaving] = useState(false);

  // 1. Fetch Classes
  useEffect(() => {
    if (!teacherData?.id) return;
    const q = query(collection(db, "teaching_assignments"), where("teacherId", "==", teacherData.id), where("status", "==", "active"));
    const unsub = onSnapshot(q, async (snap) => {
      const assignments = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const classSnap = await getDocs(query(collection(db, "classes")));
      const classMap = new Map();
      classSnap.docs.forEach(d => classMap.set(d.id, d.data()));

      let assignmentOptions = assignments.map(a => {
        const cls = classMap.get(a.classId);
        return {
          id: a.id, 
          classId: a.classId,
          name: `${cls?.name || 'Class'} - ${a.subjectName || a.subject || 'Subject'}`
        };
      });
      
      if (assignmentOptions.length === 0) {
        const qLegacy = query(collection(db, "classes"), where("teacherId", "==", teacherData.id));
        const legacySnap = await getDocs(qLegacy);
        assignmentOptions = legacySnap.docs.map(d => ({ id: d.id, classId: d.id, name: d.data().name }));
      }
      
      setClasses(assignmentOptions);
      if (assignmentOptions.length > 0 && !selectedClassId) {
        setSelectedClassId(assignmentOptions[0].id);
      } else if (assignmentOptions.length === 0) {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [teacherData?.id]);

  // 2. Fetch Roster & Scores
  useEffect(() => {
    if (!teacherData?.id || !selectedClassId) return;
    setLoading(true);

    const selAssignment = classes.find(c => c.id === selectedClassId);
    const targetClassId = selAssignment?.classId || selectedClassId;

    const unsubStudents = onSnapshot(query(collection(db, "enrollments"), where("classId", "==", targetClassId)), (snap) => {
        const studs = snap.docs.map(d => {
            const e = d.data();
            return {
                id: e.studentId || e.studentEmail,
                realId: e.studentId,
                email: e.studentEmail,
                name: e.studentName,
                rollNo: e.rollNo || "N/A",
                initials: e.studentName?.substring(0,2).toUpperCase() || "ST"
            };
        });
        setStudents(Array.from(new Map(studs.map(i => [i.email || i.id, i])).values()).sort((a,b) => a.name.localeCompare(b.name)));
    });

    const unsubCols = onSnapshot(query(collection(db, "gradebook_columns"), where("assignmentId", "==", selectedClassId)), (snap) => {
        setColumns(snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomColumn)).sort((a:any, b:any) => a.createdAt - b.createdAt));
    });

    const unsubScores = onSnapshot(query(collection(db, "gradebook_scores"), where("assignmentId", "==", selectedClassId)), (snap) => {
        const fetched: any = {};
        snap.docs.forEach(d => {
            const data = d.data();
            const studentKey = (data.studentEmail?.toLowerCase() || data.studentId);
            fetched[`${studentKey}_${data.columnId}`] = data.mark;
        });
        setScores(fetched);
        setLocalScores(fetched);
        setLoading(false);
    });

    return () => { unsubStudents(); unsubCols(); unsubScores(); };
  }, [teacherData?.id, selectedClassId, classes]);

  const handleAddColumn = async () => {
      if (!newColName.trim()) return toast.error("Name required");
      const colId = `col_${Date.now()}`;
      await setDoc(doc(db, "gradebook_columns", colId), {
          id: colId,
          assignmentId: selectedClassId,
          classId: classes.find(c => c.id === selectedClassId)?.classId || selectedClassId,
          teacherId: teacherData.id,
          name: newColName,
          maxMarks: Number(newColMax),
          createdAt: Date.now()
      });
      setShowAddCol(false);
      setNewColName("");
  };

  const handleDeleteColumn = async (id: string) => {
      if (confirm("Delete Column?")) await deleteDoc(doc(db, "gradebook_columns", id));
  };

  const handleSaveGrades = async () => {
      setSaving(true);
      const batch = writeBatch(db);
      let count = 0;
      students.forEach(stu => {
          columns.forEach(col => {
              const key = `${(stu.email || stu.id).toLowerCase()}_${col.id}`;
              if (localScores[key] !== scores[key]) {
                  const docRef = doc(db, "gradebook_scores", `${stu.id}_${col.id}`);
                  batch.set(docRef, {
                      id: `${stu.id}_${col.id}`,
                      studentId: stu.realId || stu.id,
                      studentEmail: stu.email?.toLowerCase() || "",
                      studentName: stu.name,
                      teacherId: teacherData.id,
                      columnId: col.id,
                      columnName: col.name,
                      assignmentId: selectedClassId,
                      classId: classes.find(c => c.id === selectedClassId)?.classId || selectedClassId,
                      mark: Number(localScores[key]),
                      maxMarks: Number(col.maxMarks) || 100,
                      updatedAt: Date.now()
                  }, { merge: true });
                  count++;
              }
          });
      });
      if (count > 0) await batch.commit();
      setSaving(false);
      toast.success(`Synced ${count} entries`);
  };

  const exportTemplate = () => {
      const headers = ["Roll No", "Student Name", "Email", ...columns.map(c => `${c.name} (${c.maxMarks})`)];
      const data = [headers, ...students.map(s => [s.rollNo, s.name, s.email, ...columns.map(c => localScores[`${(s.email||s.id).toLowerCase()}_${c.id}`] || "")])];
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Gradebook");
      XLSX.writeFile(wb, `Gradebook_${selectedClassId}.xlsx`);
  };

  const processImport = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
          const binary = evt.target?.result as string;
          const workbook = XLSX.read(binary, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          
          if (data.length < 2) return;
          const h = data[0] as string[];
          const m: any[] = [];
          h.forEach((name, i) => { 
             if(i > 2) { 
                const c = columns.find(x => x.name.toLowerCase() === name.split('(')[0].trim().toLowerCase()); 
                if(c) m.push({i, id: c.id}); 
             } 
          });
          
          setLocalScores(prev => {
              const next = { ...prev };
              data.slice(1).forEach(row => { 
                 const email = row[2]?.toString().toLowerCase().trim(); 
                 if(email) m.forEach(x => { 
                    if(row[x.i] !== undefined) next[`${email}_${x.id}`] = Number(row[x.i]); 
                 }); 
              });
              return next;
          });
          toast.success("Excel processed. Previewing changes...");
      };
      reader.readAsBinaryString(file);
  };

  const filtered = students.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-in fade-in duration-700 pb-20 text-left">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 px-4">
          <div className="flex items-center gap-5">
             <div className="w-16 h-16 rounded-[2rem] bg-[#1e3a8a] text-white flex items-center justify-center shadow-2xl"><Calculator size={32} /></div>
             <div><h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Gradebook Engine</h1></div>
          </div>
          <div className="flex flex-wrap gap-3">
             <div className="h-14 px-6 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 text-slate-400 group focus-within:border-blue-400 transition-all">
                <Search size={18} /><input type="text" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Filter Roster..." className="bg-transparent border-none outline-none text-xs font-black uppercase tracking-widest text-slate-800 placeholder:text-slate-300"/>
             </div>
             <button onClick={exportTemplate} className="h-14 px-6 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm"><FileSpreadsheet size={18} className="text-emerald-500" /> Export</button>
             <button onClick={()=>fileInputRef.current?.click()} className="h-14 px-6 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm"><Upload size={18} /> Import</button>
             <input type="file" ref={fileInputRef} className="hidden" onChange={processImport} />
             <button onClick={()=>setShowAddCol(true)} className="h-14 px-6 bg-white border-2 border-slate-100 text-slate-800 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:border-slate-300 transition-all shadow-sm"><Plus size={18} /> Add Column</button>
             <button onClick={handleSaveGrades} disabled={saving} className="h-14 px-10 bg-[#1e3a8a] text-white rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-blue-900/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">{saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Save Matrix</button>
          </div>
      </div>

      <div className="mb-10 px-4">
         <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-full lg:w-[400px] h-16 rounded-3xl bg-white border border-slate-100 shadow-sm px-6 text-sm font-black text-slate-800 uppercase tracking-widest"><SelectValue placeholder="Select Academic Cluster..." /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id} className="text-xs font-black uppercase">{c.name}</SelectItem>)}</SelectContent>
         </Select>
      </div>

      {showAddCol && (
         <div className="mx-4 mb-10 bg-slate-900 rounded-[3rem] p-10 flex flex-col md:flex-row items-end gap-8 shadow-2xl animate-in slide-in-from-top-10">
            <div className="flex-1 space-y-4">
               <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest ml-1">Title</label>
               <input type="text" value={newColName} onChange={e=>setNewColName(e.target.value)} placeholder="UNIT TEST 1" className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm font-bold outline-none focus:bg-white/10 focus:border-indigo-400 transition-all uppercase" />
            </div>
            <div className="w-full md:w-40 space-y-4">
               <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest ml-1">Max</label>
               <input type="number" value={newColMax} onChange={e=>setNewColMax(e.target.value)} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm font-bold outline-none text-center" />
            </div>
            <div className="flex gap-4">
               <button onClick={()=>setShowAddCol(false)} className="h-16 px-8 bg-white/5 text-white/40 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
               <button onClick={handleAddColumn} className="h-16 px-10 bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all">Add</button>
            </div>
         </div>
      )}

      <div className="bg-white border border-slate-100 rounded-[3.5rem] shadow-sm overflow-hidden min-h-[500px] flex flex-col mx-2 relative">
         {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-20"><Loader2 className="w-16 h-16 animate-spin mb-4" /><p className="text-[10px] font-black uppercase tracking-[0.3em]">Synthesizing Matrix...</p></div>
         ) : columns.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-40">
               <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-10 text-slate-200"><Settings2 size={64} /></div>
               <h3 className="text-3xl font-black text-slate-800 italic uppercase italic tracking-tighter mb-4">Gradebook Empty</h3>
               <button onClick={()=>setShowAddCol(true)} className="h-16 px-12 bg-[#1e3a8a] text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-blue-900/30 hover:scale-110 transition-all">Construct First Column</button>
            </div>
         ) : (
            <div className="overflow-x-auto custom-scrollbar">
               <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                     <tr className="bg-slate-50/50">
                        <th className="p-10 border-b border-slate-100 sticky left-0 z-20 bg-slate-50/100 backdrop-blur-md italic uppercase tracking-widest text-[10px] font-black text-slate-400">Scholar Identity</th>
                        {columns.map(col => (
                           <th key={col.id} className="p-8 border-b border-slate-100 text-center relative group min-w-[150px]">
                              <p className="text-[11px] font-black text-[#1e3a8a] uppercase tracking-widest leading-none mb-1">{col.name}</p>
                              <p className="text-[9px] font-bold text-slate-300 uppercase">Max: {col.maxMarks}</p>
                              <button onClick={()=>handleDeleteColumn(col.id)} className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 text-rose-300 hover:text-rose-600 transition-all"><X size={12} /></button>
                           </th>
                        ))}
                        <th className="p-10 border-b border-slate-100 text-center bg-slate-50/80 uppercase tracking-widest text-[10px] font-black text-slate-900">Total</th>
                        <th className="p-10 border-b border-slate-100 text-center bg-indigo-50/50 uppercase tracking-widest text-[10px] font-black text-indigo-600">Grade</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {filtered.map(stu => {
                        const earned = columns.reduce((acc, c) => acc + (Number(localScores[`${(stu.email || stu.id).toLowerCase()}_${c.id}`]) || 0), 0);
                        const totalMax = columns.reduce((acc, curr) => acc + curr.maxMarks, 0);
                        const pct = totalMax > 0 ? (earned/totalMax)*100 : 0;
                        const grade = getGrade(pct);
                        return (
                           <tr key={stu.email || stu.id} className="group hover:bg-slate-50/50 transition-all">
                              <td className="p-10 sticky left-0 z-10 bg-white group-hover:bg-slate-50 transition-all border-r border-slate-50">
                                 <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-lg">{stu.initials}</div>
                                    <div><h4 className="text-base font-black text-slate-800 uppercase italic tracking-tighter leading-none mb-2">{stu.name}</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Roll: {stu.rollNo}</p></div>
                                 </div>
                              </td>
                              {columns.map(col => (
                                 <td key={col.id} className="p-2 border-r border-slate-50">
                                    <input type="number" value={localScores[`${(stu.email || stu.id).toLowerCase()}_${col.id}`] || ""} onChange={(e) => { const key = `${(stu.email || stu.id).toLowerCase()}_${col.id}`; setLocalScores(prev => ({ ...prev, [key]: e.target.value })); }} placeholder="-" className="w-full h-16 text-center text-lg font-black bg-transparent outline-none transition-all rounded-3xl focus:bg-white focus:ring-4 focus:ring-blue-50"/>
                                 </td>
                              ))}
                              <td className="p-10 text-center bg-slate-50/20 border-l border-slate-50">
                                 <p className="text-lg font-black text-slate-800 italic leading-none">{earned} <span className="text-[10px] text-slate-300">/ {totalMax}</span></p>
                                 <p className="text-[10px] font-bold text-slate-400 mt-2">{pct.toFixed(1)}%</p>
                              </td>
                              <td className="p-10 text-center bg-indigo-50/20 border-l border-slate-50">
                                 <span className={`px-5 py-2 rounded-xl text-xs font-black shadow-inner uppercase ${gradeColor(grade)}`}>{grade}</span>
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
         )}
      </div>
    </div>
  );
}
