import { useState, useEffect, useRef } from "react";
import StudentProfile from "@/components/StudentProfile";
import { useAuth } from "../lib/AuthContext";
import { db } from "../lib/firebase";
import {
  collection, query, where, onSnapshot, addDoc,
  serverTimestamp, deleteDoc, doc, updateDoc, getDocs
} from "firebase/firestore";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Search, Loader2, UserPlus, Trash2, Edit,
  MoreVertical, BrainCircuit, FileSpreadsheet,
  Download, Upload, X, CheckCircle
} from "lucide-react";
import { sendEmail } from "../lib/resend";
import { AIController } from "../ai/controller/ai-controller";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BulkStudent {
  name: string;
  email: string;
  grade: string;
  section: string;
  _status?: "pending" | "success" | "error" | "duplicate";
  _error?: string;
}

const TEMPLATE_DATA = [
  { Name: "Ahmed Khan",    Email: "parent1@gmail.com", Grade: "Grade 8", Section: "A" },
  { Name: "Priya Sharma",  Email: "parent2@gmail.com", Grade: "Grade 8", Section: "B" },
];

const statusStyles: Record<string, string> = {
  Active:   "bg-emerald-100 text-emerald-700 font-black",
  Invited:  "bg-blue-100 text-blue-700 font-black",
  "At Risk":"bg-rose-100 text-rose-700 font-black",
};

// ─── Component ────────────────────────────────────────────────────────────────
const Students = () => {
  const { teacherData } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [students, setStudents]               = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isInviteOpen, setIsInviteOpen]       = useState(false);
  const [isEditOpen, setIsEditOpen]           = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen]           = useState(false);
  const [studentToEdit, setStudentToEdit]     = useState<any | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<any | null>(null);
  const [isSending, setIsSending]             = useState(false);
  const [searchTerm, setSearchTerm]           = useState("");
  const [isGeneratingSummaries, setIsGeneratingSummaries] = useState(false);
  const [aiSummaries, setAiSummaries]         = useState<any>({});

  // Bulk state
  const [bulkData, setBulkData]               = useState<BulkStudent[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkDone, setBulkDone]               = useState(false);

  const [inviteForm, setInviteForm] = useState({ name: "", email: "", grade: "", section: "" });
  const [editForm, setEditForm]     = useState({ name: "", email: "", grade: "", section: "" });

  // ── Real-time Students ────────────────────────────────────────────────────
  useEffect(() => {
    if (!teacherData?.id) return;
    const q = query(collection(db, "students"), where("teacherId", "==", teacherData.id));
    const unsub = onSnapshot(q, (snap) => {
      const colors = ["bg-[#3b82f6]","bg-[#22c55e]","bg-[#f59e0b]","bg-[#ef4444]","bg-[#8b5cf6]","bg-[#ec4899]"];
      setStudents(snap.docs.map((d, idx) => ({
        id: d.id,
        ...d.data(),
        initials: d.data().name?.split(' ').map((n: any) => n[0]).join('').toUpperCase() || "S",
        color: colors[idx % colors.length]
      })));
    });
    return () => unsub();
  }, [teacherData?.id]);

  // ── Download Template ─────────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(TEMPLATE_DATA);
    ws["!cols"] = [{ wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "student_bulk_template.xlsx");
    toast.success("Template downloaded!");
  };

  // ── Parse Excel ───────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb   = XLSX.read(ev.target?.result, { type: "binary" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        const parsed: BulkStudent[] = rows.map((r: any) => ({
          name:    (r["Name"]    || r["name"]    || "").toString().trim(),
          email:   (r["Email"]   || r["email"]   || "").toString().trim().toLowerCase(),
          grade:   (r["Grade"]   || r["grade"]   || teacherData?.classes || "").toString().trim(),
          section: (r["Section"] || r["section"] || "").toString().trim(),
          _status: "pending" as const,
        })).filter(r => r.name && r.email);

        if (parsed.length === 0) {
          toast.error("No valid rows found. Columns needed: Name, Email");
          return;
        }
        setBulkData(parsed);
        setBulkDone(false);
        toast.success(`${parsed.length} students loaded!`);
      } catch {
        toast.error("Failed to read file. Use the template format please.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // ── Bulk Import Process ───────────────────────────────────────────────────
  const handleBulkImport = async () => {
    if (!teacherData?.id || bulkData.length === 0) return;
    setIsBulkProcessing(true);

    // Get existing emails to check duplicates
    const existingSnap = await getDocs(
      query(collection(db, "students"), where("teacherId", "==", teacherData.id))
    );
    const existingEmails = new Set(existingSnap.docs.map(d => d.data().email?.toLowerCase()));

    let success = 0, fail = 0, duplicate = 0;
    const updated = [...bulkData];

    for (let i = 0; i < updated.length; i++) {
      const s = updated[i];

      if (existingEmails.has(s.email)) {
        updated[i] = { ...s, _status: "duplicate", _error: "Already exists" };
        duplicate++;
        setBulkData([...updated]);
        continue;
      }

      try {
        // 1. Save to Firestore
        await addDoc(collection(db, "students"), {
          name:        s.name,
          email:       s.email,
          grade:       s.grade || teacherData.classes || "",
          section:     s.section || "",
          teacherId:   teacherData.id,
          teacherName: teacherData.name || "",
          schoolId:    teacherData.schoolId || "",
          schoolName:  teacherData.schoolName || "",
          branch:      teacherData.branch || "",
          status:      "Invited",
          createdAt:   serverTimestamp()
        });

        // 2. Send invitation email (non-blocking)
        try {
          await sendEmail({
            to: s.email,
            subject: `Your child ${s.name} has been enrolled — ${teacherData.schoolName}`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
                <h2 style="color:#1e3a8a;">Welcome to EduIntellect 🎓</h2>
                <p>Hello Parent/Guardian,</p>
                <p><strong>${teacherData.name}</strong> from <strong>${teacherData.schoolName}</strong> has enrolled <strong>${s.name}</strong> in <strong>${s.grade} – Section ${s.section || 'A'}</strong>.</p>
                <p>Use your Google account (${s.email}) to access the Parent Dashboard and track your child's progress.</p>
                <div style="margin:28px 0;">
                  <a href="https://parent-dashboard-ten.vercel.app" style="background:#1e3a8a;color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold;">
                    Open Parent Dashboard
                  </a>
                </div>
                <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0;" />
                <p style="font-size:11px;color:#94a3b8;">EduIntellect School Management Platform</p>
              </div>
            `
          });
        } catch (emailErr) {
          console.warn(`Email failed for ${s.email}:`, emailErr);
        }

        updated[i] = { ...s, _status: "success" };
        success++;
      } catch (err: any) {
        updated[i] = { ...s, _status: "error", _error: err.message || "Failed" };
        fail++;
      }
      setBulkData([...updated]);
    }

    setIsBulkProcessing(false);
    setBulkDone(true);
    toast.success(`✅ Done! ${success} enrolled, ${duplicate} duplicates, ${fail} failed.`);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleOpenInvite = () => {
    setInviteForm({ name: "", email: "", grade: teacherData?.classes || "", section: "" });
    setIsInviteOpen(true);
  };

  const handleOpenEdit = (student: any) => {
    setStudentToEdit(student);
    setEditForm({ name: student.name || "", email: student.email || "", grade: student.grade || "", section: student.section || "" });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (student: any) => {
    setStudentToDelete(student);
    setIsDeleteAlertOpen(true);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email || !inviteForm.grade) return toast.error("Please fill in all required fields");
    setIsSending(true);
    try {
      await addDoc(collection(db, "students"), {
        ...inviteForm,
        email:       inviteForm.email.toLowerCase(),
        teacherId:   teacherData.id,
        teacherName: teacherData.name,
        schoolId:    teacherData.schoolId,
        schoolName:  teacherData.schoolName,
        branch:      teacherData.branch,
        status:      "Invited",
        createdAt:   serverTimestamp()
      });
      await sendEmail({
        to: inviteForm.email,
        subject: `Student Invitation: Join ${teacherData.name}'s Class at ${teacherData.schoolName}`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;">
          <h2 style="color:#1e3a8a;">Welcome to EduIntellect</h2>
          <p><strong>${teacherData.name}</strong> from <strong>${teacherData.schoolName}</strong> has invited <strong>${inviteForm.name}</strong> to join Class ${inviteForm.grade} – ${inviteForm.section}.</p>
          <p>Use your Google account (${inviteForm.email}) to access the Parent Dashboard.</p>
          <div style="margin:30px 0;">
            <a href="https://parent-dashboard-ten.vercel.app" style="background-color:#1e3a8a;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Access Parent Dashboard</a>
          </div>
          <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0;"/>
          <p style="font-size:12px;color:#94a3b8;">Sent via EduIntellect LMS.</p>
        </div>`
      });
      toast.success("Student invited successfully!");
      setIsInviteOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to invite student");
    } finally { setIsSending(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToEdit) return;
    setIsSending(true);
    try {
      await updateDoc(doc(db, "students", studentToEdit.id), { ...editForm, email: editForm.email.toLowerCase() });
      toast.success("Student updated successfully!");
      setIsEditOpen(false);
    } catch { toast.error("Failed to update student"); }
    finally { setIsSending(false); }
  };

  const handleDelete = async () => {
    if (!studentToDelete) return;
    try {
      await deleteDoc(doc(db, "students", studentToDelete.id));
      toast.success("Student record deleted");
      setIsDeleteAlertOpen(false);
    } catch { toast.error("Failed to delete record"); }
  };

  const handleAISummaries = async () => {
    if (students.length === 0) return toast.error("Roster is empty.");
    setIsGeneratingSummaries(true);
    try {
      const payload = {
        class: teacherData?.classes || "8A",
        students: students.map(s => ({ name: s.name, status: s.status, section: s.section }))
      };
      const result = await AIController.getRosterSummaries(payload);
      if (result.status === "success" && result.data?.summaries) {
        const dict: any = {};
        result.data.summaries.forEach((sum: any) => dict[sum.student_name] = sum.summary);
        setAiSummaries(dict);
      } else {
        toast.error(result.message || "Failed to generate AI Summaries");
      }
    } catch (e) { console.error(e); }
    finally { setIsGeneratingSummaries(false); }
  };

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedStudent) return <StudentProfile student={selectedStudent} onBack={() => setSelectedStudent(null)} />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-4">
        <div>
          <h1 className="text-3xl font-black text-foreground">Students</h1>
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mt-1">
            Manage class roster and track analytics
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleAISummaries}
            disabled={isGeneratingSummaries || students.length === 0}
            className="bg-indigo-600 text-white rounded-2xl px-5 py-3 text-xs uppercase tracking-widest font-black hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-2"
          >
            {isGeneratingSummaries ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
            {isGeneratingSummaries ? 'Profiling...' : 'AI Profiles'}
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold bg-white w-[240px] focus:outline-none focus:border-[#1e3a8a] transition-colors"
              placeholder="Search students..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Bulk Import */}
          <button
            onClick={() => { setIsBulkOpen(true); setBulkData([]); setBulkDone(false); }}
            className="flex items-center gap-2 px-5 py-3 text-sm border border-indigo-200 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Bulk Import
          </button>

          {/* Single Add */}
          <button
            onClick={handleOpenInvite}
            className="bg-[#1e3a8a] text-white rounded-2xl px-5 py-3 text-sm font-black shadow-md flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* ── BULK IMPORT MODAL ─────────────────────────────────────────────── */}
      <Dialog open={isBulkOpen} onOpenChange={o => { if (!isBulkProcessing) setIsBulkOpen(o); }}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-[#1e294b] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> Bulk Student Import
            </DialogTitle>
            <DialogDescription>
              Upload an Excel file to enroll multiple students at once. Parents will receive email invitations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
              <p className="text-xs font-black uppercase tracking-wider text-indigo-600 mb-1">Step 1 — Download Template</p>
              <p className="text-xs text-slate-500 mb-3">Required columns: <strong>Name, Email</strong>. Optional: Grade, Section.</p>
              <button onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:opacity-90">
                <Download className="w-4 h-4" /> Download Template
              </button>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Step 2 — Upload Filled File</p>
              <p className="text-xs text-slate-400 mb-3">Supports .xlsx format only</p>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
              <button onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100">
                <Upload className="w-4 h-4" /> Choose Excel File
              </button>
            </div>

            {/* Preview */}
            {bulkData.length > 0 && (
              <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-[#1e3a8a] flex items-center justify-between">
                  <span className="text-[11px] font-black text-white uppercase tracking-widest">{bulkData.length} Students Loaded</span>
                  {!bulkDone && (
                    <button onClick={() => setBulkData([])} className="text-white/60 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-black">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Grade</th>
                        <th className="px-4 py-3">Sec</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {bulkData.map((s, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-800">{s.name}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{s.email}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{s.grade || "—"}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{s.section || "—"}</td>
                          <td className="px-4 py-3 text-center">
                            {s._status === "pending"   && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-500">Ready</span>}
                            {s._status === "success"   && <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />}
                            {s._status === "duplicate" && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-600">Duplicate</span>}
                            {s._status === "error"     && <span title={s._error} className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-50 text-red-500">Error</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Summary */}
            {bulkDone && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-center">
                  <p className="text-2xl font-black text-green-600">{bulkData.filter(s => s._status === "success").length}</p>
                  <p className="text-[10px] font-black uppercase text-green-500">Enrolled</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
                  <p className="text-2xl font-black text-amber-600">{bulkData.filter(s => s._status === "duplicate").length}</p>
                  <p className="text-[10px] font-black uppercase text-amber-500">Duplicates</p>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-center">
                  <p className="text-2xl font-black text-red-600">{bulkData.filter(s => s._status === "error").length}</p>
                  <p className="text-[10px] font-black uppercase text-red-500">Failed</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            {!bulkDone ? (
              <button
                onClick={handleBulkImport}
                disabled={bulkData.length === 0 || isBulkProcessing}
                className="w-full h-12 rounded-xl bg-[#1e3a8a] text-white font-bold hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isBulkProcessing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  : <><Upload className="w-4 h-4" /> Enroll & Invite All</>}
              </button>
            ) : (
              <button onClick={() => setIsBulkOpen(false)}
                className="w-full h-12 rounded-xl bg-green-600 text-white font-bold hover:opacity-90 flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Done — Close
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── SINGLE INVITE MODAL ───────────────────────────────────────────── */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1e294b]">Invite New Student</DialogTitle>
            <DialogDescription>Student will be enrolled and parent will receive an email invitation.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Student Full Name *</Label>
              <Input required placeholder="e.g. Ahmed Khan" value={inviteForm.name}
                onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Parent Email *</Label>
              <Input type="email" required placeholder="parent@gmail.com" value={inviteForm.email}
                onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Grade *</Label>
                <Select onValueChange={val => setInviteForm({ ...inviteForm, grade: val })} defaultValue={teacherData?.classes || ""}>
                  <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                      <SelectItem key={g} value={`Grade ${g}`}>Grade {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Section</Label>
                <Input placeholder="e.g. A" value={inviteForm.section}
                  onChange={e => setInviteForm({ ...inviteForm, section: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <button type="submit" disabled={isSending}
                className="w-full h-12 rounded-xl bg-[#1e3a8a] text-white font-bold hover:opacity-90 flex items-center justify-center gap-2">
                {isSending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : "Enroll & Invite"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT MODAL ────────────────────────────────────────────────────── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1e294b]">Edit Student</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</Label>
              <Input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Grade</Label>
                <Input value={editForm.grade} onChange={e => setEditForm({ ...editForm, grade: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Section</Label>
                <Input value={editForm.section} onChange={e => setEditForm({ ...editForm, section: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <button type="submit" disabled={isSending}
                className="w-full h-12 rounded-xl bg-[#1e3a8a] text-white font-bold hover:opacity-90 flex items-center justify-center gap-2">
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Changes
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM ────────────────────────────────────────────────── */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{studentToDelete?.name}</strong>'s record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── STUDENTS GRID ─────────────────────────────────────────────────── */}
      <div className="bg-transparent min-h-[400px]">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(s => (
              <div key={s.id}
                className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 hover:border-[#1e3a8a]/30 transition-all shadow-sm flex flex-col h-full group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-sm ${s.color}`}>
                    {s.initials}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-current ${statusStyles[s.status || 'Active']}`}>
                      {s.status || 'Active'}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1 hover:bg-slate-50 flex items-center justify-center rounded-xl transition-colors focus:outline-none">
                        <MoreVertical className="w-5 h-5 text-slate-300" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl p-2 shadow-xl border border-slate-100 min-w-[140px]">
                        <DropdownMenuItem onClick={() => handleOpenEdit(s)} className="text-xs font-black uppercase tracking-widest text-slate-500 cursor-pointer p-3 rounded-xl">
                          <Edit className="w-4 h-4 mr-2" /> Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenDelete(s)} className="text-xs font-black uppercase tracking-widest text-red-500 cursor-pointer p-3 rounded-xl">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="mb-4 relative z-10">
                  <h3 className="font-black text-slate-800 text-xl leading-none mb-1 truncate">{s.name}</h3>
                  <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">
                    {s.grade} • Sec {s.section || 'A'}
                  </p>
                </div>

                {/* AI Summary */}
                {aiSummaries[s.name] ? (
                  <div className="mb-6 bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl relative z-10">
                    <p className="text-[11px] font-bold text-indigo-900 leading-relaxed italic line-clamp-2">
                      {`"${aiSummaries[s.name]}"`}
                    </p>
                  </div>
                ) : (
                  <div className="mb-6 h-[72px]" />
                )}

                <div className="space-y-2.5 mb-6 flex-grow relative z-10">
                  <div className="flex justify-between items-center text-xs font-black bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 uppercase tracking-widest">Attendance</span>
                    <span className="text-emerald-500">{s.attendance || '95%'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-black bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 uppercase tracking-widest">Avg Score</span>
                    <span className="text-[#1e3a8a]">{s.avgScore || '—'}</span>
                  </div>
                </div>

                <button onClick={() => setSelectedStudent(s)}
                  className="w-full bg-slate-50 text-slate-600 border border-slate-200 py-3.5 rounded-2xl text-[11px] uppercase tracking-widest font-black hover:bg-slate-100 transition-colors shadow-sm mt-auto relative z-10 group-hover:bg-[#1e3a8a] group-hover:text-white group-hover:border-[#1e3a8a]">
                  Dive Deep Analytics
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-white border border-dashed border-slate-200 rounded-[2rem]">
            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 text-slate-200">
              <UserPlus className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-2">No Students Yet</h3>
            <p className="text-sm font-bold text-slate-400 max-w-sm leading-relaxed mb-6">
              Use <strong>"Bulk Import"</strong> to enroll multiple students at once, or <strong>"Add Student"</strong> to add one at a time.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setIsBulkOpen(true); setBulkData([]); setBulkDone(false); }}
                className="flex items-center gap-2 px-5 py-2.5 text-sm border border-indigo-200 rounded-2xl bg-indigo-50 text-indigo-700 font-bold">
                <FileSpreadsheet className="w-4 h-4" /> Bulk Import
              </button>
              <button onClick={handleOpenInvite}
                className="flex items-center gap-2 px-5 py-2.5 text-sm bg-[#1e3a8a] text-white font-black rounded-2xl">
                <UserPlus className="w-4 h-4" /> Add Student
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Students;
