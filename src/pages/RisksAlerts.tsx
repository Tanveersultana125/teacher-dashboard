import React from "react";

const alerts = [
  {
    initials: "RK", name: "Rahul Kumar", severity: "Critical", cls: "Class 9-B", 
    color: "bg-[#ef4444]", bgColor: "bg-[#fef2f2]", borderColor: "border-l-[#ef4444]",
    issue: "Attendance dropped to 72% - 8 absences in last 3 weeks",
    details: ["Last present: 3 days ago", "Pattern: Mondays & Fridays"],
    primaryAction: "Contact Parent", secondaryAction: "Mark Resolved", primaryColor: "bg-[#ef4444] text-white", textCol: "text-[#ef4444]"
  },
  {
    initials: "KM", name: "Karthik Menon", severity: "Critical", cls: "Class 8-A", 
    color: "bg-[#ef4444]", bgColor: "bg-[#fef2f2]", borderColor: "border-l-[#ef4444]",
    issue: "Grade average dropped 22% in last month - from 72% to 50%",
    details: ["Trend: Declining", "At risk of failing"],
    primaryAction: "Schedule Meeting", secondaryAction: "View Profile", primaryColor: "bg-[#1e3a8a] text-white", textCol: "text-[#ef4444]"
  },
  {
    initials: "SP", name: "Sneha Patel", severity: "High Priority", cls: "Class 10-A", 
    color: "bg-[#f59e0b]", bgColor: "bg-[#fef9c3]", borderColor: "border-l-[#f59e0b]",
    issue: "Missing 4 assignments - last submission 2 weeks ago",
    details: ["Overdue: Algebra, Geometry", "Grade impact: -15%"],
    primaryAction: "Send Reminder", secondaryAction: "Extend Deadline", primaryColor: "bg-[#f59e0b] text-white", textCol: "text-[#f59e0b]"
  },
  {
    initials: "AM", name: "Amit Mishra", severity: "High Priority", cls: "Class 7-C", 
    color: "bg-[#f59e0b]", bgColor: "bg-[#fef9c3]", borderColor: "border-l-[#f59e0b]",
    issue: "Frequently late to class - 6 late arrivals this month",
    details: ["Avg. delay: 15 mins", "Pattern: After lunch"],
    primaryAction: "Talk to Student", secondaryAction: "Notify Parent", primaryColor: "bg-[#1e3a8a] text-white", textCol: "text-[#f59e0b]"
  },
];

const severityColors: Record<string, string> = {
  Critical: "bg-[#ef4444] text-white",
  "High Priority": "bg-[#f59e0b] text-white",
};

const tabs = ["All Alerts (16)", "Attendance (4)", "Grades (6)", "Submissions (3)", "Behavior (3)"];

const RisksAlerts = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1e293b]">Risks & Alerts</h1>
          <p className="text-[15px] font-medium text-muted-foreground mt-1">Monitor and respond to student concerns.</p>
        </div>
        <div className="h-10 w-32 bg-white border border-border rounded-xl shadow-sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#fef2f2] border-2 border-[#f87171] rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#ef4444] shadow-sm shrink-0" />
            <div>
              <p className="text-3xl font-black text-[#ef4444] leading-tight">3</p>
              <p className="text-[13px] font-bold text-muted-foreground">Critical</p>
            </div>
        </div>
        <div className="bg-[#fef9c3] border-2 border-[#fcd34d] rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#f59e0b] shadow-sm shrink-0" />
            <div>
              <p className="text-3xl font-black text-[#f59e0b] leading-tight">5</p>
              <p className="text-[13px] font-bold text-muted-foreground">High Priority</p>
            </div>
        </div>
        <div className="bg-blue-50 border-2 border-[#1e3a8a]/40 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#1e3a8a] shadow-sm shrink-0" />
            <div>
              <p className="text-3xl font-black text-[#1e3a8a] leading-tight">8</p>
              <p className="text-[13px] font-bold text-muted-foreground">Medium Priority</p>
            </div>
        </div>
        <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-600 shadow-sm shrink-0" />
            <div>
              <p className="text-3xl font-black text-green-600 leading-tight">12</p>
              <p className="text-[13px] font-bold text-muted-foreground">Resolved This Week</p>
            </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden mt-6">
        {/* Tabs */}
        <div className="flex px-2 pt-2 border-b border-border bg-white overflow-x-auto">
          {tabs.map((t, i) => (
            <button 
              key={t} 
              className={`px-5 py-4 text-[15px] font-bold whitespace-nowrap transition-colors relative
                ${i === 0 ? "text-[#1e3a8a]" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t}
              {i === 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1e3a8a]" />
              )}
            </button>
          ))}
        </div>

        {/* Alert Cards */}
        <div className="p-6 space-y-5 bg-slate-50/30">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-start gap-5 p-5 rounded-xl border-l-[6px] shadow-sm transition-all ${a.bgColor} ${a.borderColor}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-[15px] font-bold shadow-sm shrink-0 ${a.color}`}>
                  {a.initials}
              </div>
              
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="font-bold text-[17px] text-foreground">{a.name}</h3>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${severityColors[a.severity]} shadow-sm`}>
                      {a.severity}
                  </span>
                  <span className="text-[13px] font-bold text-muted-foreground">{a.cls}</span>
                </div>
                
                <p className="text-[15px] font-semibold text-foreground mb-3">{a.issue}</p>
                
                <div className="flex items-center gap-6">
                  {a.details.map((d, j) => (
                    <p key={j} className="text-[13px] font-bold text-muted-foreground">{d}</p>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 shrink-0">
                  <button className={`px-5 py-2.5 rounded-xl text-[13px] font-bold shadow-sm transition-all ${a.primaryColor}`}>
                      {a.primaryAction}
                  </button>
                  <button className="px-5 py-2.5 rounded-xl text-[13px] font-bold bg-white border border-border text-foreground hover:bg-slate-50 transition-all shadow-sm">
                      {a.secondaryAction}
                  </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RisksAlerts;
