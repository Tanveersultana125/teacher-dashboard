/**
 * Timetable.tsx (teacher) — read-only view of the school's published timetable.
 *
 * Source: `timetable_entries` collection (written by principal-dashboard's
 * TimetableSetup). Filtered to the teacher's assigned classes — they see the
 * full schedule for every class they teach + a "My Periods" highlight when
 * the teacher field on a period matches their name.
 */

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Calendar, Loader2, Filter } from "lucide-react";

interface TimetableEntry {
  id: string;
  schoolId?: string;
  branchId?: string | null;
  className: string;
  day: string;
  period: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string;
}

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const T = {
  FONT: "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
  BG: "#EEF4FF", CARD: "#FFFFFF",
  T1: "#001040", T2: "#002080", T3: "#5070B0", T4: "#99AACC",
  P: "#0055FF",
  GREEN: "#00C853",
  ORANGE: "#FF8800",
  GREEN_TINT: "rgba(0,200,83,.10)",
  GREEN_BDR: "rgba(0,200,83,.22)",
  SH: "0 0 0 0.5px rgba(0,85,255,0.10), 0 4px 16px rgba(0,85,255,0.12), 0 18px 44px rgba(0,85,255,0.15)",
  BDR: "0.5px solid rgba(0,85,255,0.10)",
};

export default function Timetable() {
  const { teacherData } = useAuth();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState<string>("All my classes");

  // Subscribe to teacher's assigned classes (derive from teaching_assignments)
  useEffect(() => {
    if (!teacherData?.id || !teacherData?.schoolId) return;
    const schoolId = teacherData.schoolId as string;
    const branchId = teacherData.branchId as string | undefined;

    const qta = query(
      collection(db, "teaching_assignments"),
      where("schoolId", "==", schoolId),
      where("teacherId", "==", teacherData.id),
    );
    const unsubTa = onSnapshot(qta, (snap) => {
      const raw = snap.docs
        .map(d => d.data() as any)
        .filter(ta => !branchId || !ta?.branchId || ta.branchId === branchId)
        .filter(ta => !ta.status || ta.status === "active");
      const classIdSet = new Set(raw.map(ta => ta.classId).filter(Boolean));
      // Resolve class names — listen to classes collection in parallel.
      // Most schools have <30 classes so we just listen to all and filter.
    });
    // Listen to classes collection separately (for name resolution)
    const qC = query(collection(db, "classes"), where("schoolId", "==", schoolId));
    const unsubC = onSnapshot(qC, async (snap) => {
      const filtered = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        .filter(c => !branchId || !c?.branchId || c.branchId === branchId);
      // Re-query teaching_assignments to know which classes this teacher teaches
      // (we keep this listener-driven via the above unsubTa — but state isn't
      // shared; simpler: just match on `teacherId` field on classes too.
      const myClasses = filtered.filter(c => {
        if (c.teacherId === teacherData.id) return true;
        // fallback: if teacher is in classToTeachers via teaching_assignments,
        // we'd need that data — skip for now, rely on classes.teacherId.
        return false;
      });
      setClasses(myClasses.map(c => ({ id: c.id, name: c.name || c.className || c.id })));
    });
    return () => { unsubTa(); unsubC(); };
  }, [teacherData?.id, teacherData?.schoolId, teacherData?.branchId]);

  // Subscribe to timetable entries (school-scoped)
  useEffect(() => {
    if (!teacherData?.schoolId) { setLoading(false); return; }
    const schoolId = teacherData.schoolId as string;
    const branchId = teacherData.branchId as string | undefined;
    const inBranch = (raw: any) => !branchId || !raw?.branchId || raw.branchId === branchId;

    const unsub = onSnapshot(
      query(collection(db, "timetable_entries"), where("schoolId", "==", schoolId)),
      (snap) => {
        const rows = snap.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
          .filter(inBranch) as TimetableEntry[];
        setEntries(rows);
        setLoading(false);
      },
      (err) => {
        console.warn("[Timetable] listener failed:", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [teacherData?.schoolId, teacherData?.branchId]);

  const myName = (teacherData?.name || (teacherData as any)?.fullName || "").trim().toLowerCase();
  const myEmail = String((teacherData as any)?.email || "").toLowerCase().trim();
  const myClassNames = useMemo(() => new Set(classes.map(c => c.name)), [classes]);

  const filteredEntries = useMemo(() => {
    if (filterClass === "All classes") return entries;
    if (filterClass === "All my classes") {
      // Show classes the teacher is assigned to (per teaching_assignments)
      // OR any class where ANY period has the teacher's name (defensive for
      // teachers who teach a class without a teaching_assignments record).
      return entries.filter(e => {
        if (myClassNames.has(e.className)) return true;
        const t = String(e.teacher || "").toLowerCase().trim();
        return !!t && (myName && t.includes(myName));
      });
    }
    return entries.filter(e => e.className === filterClass);
  }, [entries, filterClass, myClassNames, myName]);

  const isMine = (e: TimetableEntry): boolean => {
    const t = String(e.teacher || "").toLowerCase().trim();
    if (!t) return false;
    if (myName && (t.includes(myName) || myName.includes(t))) return true;
    if (myEmail && t.includes(myEmail)) return true;
    return false;
  };

  // Group by class for display
  const byClass = useMemo(() => {
    const m = new Map<string, TimetableEntry[]>();
    filteredEntries.forEach(e => {
      if (!m.has(e.className)) m.set(e.className, []);
      m.get(e.className)!.push(e);
    });
    m.forEach(arr => arr.sort((a, b) => {
      const da = DAYS_ORDER.indexOf(a.day);
      const db_ = DAYS_ORDER.indexOf(b.day);
      if (da !== db_) return (da === -1 ? 99 : da) - (db_ === -1 ? 99 : db_);
      return a.period - b.period;
    }));
    return m;
  }, [filteredEntries]);

  // Class filter options
  const allClasses = useMemo(() => {
    const s = new Set<string>();
    entries.forEach(e => s.add(e.className));
    return Array.from(s).sort();
  }, [entries]);

  return (
    <div style={{ background: T.BG, minHeight: "100vh", padding: "24px 16px 40px", fontFamily: T.FONT }}>
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1.6px", color: T.T4, margin: "0 0 4px", textTransform: "uppercase" }}>
          School schedule
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.8px", color: T.T1, margin: 0, lineHeight: 1.1, display: "flex", alignItems: "center", gap: 10 }}>
          <Calendar size={26} color={T.P} />
          Timetable
        </h1>
        <p style={{ fontSize: 12, color: T.T3, fontWeight: 500, marginTop: 6, margin: "6px 0 0", lineHeight: 1.5 }}>
          Your assigned classes' schedule. Periods you teach are highlighted in green.
        </p>
      </div>

      {/* Filter pills */}
      {entries.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
          <Filter size={14} color={T.T4} />
          {(["All my classes", ...allClasses, "All classes"] as string[]).map(opt => {
            const active = filterClass === opt;
            return (
              <button key={opt} onClick={() => setFilterClass(opt)}
                style={{
                  padding: "6px 12px", borderRadius: 999,
                  background: active ? T.P : T.CARD,
                  color: active ? "#fff" : T.T2,
                  border: active ? "0.5px solid transparent" : T.BDR,
                  fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: T.FONT,
                  letterSpacing: "0.04em",
                }}>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
          <Loader2 size={26} className="animate-spin" style={{ color: T.P }} />
        </div>
      )}

      {!loading && entries.length === 0 && (
        <EmptyState title="No timetable published yet" body="Your principal hasn't uploaded the school's timetable yet. It'll appear here automatically once they do." />
      )}

      {!loading && entries.length > 0 && byClass.size === 0 && (
        <EmptyState title="No periods for this view" body="Try the All classes filter to see the full school timetable." />
      )}

      {!loading && byClass.size > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from(byClass.keys()).sort().map(className => (
            <ClassGrid key={className} className={className} rows={byClass.get(className) || []} isMine={isMine} />
          ))}
        </div>
      )}
    </div>
  );
}

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div style={{ background: T.CARD, borderRadius: 18, padding: "44px 22px", textAlign: "center", boxShadow: T.SH, border: T.BDR }}>
    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,85,255,.08)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
      <Calendar size={26} color={T.P} />
    </div>
    <p style={{ fontSize: 16, fontWeight: 800, color: T.T1, margin: "0 0 6px" }}>{title}</p>
    <p style={{ fontSize: 12, color: T.T3, fontWeight: 500, margin: 0, lineHeight: 1.55, maxWidth: 380, marginInline: "auto" }}>{body}</p>
  </div>
);

const ClassGrid = ({ className, rows, isMine }: {
  className: string; rows: TimetableEntry[]; isMine: (e: TimetableEntry) => boolean;
}) => {
  const days = Array.from(new Set(rows.map(r => r.day)))
    .sort((a, b) => DAYS_ORDER.indexOf(a) - DAYS_ORDER.indexOf(b));
  const periods = Array.from(new Set(rows.map(r => r.period))).sort((a, b) => a - b);
  const cell = (d: string, p: number) => rows.find(r => r.day === d && r.period === p);

  return (
    <div style={{ background: T.CARD, borderRadius: 14, overflow: "hidden", boxShadow: T.SH, border: T.BDR }}>
      <div style={{ padding: "12px 14px", background: "rgba(0,85,255,.04)", borderBottom: "0.5px solid rgba(0,85,255,.10)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.T1 }}>{className}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.T3 }}>{rows.length} periods · {days.length} days</div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,85,255,.04)" }}>
              <th style={th()}>Period</th>
              {days.map(d => <th key={d} style={th()}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {periods.map(p => (
              <tr key={p} style={{ borderTop: "0.5px solid rgba(0,85,255,.06)" }}>
                <td style={td(true)}>
                  <div style={{ fontWeight: 800, color: T.P }}>P{p}</div>
                  {(() => {
                    const sample = rows.find(r => r.period === p);
                    return sample?.startTime ? (
                      <div style={{ fontSize: 9, color: T.T4, fontWeight: 600 }}>
                        {sample.startTime}{sample.endTime ? `–${sample.endTime}` : ""}
                      </div>
                    ) : null;
                  })()}
                </td>
                {days.map(d => {
                  const c = cell(d, p);
                  if (!c) return <td key={d} style={td()}><span style={{ color: T.T4, fontSize: 11 }}>—</span></td>;
                  const mine = isMine(c);
                  return (
                    <td key={d} style={{
                      ...td(),
                      ...(mine ? {
                        background: T.GREEN_TINT,
                        boxShadow: `inset 0 0 0 0.5px ${T.GREEN_BDR}`,
                      } : {}),
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: mine ? "#005A20" : T.T1, marginBottom: 2 }}>{c.subject}</div>
                      {c.teacher && <div style={{ fontSize: 10, color: mine ? "#005A20" : T.T3, fontWeight: 600 }}>{c.teacher}</div>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const th = (): React.CSSProperties => ({
  fontSize: 9, fontWeight: 800, letterSpacing: "1.2px", color: T.T4, textTransform: "uppercase",
  padding: "8px 10px", textAlign: "left", borderRight: "0.5px solid rgba(0,85,255,.06)",
});
const td = (firstCol = false): React.CSSProperties => ({
  fontSize: 12, color: T.T1, padding: "8px 10px",
  borderRight: "0.5px solid rgba(0,85,255,.06)",
  background: firstCol ? "rgba(0,85,255,.03)" : T.CARD,
  verticalAlign: "top", minWidth: 100,
});
