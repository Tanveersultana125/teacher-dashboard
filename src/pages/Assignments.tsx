import React, { useState } from "react";
import CreateAssignment from "@/components/CreateAssignment";
import GradeAssignment from "@/components/GradeAssignment";

const assignmentsData = [
  { name: "Algebraic Expressions", sub: "Chapter 5 Exercise", cls: "Class 8-A", due: "Today", submissions: "28/32", status: "Due Today", actions: ["Grade", "Edit"] },
  { name: "Geometry Basics", sub: "Worksheet 3", cls: "Class 9-B", due: "Tomorrow", submissions: "18/28", status: "Active", actions: ["View", "Edit"] },
  { name: "Linear Equations", sub: "Problem Set 2", cls: "Class 10-A", due: "2 days ago", submissions: "28/30", status: "12 Pending", actions: ["Grade", "Extend"] },
  { name: "Data Interpretation", sub: "Graph Analysis", cls: "Class 7-C", due: "Feb 20, 2025", submissions: "0/35", status: "Upcoming", actions: ["View", "Edit"] },
  { name: "Percentage Problems", sub: "Word Problems", cls: "Class 8-A", due: "Feb 15, 2025", submissions: "32/32", status: "Graded", actions: ["Results"] },
];

const Assignments = () => {
  const [view, setView] = useState<'list' | 'create' | 'grade'>('list');
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");

  const handleAction = (action: string, assignmentName: string) => {
    if (action === "Grade") {
      setSelectedAssignment(assignmentName);
      setView('grade');
    }
  };

  if (view === 'create') {
    return (
      <CreateAssignment 
        onCancel={() => setView('list')} 
        onCreate={() => setView('list')} 
      />
    );
  }

  if (view === 'grade') {
    return (
      <GradeAssignment 
        assignmentName={selectedAssignment} 
        onBack={() => setView('list')} 
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assignments</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">Create, manage, and grade student assignments.</p>
        </div>
        <button 
          onClick={() => setView('create')}
          className="bg-[#1e3a8a] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-[#1e4fc0] transition-colors"
        >
          Create Assignment
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-blue-100/50" />
          <div>
            <h2 className="text-3xl font-black text-foreground tracking-tight">24</h2>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Active</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-yellow-100/60" />
          <div>
            <h2 className="text-3xl font-black text-foreground tracking-tight">8</h2>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Due This Week</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-red-100/60" />
          <div>
            <h2 className="text-3xl font-black text-foreground tracking-tight">12</h2>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pending Grading</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-green-100/50" />
          <div>
            <h2 className="text-3xl font-black text-foreground tracking-tight">76%</h2>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Avg. Submission</p>
          </div>
        </div>
      </div>

      {/* Filter Inputs Row (Empty placeholders based on image) */}
      <div className="flex items-center gap-4">
         <div className="h-10 w-32 bg-card border border-border rounded-xl shadow-sm" />
         <div className="h-10 w-32 bg-card border border-border rounded-xl shadow-sm" />
         <div className="h-10 w-32 bg-card border border-border rounded-xl shadow-sm" />
         <div className="h-10 w-32 bg-card border border-border rounded-xl shadow-sm ml-auto" />
      </div>

      {/* Assignments Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="py-5 px-6 text-xs font-bold text-muted-foreground uppercase">Assignment</th>
                <th className="py-5 px-6 text-xs font-bold text-muted-foreground uppercase">Class</th>
                <th className="py-5 px-6 text-xs font-bold text-muted-foreground uppercase">Due Date</th>
                <th className="py-5 px-6 text-xs font-bold text-muted-foreground uppercase">Submissions</th>
                <th className="py-5 px-6 text-xs font-bold text-muted-foreground uppercase">Status</th>
                <th className="py-5 px-6 text-xs font-bold text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assignmentsData.map((a, i) => (
                <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                  <td className="py-4 px-6 min-w-[200px]">
                    <p className="font-bold text-foreground text-[15px] leading-tight mb-0.5">{a.name}</p>
                    <p className="text-[13px] font-semibold text-foreground">{a.sub}</p>
                  </td>
                  <td className="py-4 px-6 text-[13px] font-medium text-foreground">{a.cls}</td>
                  <td className="py-4 px-6 text-[13px] font-bold text-foreground">{a.due}</td>
                  <td className="py-4 px-6 text-[13px] font-semibold text-foreground">{a.submissions}</td>
                  <td className="py-4 px-6 text-[13px] font-medium text-foreground max-w-[120px]">
                    {/* According to the image, the status has a 2-line layout or plain text */}
                    {a.status.split(' ').map((word, index) => (
                       <span key={index} className="block">{word}</span>
                    ))}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col items-start gap-1">
                      {a.actions.map((act) => (
                        <button 
                          key={act} 
                          onClick={() => handleAction(act, a.name)}
                          className="text-[13px] text-foreground font-medium hover:text-[#1e3a8a] text-left"
                        >
                          {act}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination & Footer */}
        <div className="flex items-center justify-between px-6 py-5 border-t border-border mt-auto">
          <p className="text-[13px] font-medium text-muted-foreground">Showing 5 of 24 assignments</p>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-[13px] border border-border rounded-lg text-muted-foreground font-bold hover:bg-secondary">Previous</button>
            <button className="w-9 h-9 text-[13px] bg-[#1e3a8a] text-white rounded-lg font-bold">1</button>
            <button className="w-9 h-9 text-[13px] border border-border rounded-lg text-muted-foreground font-bold hover:bg-secondary">2</button>
            <button className="w-9 h-9 text-[13px] border border-border rounded-lg text-muted-foreground font-bold hover:bg-secondary">3</button>
            <button className="px-4 py-2 text-[13px] border border-border rounded-lg text-muted-foreground font-bold hover:bg-secondary">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Assignments;
