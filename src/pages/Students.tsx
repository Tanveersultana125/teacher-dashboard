import { useState } from "react";
import StudentProfile from "@/components/StudentProfile";

const studentsData = [
  { initials: "AR", name: "Aditya Rao", cls: "Class 8-A", roll: 801, attendance: "98%", avg: "85.5%", status: "Good", color: "bg-[#3b82f6]", attColor: "text-green-600" },
  { initials: "BS", name: "Bhavya Singh", cls: "Class 8-A", roll: 802, attendance: "95%", avg: "82.0%", status: "Good", color: "bg-[#22c55e]", attColor: "text-green-600" },
  { initials: "DV", name: "Divya Verma", cls: "Class 8-A", roll: 803, attendance: "88%", avg: "68.5%", status: "Attention", color: "bg-[#f59e0b]", attColor: "text-orange-500" },
  { initials: "KM", name: "Karthik Menon", cls: "Class 8-A", roll: 804, attendance: "82%", avg: "58.0%", status: "At Risk", color: "bg-[#ef4444]", attColor: "text-red-500" },
  { initials: "NS", name: "Neha Sharma", cls: "Class 8-A", roll: 805, attendance: "97%", avg: "91.2%", status: "Good", color: "bg-[#8b5cf6]", attColor: "text-green-600" },
  { initials: "PK", name: "Pranav K", cls: "Class 8-A", roll: 806, attendance: "94%", avg: "76.8%", status: "Good", color: "bg-[#ec4899]", attColor: "text-green-600" },
  { initials: "RJ", name: "Riya Jain", cls: "Class 8-A", roll: 807, attendance: "96%", avg: "83.5%", status: "Good", color: "bg-[#14b8a6]", attColor: "text-green-600" },
  { initials: "SK", name: "Sanjay K", cls: "Class 8-A", roll: 808, attendance: "89%", avg: "69.2%", status: "Attention", color: "bg-[#ea580c]", attColor: "text-orange-500" },
];

const statusStyles: Record<string, string> = {
  Good: "bg-green-100 text-green-700",
  Attention: "bg-yellow-100 text-yellow-700",
  "At Risk": "bg-red-100 text-red-700",
};

const Students = () => {
  const [selectedStudent, setSelectedStudent] = useState<typeof studentsData[0] | null>(null);

  if (selectedStudent) {
    return <StudentProfile student={selectedStudent} onBack={() => setSelectedStudent(null)} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Students</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1 tracking-tight">View and manage all your students across classes.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <input 
              className="border border-border rounded-xl pl-4 pr-10 py-2.5 text-sm bg-card w-[280px] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 shadow-sm" 
              placeholder="" 
            />
          </div>
          <button className="border border-border rounded-xl px-6 py-2.5 text-sm font-bold bg-card text-muted-foreground hover:bg-secondary transition-colors shadow-sm">
            Filter
          </button>
        </div>
      </div>

      {/* Filter Bars Placeholders (Matching image exactly) */}
      <div className="flex items-center gap-4 py-2">
         <div className="h-10 w-32 bg-card border border-border rounded-xl shadow-sm" />
         <div className="h-10 w-48 bg-card border border-border rounded-xl shadow-sm" />
         <div className="h-10 w-32 bg-card border border-border rounded-xl shadow-sm" />
      </div>

      {/* Main Student Cards Grid */}
      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           {studentsData.map((s) => (
             <div key={s.roll} className="bg-card border border-border rounded-2xl p-6 hover:border-[#1e3a8a]/30 transition-all shadow-sm flex flex-col h-full group">
               <div className="flex justify-between items-start mb-6">
                 <div className={`w-14 h-14 rounded-[1rem] flex items-center justify-center text-white text-xl font-bold shadow-sm ${s.color}`}>
                   {s.initials}
                 </div>
                 <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${statusStyles[s.status]}`}>
                   {s.status}
                 </span>
               </div>
               
               <div className="mb-6">
                  <h3 className="font-bold text-foreground text-lg mb-1">{s.name}</h3>
                  <p className="text-[13px] text-muted-foreground font-medium">{s.cls} <span className="mx-1.5">•</span> Roll: {s.roll}</p>
               </div>
               
               <div className="space-y-4 mb-8 flex-grow">
                 <div className="flex justify-between items-center text-[13px] font-bold">
                   <span className="text-muted-foreground">Attendance</span>
                   <span className={s.attColor}>{s.attendance}</span>
                 </div>
                 
                 <div className="flex justify-between items-center text-[13px] font-bold">
                   <span className="text-muted-foreground">Avg. Score</span>
                   <span className="text-foreground">{s.avg}</span>
                 </div>
               </div>
               
               <button 
                 onClick={() => setSelectedStudent(s)}
                 className="w-full bg-[#1e3a8a] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#1e4fc0] transition-colors shadow-md mt-auto"
               >
                 View Profile
               </button>
             </div>
           ))}
         </div>

         {/* Pagination Footer */}
         <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
           <p className="text-[13px] font-medium text-muted-foreground">Showing 8 of 125 students</p>
           <div className="flex items-center gap-2">
             <button className="px-4 py-2 text-[13px] border border-border rounded-lg text-muted-foreground font-bold hover:bg-secondary">Previous</button>
             <button className="w-9 h-9 text-[13px] bg-[#1e3a8a] text-white rounded-lg font-bold shadow-sm flex items-center justify-center">1</button>
             <button className="w-9 h-9 text-[13px] border border-border rounded-lg text-muted-foreground font-bold hover:bg-secondary flex items-center justify-center">2</button>
             <button className="w-9 h-9 text-[13px] border border-border rounded-lg text-muted-foreground font-bold hover:bg-secondary flex items-center justify-center">3</button>
             <button className="px-4 py-2 text-[13px] border border-border rounded-lg text-muted-foreground font-bold hover:bg-secondary">Next</button>
           </div>
         </div>
      </div>
    </div>
  );
};

export default Students;
