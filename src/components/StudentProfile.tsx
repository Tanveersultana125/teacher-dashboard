import React, { useState } from 'react';
import { ChevronLeft, BrainCircuit, Loader2, Sparkles, TrendingUp, CheckCircle2, Clock, Map, Target } from 'lucide-react';
import { AIController } from '../ai/controller/ai-controller';

interface StudentProfileProps {
  student: any;
  onBack: () => void;
}

const StudentProfile = ({ student, onBack }: StudentProfileProps) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const tabs = ['Overview', 'Academic', 'Attendance', 'Assignments', 'Concepts'];
  
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const academicData = [
    { label: 'Unit Test 1', value: 78, color: 'bg-[#1e3a8a]' },
    { label: 'Unit Test 2', value: 82, color: 'bg-[#1e3a8a]' },
    { label: 'Mid Term', value: 88, color: 'bg-emerald-500' },
  ];

  const handleDeepAnalytics = async () => {
     setIsSynthesizing(true);
     try {
       const payload = {
          student_name: student.name,
          attendance: student.attendance || '95%',
          average_score: student.avgScore || '88%',
          recent_tests: academicData.map(a => a.value)
       };
       const result = await AIController.getStudentAnalytics(payload);
       if (result.status === "success" && result.data) {
          setAnalyticsData(result.data);
       } else {
          alert("Failed to synthesize deep analytics.");
       }
     } catch (e) {
       console.error(e);
     } finally {
       setIsSynthesizing(false);
     }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-8 border-b-2 border-slate-50 pb-8">
        <button onClick={onBack} className="p-4 rounded-2xl border-2 border-slate-100 hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto group">
          <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-[#1e3a8a]" />
        </button>
        <div className="flex items-center gap-6 flex-1">
          <div className={`${student.color} w-20 h-20 rounded-[2rem] flex items-center justify-center text-white text-3xl font-black shadow-lg`}>
            {student.initials}
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-800 leading-tight tracking-tight mb-2">{student.name}</h1>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-lg w-max shadow-sm">
              Grade {student.grade} • SR-{student.roll || '001'} • {student.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <button className="px-6 py-4 rounded-2xl border-2 border-slate-100 bg-white text-xs uppercase tracking-widest font-black text-slate-500 hover:bg-slate-50 transition-colors shadow-sm w-full sm:w-auto flex justify-center">
            Message Connect
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 space-y-8">
           {/* FEATURE 20 & 21: AI Deep Analytics Container */}
           <div className="bg-indigo-600 rounded-[2.5rem] p-1 shadow-xl shadow-indigo-600/20 overflow-hidden relative">
              <div className="bg-indigo-700/50 absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
              <div className="bg-indigo-600 p-8 rounded-[2.4rem] relative z-10 flex flex-col md:flex-row items-center gap-8 justify-between">
                 <div className="flex-1 text-white">
                    <h3 className="text-xs font-black text-indigo-200 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Sparkles className="w-4 h-4"/> AI Predictive Brain
                    </h3>
                    <h2 className="text-2xl font-black leading-tight mb-4 text-white drop-shadow-sm">Synthesize Deep Learning Style & Track Predicted Test Outcomes.</h2>
                    <p className="text-xs font-bold text-indigo-300 leading-relaxed max-w-sm">Tap into the AI core to predict progress trends based dynamically on past tests and current mastery levels.</p>
                 </div>
                 <button onClick={handleDeepAnalytics} disabled={isSynthesizing} className="bg-white text-indigo-600 h-16 px-8 rounded-2xl text-xs font-black shadow-lg uppercase tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-2 min-w-[240px]">
                    {isSynthesizing ? <Loader2 className="w-5 h-5 animate-spin"/> : <BrainCircuit className="w-5 h-5"/>}
                    {isSynthesizing ? 'Establishing Neural Link...' : 'Run Deep Profile Scan'}
                 </button>
              </div>
           </div>

           {analyticsData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-700">
                 {/* FEATURE 20: Learning Style Detection */}
                 <div className="bg-white border border-amber-100 rounded-[2rem] p-8 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-6">
                       <Map className="w-6 h-6 text-amber-500" />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Detected Architecture</h3>
                    <h2 className="text-xl font-black text-amber-600 mb-4">{analyticsData.learning_style} Scholar</h2>
                    <p className="text-xs font-bold text-slate-600 leading-relaxed bg-amber-50/50 p-4 rounded-xl border border-amber-50">{analyticsData.learning_style_reason}</p>
                 </div>

                 {/* FEATURE 21: Progress Prediction */}
                 <div className="bg-white border border-emerald-100 rounded-[2rem] p-8 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6">
                       <Target className="w-6 h-6 text-emerald-500" />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Expected Trajectory</h3>
                    <h2 className="text-xl font-black text-emerald-600 mb-4">{analyticsData.progress_prediction}</h2>
                    <p className="text-xs font-bold text-slate-600 leading-relaxed bg-emerald-50/50 p-4 rounded-xl border border-emerald-50">{analyticsData.prediction_reason}</p>
                 </div>
              </div>
           )}

           <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 shadow-sm">
             <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6">Quick Overview Matrix</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-400"></div>
                   <p className="text-3xl font-black text-slate-800 mb-1 leading-none text-center">{student.attendance || '95%'}</p>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center mt-2">Attendance Rating</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1e3a8a]"></div>
                   <p className="text-3xl font-black text-slate-800 mb-1 leading-none text-center">{student.avgScore || '88%'}</p>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center mt-2">Scholarly Average</p>
                </div>
             </div>
           </div>
        </div>

        {/* Right Sidebar stats */}
        <div className="space-y-6">
           <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 shadow-sm">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Academic Trajectory</h3>
               <span className="text-[8px] uppercase font-black tracking-widest bg-blue-50 text-blue-600 px-2 py-1 rounded">Live Data</span>
             </div>
             
             <div className="space-y-6 mb-8">
               {academicData.map((data, i) => (
                 <div key={i}>
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest mb-2">
                     <span className="text-slate-500">{data.label}</span>
                     <span className="text-slate-800">{data.value}%</span>
                   </div>
                   <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                     <div className={`h-full ${data.color} shadow-sm rounded-full`} style={{ width: `${data.value}%` }} />
                   </div>
                 </div>
               ))}
             </div>

             <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <div>
                   <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Status Trend</p>
                   <p className="text-sm font-black text-emerald-800">Positive Growth</p>
                </div>
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                   <TrendingUp className="w-5 h-5"/>
                </div>
             </div>
           </div>

           <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 shadow-sm">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6">Recent Touchpoints</h3>
              <div className="space-y-5">
                 <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex justify-center items-center shrink-0 border border-blue-100"><CheckCircle2 className="w-4 h-4"/></div>
                    <div>
                       <p className="text-xs font-black text-slate-700">Submitted Algebra Exam</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">2 Days Ago</p>
                    </div>
                 </div>
                 <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex justify-center items-center shrink-0 border border-emerald-100"><TrendingUp className="w-4 h-4"/></div>
                    <div>
                       <p className="text-xs font-black text-slate-700">Scored Rank 2 (Out of 34)</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">1 Week Ago</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
