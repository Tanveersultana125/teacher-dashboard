import React from "react";

const SettingsPage = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1e293b]">Settings</h1>
          <p className="text-[15px] font-medium text-muted-foreground mt-1">Manage your profile and preferences.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 bg-white border border-border rounded-xl text-sm font-bold text-foreground shadow-sm hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button className="px-5 py-2.5 bg-[#16a34a] text-white rounded-xl text-sm font-bold shadow-sm hover:bg-green-700 transition-colors">
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr] gap-6 mt-6">
        {/* Profile Card */}
        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-[1rem] bg-blue-100/60 shadow-sm shrink-0" />
            <h2 className="text-lg font-bold text-foreground">Profile</h2>
          </div>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">Full Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 transition-all font-medium text-[#1e293b] shadow-sm" 
              />
            </div>
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">Email</label>
              <input 
                type="email" 
                className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 transition-all font-medium text-[#1e293b] shadow-sm" 
              />
            </div>
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">Phone</label>
              <input 
                type="tel" 
                className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 transition-all font-medium text-[#1e293b] shadow-sm" 
              />
            </div>
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">Subject</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-50/50 border border-border/60 rounded-xl focus:outline-none font-medium text-muted-foreground shadow-sm" 
                disabled
              />
            </div>
          </div>
        </div>

        {/* Notifications Card */}
        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-[1rem] bg-amber-100/60 shadow-sm shrink-0" />
            <h2 className="text-lg font-bold text-foreground">Notifications</h2>
          </div>
          <div className="space-y-8 mt-2">
            {[
              { title: "Assignment Submissions", desc: "When students submit work", active: true },
              { title: "Grade Deadlines", desc: "Reminders for pending grading", active: true },
              { title: "Attendance Alerts", desc: "Low attendance warnings", active: true },
              { title: "Parent Messages", desc: "New message notifications", active: true },
              { title: "Risk Alerts", desc: "Student performance concerns", active: true },
            ].map((n) => (
              <div key={n.title} className="flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-bold text-foreground mb-0.5">{n.title}</h3>
                  <p className="text-[13px] font-medium text-muted-foreground">{n.desc}</p>
                </div>
                {/* Custom Toggle Switch */}
                <div className={`w-12 h-6 rounded-full relative cursor-pointer shadow-sm transition-colors ${n.active ? 'bg-[#16a34a]' : 'bg-slate-200'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-md transition-transform ${n.active ? 'right-0.5 translate-x-[-2px]' : 'left-0.5'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preferences & Security Column */}
        <div className="flex flex-col gap-6 h-full">
          {/* Preferences Card */}
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 rounded-[1rem] bg-green-100/50 shadow-sm shrink-0" />
               <h2 className="text-lg font-bold text-foreground">Preferences</h2>
            </div>
            <div className="space-y-6">
              {[
                "Default Class View",
                "Grade Scale",
                "Date Format"
              ].map((label) => (
                <div key={label}>
                  <label className="text-sm font-bold text-foreground block mb-2">{label}</label>
                  <div className="w-full h-[46px] bg-white border border-border rounded-xl shadow-sm flex items-center px-4" />
                </div>
              ))}
            </div>
          </div>

          {/* Security Card */}
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm h-full">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 rounded-[1rem] bg-red-100/50 shadow-sm shrink-0" />
               <h2 className="text-lg font-bold text-foreground">Security</h2>
            </div>
            <div className="space-y-4">
              <button className="w-full py-3 bg-white border border-border rounded-xl text-sm font-bold text-foreground hover:bg-slate-50 transition-colors shadow-sm">
                Change Password
              </button>
              <button className="w-full py-3 bg-white border border-border rounded-xl text-sm font-bold text-foreground hover:bg-slate-50 transition-colors shadow-sm">
                Enable 2FA
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
