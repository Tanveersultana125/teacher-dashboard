import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { db } from "../lib/firebase";
import { 
  collection, query, where, onSnapshot, addDoc, 
  serverTimestamp, deleteDoc, doc, getDocs 
} from "firebase/firestore";
import { 
  BookOpen, Users, Clock, ArrowRight, GraduationCap, 
  Loader2, Activity, BrainCircuit, Sparkles, Plus, 
  Trash2, UserPlus, X, Check, Search
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AIController } from "../ai/controller/ai-controller";

const MyClasses = () => {
  const navigate = useNavigate();
  const { teacherData } = useAuth();
  
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isManageStudentsOpen, setIsManageStudentsOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  
  const [newClass, setNewClass] = useState({ name: "", grade: "", section: "" });
  const [newStudent, setNewStudent] = useState({ name: "", email: "" });
  const [isSaving, setIsSaving] = useState(false);

  // 1. Fetch Teacher's Classes
  useEffect(() => {
    if (!teacherData?.id) return;
    const q = query(collection(db, "classes"), where("teacherId", "==", teacherData.id));
    const unsub = onSnapshot(q, (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [teacherData?.id]);

  // 2. Fetch All Students for this Teacher (to count and filter)
  useEffect(() => {
    if (!teacherData?.id) return;
    const q = query(collection(db, "students"), where("teacherId", "==", teacherData.id));
    const unsub = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [teacherData?.id]);

  const handleAddClass = async () => {
    if (!newClass.name || !newClass.grade) return toast.error("Class Name and Grade are required");
    setIsSaving(true);
    try {
      await addDoc(collection(db, "classes"), {
        ...newClass,
        teacherId: teacherData.id,
        schoolId: teacherData.schoolId || "",
        createdAt: serverTimestamp()
      });
      toast.success("Class added successfully!");
      setIsAddClassOpen(false);
      setNewClass({ name: "", grade: "", section: "" });
    } catch (e) {
      toast.error("Failed to add class");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.email) return toast.error("Name and Email are required");
    setIsSaving(true);
    try {
      await addDoc(collection(db, "students"), {
        name: newStudent.name,
        email: newStudent.email.toLowerCase(),
        grade: selectedClass.name, // Link student to this class name
        teacherId: teacherData.id,
        teacherName: teacherData.name,
        schoolId: teacherData.schoolId || "",
        status: "Invited",
        createdAt: serverTimestamp()
      });
      toast.success(`${newStudent.name} added to ${selectedClass.name}`);
      setNewStudent({ name: "", email: "" });
    } catch (e) {
      toast.error("Failed to add student");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteClass = async (id: string) => {
    if (!confirm("Are you sure? This won't delete students, but will remove the class group.")) return;
    try {
      await deleteDoc(doc(db, "classes", id));
      toast.success("Class removed");
    } catch (e) {
      toast.error("Error deleting class");
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 text-[#1e3a8a] animate-spin mb-4" />
      <p className="font-bold text-slate-400">Loading your academic roster...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Class Management</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Design your curriculum and manage student groups</p>
        </div>
        <button 
          onClick={() => setIsAddClassOpen(true)}
          className="bg-[#1e3a8a] text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 hover:scale-105 transition-all flex items-center gap-3"
        >
          <Plus className="w-5 h-5" /> Start New Class
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] p-24 text-center">
          <BookOpen className="w-20 h-20 text-slate-100 mx-auto mb-8" />
          <h2 className="text-2xl font-black text-slate-800 mb-2">No Classes Found</h2>
          <p className="text-slate-400 font-bold mb-8 italic">Your digital classroom is ready. Start by adding your first grade or section.</p>
          <button onClick={() => setIsAddClassOpen(true)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Create Class Now</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {classes.map((cls) => {
            const classStudents = students.filter(s => s.grade === cls.name);
            return (
              <div key={cls.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-50/50 rounded-full blur-3xl group-hover:bg-blue-100 transition-colors"></div>
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#1e3a8a] flex items-center justify-center text-white shadow-lg">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <button onClick={() => deleteClass(cls.id)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-8 relative z-10">
                  <h3 className="text-2xl font-black text-slate-900 mb-1">{cls.name}</h3>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{cls.grade} • {cls.section || 'General'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Users className="w-3 h-3"/> Students</p>
                    <p className="text-xl font-black text-slate-900">{classStudents.length}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/> Health</p>
                    <p className="text-xl font-black text-emerald-500">88%</p>
                  </div>
                </div>

                <div className="flex gap-3 relative z-10">
                  <button 
                    onClick={() => { setSelectedClass(cls); setIsManageStudentsOpen(true); }}
                    className="flex-1 bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" /> Roster
                  </button>
                  <button 
                    onClick={() => navigate("/students")}
                    className="w-14 bg-blue-50 text-[#1e3a8a] border border-blue-100 rounded-2xl flex items-center justify-center hover:bg-blue-100 transition-all"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD CLASS DIALOG ── */}
      <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">Configure Class Group</DialogTitle>
            <DialogDescription>Define a custom academic group for your curriculum.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="uppercase text-[10px] font-black text-slate-400 tracking-widest ml-1">Class Label / Title</Label>
              <Input placeholder="e.g. Physics Section B" className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100" value={newClass.name} onChange={e=>setNewClass({...newClass, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black text-slate-400 tracking-widest ml-1">Grade Level</Label>
                <Input placeholder="e.g. 10th" className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100" value={newClass.grade} onChange={e=>setNewClass({...newClass, grade: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black text-slate-400 tracking-widest ml-1">Section Code</Label>
                <Input placeholder="e.g. C" className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100" value={newClass.section} onChange={e=>setNewClass({...newClass, section: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button disabled={isSaving} onClick={handleAddClass} className="w-full h-14 bg-[#1e3a8a] text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} Create Class Roster
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MANAGE STUDENTS DIALOG ── */}
      <Dialog open={isManageStudentsOpen} onOpenChange={setIsManageStudentsOpen}>
        <DialogContent className="sm:max-w-[620px] rounded-[3rem] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600" /> {selectedClass?.name} Roster
            </DialogTitle>
            <DialogDescription>Manage students assigned to this specific group.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-6 space-y-8 pr-2">
            {/* Quick Add Form */}
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-4">
               <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enroll New Student</h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input placeholder="Student Full Name" className="h-12 rounded-xl bg-white border-white" value={newStudent.name} onChange={e=>setNewStudent({...newStudent, name: e.target.value})} />
                  <Input placeholder="Parent Email" type="email" className="h-12 rounded-xl bg-white border-white" value={newStudent.email} onChange={e=>setNewStudent({...newStudent, email: e.target.value})} />
               </div>
               <button onClick={handleAddStudent} disabled={isSaving} className="w-full py-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Enroll Student to {selectedClass?.name}
               </button>
            </div>

            {/* List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Members ({students.filter(s => s.grade === selectedClass?.name).length})</h4>
              </div>
              <div className="space-y-3">
                {students.filter(s => s.grade === selectedClass?.name).map((stu) => (
                  <div key={stu.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#1e3a8a] text-xs font-black">
                        {stu.name.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-none">{stu.name}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{stu.email}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded uppercase">Active</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter className="pt-4 border-t border-slate-100">
            <button onClick={() => setIsManageStudentsOpen(false)} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Done Managing</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyClasses;
