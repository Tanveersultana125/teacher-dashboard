import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  ChevronLeft, Loader2, Star, AlertTriangle, Trophy, TrendingUp, TrendingDown,
  CheckCircle, Phone, BookOpen, Activity, MessageSquare
} from 'lucide-react';
import { db } from '../lib/firebase';
import {
  collection, query, where, getDocs, doc, getDoc, onSnapshot,
  addDoc, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';

interface StudentProfileProps {
  student: any;
  onBack: () => void;
}

export default function StudentProfile({ student, onBack }: StudentProfileProps) {
  const { teacherData } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [recentTests, setRecentTests]   = useState<any[]>([]);
  const [allTests, setAllTests]         = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [conceptMastery, setConceptMastery] = useState<any[]>([]);
  const [masterProfile, setMasterProfile]   = useState<any>(null);
  const [submissionPct, setSubmissionPct]   = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Feedback states
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [pastFeedbacks, setPastFeedbacks]       = useState<any[]>([]);

  // Behaviour states
  const [positiveNote, setPositiveNote]             = useState('');
  const [improvementNote, setImprovementNote]       = useState('');
  const [manualRating, setManualRating]             = useState(5);
  const [isSubmittingBehaviour, setIsSubmittingBehaviour] = useState(false);
  const [pastBehaviours, setPastBehaviours]         = useState<any[]>([]);

  const attPct = student.attendancePct || 100;
  const avgPct = student.avgScorePct   || 0;

  // ─── Data Fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!student.id) return;
    setLoading(true);

    const unsubMaster = onSnapshot(doc(db, 'students', student.id), (d) => {
      if (d.exists()) setMasterProfile(d.data());
    });

    const fetchData = async () => {
      try {
        const q1 = query(collection(db, 'test_scores'), where('studentId', '==', student.id));
        const q2 = student.email
          ? query(collection(db, 'test_scores'), where('studentEmail', '==', student.email.toLowerCase()))
          : null;

        const [s1, s2] = await Promise.all([getDocs(q1), q2 ? getDocs(q2) : Promise.resolve({ docs: [] as any[] })]);
        const map = new Map<string, any>();
        [...s1.docs, ...s2.docs].forEach(d => { if (!map.has(d.id)) map.set(d.id, { id: d.id, ...d.data() }); });

        const sorted = Array.from(map.values()).sort(
          (a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
        );

        setAllTests(sorted);
        setRecentTests(sorted.slice(0, 6));

        // Recent Activity from test scores
        const acts = sorted.slice(0, 3).map((s: any, i: number) => ({
          type: 'test',
          title: `Scored ${s.percentage?.toFixed(0) || 0}% in ${s.testName || 'Assessment'}`,
          subtitle: `${s.subject || s.testName || 'Test'} • ${
            s.timestamp
              ? formatTimeAgo(new Date(s.timestamp.seconds * 1000))
              : 'Recently'
          }`,
          dotColor: i === 0 ? 'bg-green-400' : i === 1 ? 'bg-blue-400' : 'bg-yellow-400',
        }));
        if (acts.length === 0)
          acts.push({ type: 'info', title: 'Academic log started', subtitle: 'No recent activity', dotColor: 'bg-slate-300' });
        setRecentActivity(acts);

        // Concept mastery
        const uniqueTestIds = [...new Set(sorted.map((s: any) => s.testId).filter(Boolean))];
        if (uniqueTestIds.length > 0) {
          const snaps = await Promise.all(uniqueTestIds.map(id => getDoc(doc(db, 'tests_registry', id as string))));
          const testsData = snaps.map(t => ({ id: t.id, ...(t.data() as any) }));
          const topicsMap = new Map<string, { totalPts: number; count: number }>();

          sorted.forEach((s: any) => {
            const mt = testsData.find(t => t.id === s.testId);
            if (mt?.topics?.length > 0) {
              mt.topics.forEach((topic: string) => {
                const curr = topicsMap.get(topic) || { totalPts: 0, count: 0 };
                curr.totalPts += s.percentage || 0;
                curr.count += 1;
                topicsMap.set(topic, curr);
              });
            }
          });

          setConceptMastery(
            Array.from(topicsMap.entries())
              .map(([name, v]) => ({ name, score: Number((v.totalPts / v.count).toFixed(0)) }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 4)
          );
        }

        // Submission rate
        try {
          const aq = query(collection(db, 'assignments'), where('classId', '==', student.classId || ''));
          const aSnap = await getDocs(aq);
          if (!aSnap.empty) {
            const total = aSnap.size;
            const subQ = query(collection(db, 'assignment_submissions'), where('studentId', '==', student.id));
            const subSnap = await getDocs(subQ);
            setSubmissionPct(Math.min(100, Math.round((subSnap.size / total) * 100)));
          }
        } catch { /* graceful fail */ }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => unsubMaster();
  }, [student.id]);

  // Feedback listener
  useEffect(() => {
    if (activeTab !== 'Feedback' || !student.id) return;
    const q1 = query(collection(db, 'performance_feedback'), where('studentId', '==', student.id));
    const q2 = student.email
      ? query(collection(db, 'performance_feedback'), where('studentEmail', '==', student.email.toLowerCase()))
      : null;

    const process = (docs: any[]) => {
      const unique = Array.from(new Map(docs.map(d => [d.id, { id: d.id, ...d.data() }])).values());
      unique.sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setPastFeedbacks(unique);
    };
    const u1 = onSnapshot(q1, s => process(s.docs));
    const u2 = q2 ? onSnapshot(q2, s => process(s.docs)) : () => {};
    return () => { u1(); u2(); };
  }, [activeTab, student.id]);

  // Behaviour listener
  useEffect(() => {
    if (activeTab !== 'Behaviour' || !student.id) return;
    const q1 = query(collection(db, 'parent_notes'), where('studentId', '==', student.id));
    const q2 = student.email
      ? query(collection(db, 'parent_notes'), where('studentEmail', '==', student.email.toLowerCase()))
      : null;

    const process = (docs: any[]) => {
      const unique = Array.from(new Map(docs.map(d => [d.id, { id: d.id, ...d.data() }])).values());
      unique.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setPastBehaviours(unique);
    };
    const u1 = onSnapshot(q1, s => process(s.docs));
    const u2 = q2 ? onSnapshot(q2, s => process(s.docs)) : () => {};
    return () => { u1(); u2(); };
  }, [activeTab, student.id]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSaveFeedback = async () => {
    if (!feedbackContent.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'performance_feedback'), {
        studentId: student.id,
        studentEmail: student.email || '',
        studentName: student.name,
        teacherId: teacherData?.id || 'unknown',
        teacherName: teacherData?.name || 'Faculty',
        subject: student.className || 'General',
        content: feedbackContent.trim(),
        timestamp: serverTimestamp(),
      });
      setFeedbackContent('');
      alert('Feedback saved!');
    } catch (e) { console.error(e); }
    finally { setIsSubmitting(false); }
  };

  const handleSaveBehaviour = async () => {
    if (!positiveNote.trim() && !improvementNote.trim()) return;
    setIsSubmittingBehaviour(true);
    try {
      if (positiveNote.trim())
        await addDoc(collection(db, 'parent_notes'), {
          teacherId: teacherData?.id || 'unknown',
          teacherName: teacherData?.name || 'Faculty',
          studentId: student.id, studentEmail: student.email || '',
          studentName: student.name,
          parentName: `Parent of ${student.name}`,
          subject: student.className || 'General',
          content: positiveNote.trim(),
          category: 'positive', status: 'Sent', from: 'teacher',
          createdAt: serverTimestamp(),
        });

      if (improvementNote.trim())
        await addDoc(collection(db, 'parent_notes'), {
          teacherId: teacherData?.id || 'unknown',
          teacherName: teacherData?.name || 'Faculty',
          studentId: student.id, studentEmail: student.email || '',
          studentName: student.name,
          parentName: `Parent of ${student.name}`,
          subject: student.className || 'General',
          content: improvementNote.trim(),
          category: 'improvement', status: 'Sent', from: 'teacher',
          createdAt: serverTimestamp(),
        });

      const qEnroll = query(
        collection(db, 'enrollments'),
        where('studentId', '==', student.id),
        where('teacherId', '==', teacherData?.id)
      );
      const enrollSnap = await getDocs(qEnroll);
      if (!enrollSnap.empty)
        await updateDoc(doc(db, 'enrollments', enrollSnap.docs[0].id), {
          manualBehaviourRating: manualRating,
          lastBehaviourUpdate: serverTimestamp(),
        });

      setPositiveNote('');
      setImprovementNote('');
      alert('Behaviour note sent to Parent Dashboard!');
    } catch (e) { console.error(e); }
    finally { setIsSubmittingBehaviour(false); }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const overallTrend = (() => {
    if (allTests.length < 2) return null;
    const recent   = allTests.slice(0, Math.ceil(allTests.length / 2));
    const previous = allTests.slice(Math.ceil(allTests.length / 2));
    const recentAvg   = recent.reduce((s, t) => s + (t.percentage || 0), 0) / recent.length;
    const previousAvg = previous.reduce((s, t) => s + (t.percentage || 0), 0) / previous.length;
    return Number((recentAvg - previousAvg).toFixed(1));
  })();

  const getBarColor = (score: number) =>
    score >= 88 ? 'bg-emerald-500' : 'bg-[#1e3a8a]';

  const getConceptColor = (score: number) =>
    score >= 90 ? 'text-emerald-500' : score >= 80 ? 'text-amber-500' : score >= 70 ? 'text-orange-500' : 'text-red-500';

  const isAtRisk = avgPct < 50 || attPct < 75;

  const tabs = ['Overview', 'Academic', 'Attendance', 'Assignments', 'Concepts', 'Feedback', 'Behaviour'];

  // ─── Behaviour chart data ─────────────────────────────────────────────────
  const behaviourChartData = (() => {
    const months: Record<string, any> = {};
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth() - 4, 1);

    const rawJoin = masterProfile?.enrolledAt || masterProfile?.createdAt || student?.enrolledAt;
    if (rawJoin) {
      const jd = rawJoin.toDate ? rawJoin.toDate() : new Date(rawJoin);
      start = new Date(jd.getFullYear(), jd.getMonth(), 1);
    }

    let tmp = new Date(start);
    while (tmp <= now) {
      const key = tmp.toLocaleString('default', { month: 'short' }) + ' ' + tmp.getFullYear().toString().slice(-2);
      months[key] = { m: tmp.toLocaleString('default', { month: 'short' }), key, pos: 0, improv: 0, count: 0 };
      tmp.setMonth(tmp.getMonth() + 1);
    }

    pastBehaviours.forEach(n => {
      const d = n.createdAt?.toDate ? n.createdAt.toDate() : new Date();
      const key = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear().toString().slice(-2);
      if (months[key]) {
        if (n.category === 'positive') months[key].pos++;
        else months[key].improv++;
        months[key].count++;
      }
    });

    const curKey = now.toLocaleString('default', { month: 'short' }) + ' ' + now.getFullYear().toString().slice(-2);
    return Object.values(months).map((d: any) => ({
      m: d.m,
      score: d.count === 0
        ? 5.0
        : d.key === curKey && manualRating
          ? manualRating
          : Math.min(5, Math.max(1, 5 - d.improv * 0.3 + d.pos * 0.1)),
    }));
  })();

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in duration-300 text-left pb-20">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-[#1e3a8a] hover:border-[#1e3a8a] transition-colors shadow-sm"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-xl bg-[#1e3a8a] flex items-center justify-center text-white text-sm font-bold shadow-md select-none">
              {student.initials || student.name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mb-0.5">
                Student Profile
              </p>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{student.name}</h1>
              <p className="text-sm text-slate-500">
                Class {student.className}
                {student.rollNo ? ` • Roll: ${student.rollNo}` : ''}
                {student.email ? ` • ${student.email}` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4 md:mt-0">
          <button className="h-9 px-5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:border-slate-300 transition-colors shadow-sm flex items-center gap-2">
            <MessageSquare size={14} />
            Message
          </button>
          <button className="h-9 px-5 rounded-lg bg-[#1e3a8a] text-white text-sm font-medium hover:bg-[#1e40af] transition-colors shadow-sm flex items-center gap-2">
            <Phone size={14} />
            Contact Parent
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-0 border-b border-slate-200 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 pb-3 pt-1 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
              activeTab === t
                ? 'text-[#1e3a8a] border-[#1e3a8a]'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Left Column */}
          <div className="lg:col-span-4 space-y-4">

            {/* Personal Information */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Personal Information</h3>
              <div className="space-y-3">
                <InfoRow label="Full Name"      value={student.name} />
                <InfoRow label="Roll Number"    value={student.rollNo || '—'} />
                <InfoRow label="Class"          value={student.className || '—'} />
                <InfoRow
                  label="Date of Birth"
                  value={masterProfile?.dob
                    ? formatDOB(masterProfile.dob)
                    : '—'}
                />
                <InfoRow
                  label="Parent Contact"
                  value={masterProfile?.parentPhone || masterProfile?.contact || '—'}
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <StatBox value={`${attPct.toFixed(0)}%`} label="Attendance"   color="text-emerald-500" />
                <StatBox value={avgPct > 0 ? `${avgPct.toFixed(1)}%` : 'N/A'} label="Avg. Score" color="text-[#1e3a8a]" />
                <StatBox
                  value={submissionPct != null ? `${submissionPct}%` : 'N/A'}
                  label="Submission"
                  color="text-[#1e3a8a]"
                />
                <StatBox value={String(allTests.length)} label="Tests Taken" color="text-slate-700" />
              </div>
            </div>
          </div>

          {/* Middle Column — Academic Performance */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-800">Academic Performance</h3>
            </div>
            <p className="text-xs text-slate-400 mb-5">Last {recentTests.length} assessments</p>

            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            ) : recentTests.length > 0 ? (
              <div className="space-y-4">
                {recentTests.map((t, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm text-slate-600 truncate max-w-[70%]">{t.testName || `Test ${i + 1}`}</span>
                      <span className="text-sm font-semibold text-slate-800">{t.percentage?.toFixed(0) || 0}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getBarColor(t.percentage || 0)} rounded-full transition-all duration-700`}
                        style={{ width: `${t.percentage || 0}%` }}
                      />
                    </div>
                  </div>
                ))}

                {/* Overall Trend */}
                {overallTrend !== null && (
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                    <span className="text-sm text-slate-500">Overall Trend</span>
                    <span className={`text-sm font-semibold flex items-center gap-1 ${overallTrend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {overallTrend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {overallTrend >= 0 ? '+' : ''}{overallTrend}%
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                <BookOpen size={36} className="mb-2" />
                <p className="text-xs">No test records yet</p>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-3 space-y-4">

            {/* Recent Activity */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.map((act, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${act.dotColor}`} />
                    <div>
                      <p className="text-sm text-slate-700 font-medium leading-snug">{act.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{act.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Concept Mastery */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Concept Mastery</h3>
              {conceptMastery.length > 0 ? (
                <>
                  <div className="space-y-2.5">
                    {conceptMastery.map((c, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">{c.name}</span>
                        <span className={`text-sm font-semibold ${getConceptColor(c.score)}`}>{c.score}%</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('Concepts')}
                    className="w-full mt-4 h-8 rounded-lg border border-slate-200 text-xs font-medium text-[#1e3a8a] hover:bg-blue-50 transition-colors"
                  >
                    View Full Analysis
                  </button>
                </>
              ) : (
                <p className="text-xs text-slate-400 text-center py-3">No concepts tracked yet</p>
              )}
            </div>

            {/* Risk Alert */}
            {isAtRisk ? (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={14} className="text-red-500" />
                  <h4 className="text-sm font-semibold text-red-700">Risk Alert</h4>
                </div>
                <p className="text-xs text-red-600">
                  {avgPct < 50 ? 'Low academic performance. ' : ''}
                  {attPct < 75 ? 'Attendance below threshold.' : ''}
                </p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <h4 className="text-sm font-semibold text-emerald-700">No Risk Alerts</h4>
                </div>
                <p className="text-xs text-emerald-600">Student is performing well across all metrics.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ACADEMIC TAB ── */}
      {activeTab === 'Academic' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">All Test Scores</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
            </div>
          ) : allTests.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Test Name</th>
                  <th className="text-left px-5 py-3 font-medium">Subject</th>
                  <th className="text-left px-5 py-3 font-medium">Score</th>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allTests.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-700 font-medium">{t.testName || 'Assessment'}</td>
                    <td className="px-5 py-3 text-slate-500">{t.subject || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`font-semibold ${(t.percentage || 0) >= 75 ? 'text-emerald-600' : (t.percentage || 0) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {t.percentage?.toFixed(0) || 0}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {t.timestamp ? new Date(t.timestamp.seconds * 1000).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-slate-300">
              <BookOpen size={32} className="mb-2" />
              <p className="text-xs">No test records found</p>
            </div>
          )}
        </div>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {activeTab === 'Attendance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
            <p className={`text-4xl font-bold mb-1 ${attPct >= 85 ? 'text-emerald-500' : attPct >= 75 ? 'text-amber-500' : 'text-red-500'}`}>
              {attPct.toFixed(0)}%
            </p>
            <p className="text-sm text-slate-500">Overall Attendance</p>
          </div>
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-center text-slate-400 text-sm">
            Detailed attendance records will appear here as data is recorded.
          </div>
        </div>
      )}

      {/* ── ASSIGNMENTS TAB ── */}
      {activeTab === 'Assignments' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
            <p className={`text-4xl font-bold mb-1 text-[#1e3a8a]`}>
              {submissionPct != null ? `${submissionPct}%` : 'N/A'}
            </p>
            <p className="text-sm text-slate-500">Submission Rate</p>
          </div>
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-center text-slate-400 text-sm">
            Assignment submission history will appear here.
          </div>
        </div>
      )}

      {/* ── CONCEPTS TAB ── */}
      {activeTab === 'Concepts' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-5">Concept Mastery Analysis</h3>
          {conceptMastery.length > 0 ? (
            <div className="space-y-5">
              {conceptMastery.map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm text-slate-700 font-medium">{c.name}</span>
                    <span className={`text-sm font-semibold ${getConceptColor(c.score)}`}>{c.score}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        c.score >= 90 ? 'bg-emerald-500' : c.score >= 80 ? 'bg-amber-500' : c.score >= 70 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${c.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-slate-300">
              <Activity size={32} className="mb-2" />
              <p className="text-xs">No concept data available yet</p>
            </div>
          )}
        </div>
      )}

      {/* ── FEEDBACK TAB ── */}
      {activeTab === 'Feedback' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Write Growth Feedback</h3>
            <textarea
              value={feedbackContent}
              onChange={e => setFeedbackContent(e.target.value)}
              placeholder="Enter feedback for this student..."
              className="w-full h-48 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all mb-4 placeholder:text-slate-400"
            />
            <button
              onClick={handleSaveFeedback}
              disabled={isSubmitting || !feedbackContent.trim()}
              className="w-full h-10 bg-[#1e3a8a] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#1e40af] disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Star size={15} />}
              Send Feedback
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Past Feedback</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {pastFeedbacks.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No past feedback yet</p>
              ) : pastFeedbacks.map((fb, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-sm text-slate-700 leading-relaxed mb-2">"{fb.content}"</p>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{fb.subject} • {fb.teacherName}</span>
                    <span>{fb.timestamp?.toDate ? fb.timestamp.toDate().toLocaleDateString() : 'Syncing...'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── BEHAVIOUR TAB ── */}
      {activeTab === 'Behaviour' && (() => {
        const pNotes = pastBehaviours.filter(b => b.category === 'positive');
        const iNotes = pastBehaviours.filter(b => b.category === 'improvement');
        const calcRating = pastBehaviours.length === 0
          ? 5.0
          : Math.min(5, Math.max(1, 5 - iNotes.length * 0.3 + pNotes.length * 0.1));
        const finalRating = manualRating || calcRating;

        return (
          <div className="space-y-5">
            {/* Rating */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Star size={18} className="text-amber-400" fill="currentColor" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Behaviour Rating</p>
                  <p className="text-xs text-slate-400">{manualRating ? 'Manual override active' : 'Auto-calculated'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setManualRating(star)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                      finalRating >= star
                        ? 'bg-amber-400 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Star size={16} fill={finalRating >= star ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            {/* Notes inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy size={15} className="text-emerald-500" />
                  <p className="text-sm font-semibold text-slate-700">Positive Highlights</p>
                </div>
                <textarea
                  value={positiveNote}
                  onChange={e => setPositiveNote(e.target.value)}
                  placeholder="e.g. Highly engaged in group project..."
                  className="w-full h-36 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 transition-all placeholder:text-slate-400"
                />
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={15} className="text-amber-500" />
                  <p className="text-sm font-semibold text-slate-700">Areas for Improvement</p>
                </div>
                <textarea
                  value={improvementNote}
                  onChange={e => setImprovementNote(e.target.value)}
                  placeholder="e.g. Needs more focus during labs..."
                  className="w-full h-36 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-300 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              onClick={handleSaveBehaviour}
              disabled={isSubmittingBehaviour || (!positiveNote.trim() && !improvementNote.trim())}
              className="w-full h-10 bg-slate-800 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-900 disabled:opacity-50 transition-colors"
            >
              {isSubmittingBehaviour ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              Send to Parent Dashboard
            </button>

            {/* Behaviour Chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Behaviour Trend</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={behaviourChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis domain={[1, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} fill="url(#bGrad)" dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Behaviour history */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Behaviour History</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {pastBehaviours.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No notes yet</p>
                ) : pastBehaviours.map((b, i) => {
                  const isNeg = b.category === 'improvement';
                  return (
                    <div key={i} className={`flex gap-3 items-start p-3 rounded-lg ${isNeg ? 'bg-amber-50 border border-amber-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                      <div className={`mt-0.5 ${isNeg ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {isNeg ? <AlertTriangle size={14} /> : <Trophy size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 leading-relaxed">"{b.content}"</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {b.createdAt?.toDate ? b.createdAt.toDate().toLocaleDateString() : 'Syncing...'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-800 text-right">{value}</span>
    </div>
  );
}

function StatBox({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
      <p className={`text-2xl font-bold ${color} leading-none mb-1`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

// ─── Utility Functions ────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function formatDOB(dob: any): string {
  if (!dob) return '—';
  try {
    if (dob.toDate) return dob.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const d = new Date(dob);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { /* ignore */ }
  return String(dob);
}
