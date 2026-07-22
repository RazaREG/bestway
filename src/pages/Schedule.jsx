import React, { useMemo, useState } from 'react';
// import { localSupabase } from '../localStorage';
import { supabase } from '../supabaseClient';
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { isAdminOrSubAdmin, getCrewRoleIds, userBelongsToCrew } from "../roles";
import { useActionLock } from "../hooks/useActionLock";

/* ---------- Auth helper: returns the current user ----------
   undefined = loading, null = not signed in, object = user
*/
function useUser() {
  const [user, setUser] = React.useState(undefined);
  React.useEffect(() => {
    let mounted = true;
    const stored = localStorage.getItem("user");
    if (mounted) setUser(stored ? JSON.parse(stored) : null);
    return () => { mounted = false; };
  }, []);
  return user;
}

/* ---------- Date/time helpers ---------- */
function useWeek() {
  const today = new Date();
  const day = today.getDay();
  const start = new Date(today);
  start.setDate(today.getDate() - day + 1); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function formatDay(d) { return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
function blockTopPx(start) { const [h,m] = start.split(':').map(Number); return ((h-8)*60 + m) * 0.5; }
function blockHeightPx(durationMin) { return durationMin * 0.5; }

/* ---------- UI helpers ---------- */
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' };
const cardHeader = { padding: 16, borderBottom: '1px solid #e5e7eb', background: '#fafafa' };
const badge = { padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: '1px solid #d1d5db' };
const btn = { padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' };
const btnSmall = { padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 12 };
const btnPrimary = { ...btn, background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 500 };
const inputStyle = { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 };
const labelStyle = { fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 };
const modalBackdrop = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modal = { background: '#fff', borderRadius: 12, padding: 24, width: '90vw', maxWidth: 600, maxHeight: '90vh', overflow: 'auto' };

function LabeledInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <input type={type} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

function LabeledSelect({ label, value, onChange, options }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <select value={value} onChange={(e)=>onChange(e.target.value)} style={inputStyle}>
        <option value="">Select...</option>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

export default function Schedule() {
  const user = useUser();
  const [loading, setLoading] = useState(true);
  const [crews, setCrews] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', address: '' });
  const [cancellingJob, setCancellingJob] = React.useState(null);
  const [cancelRemark, setCancelRemark] = React.useState("");
  const [users, setUsers] = React.useState([]);

  const navigate = useNavigate();

  const [step, setStep] = React.useState(1);
  const [assignedUsers, setAssignedUsers] = React.useState([]);

  const [assignedWorkers, setAssignedWorkers] = useState([]); // for normal workers
  const [leadWorkers, setLeadWorkers] = useState([]);
  const [toast, setToast] = useState(null);
  const { run: runLocked, isLocked } = useActionLock();

  const [weekOffset, setWeekOffset] = useState(0);
  const days = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const todayIdx = days.findIndex(
    d => d.toDateString() === new Date().toDateString()
  );

  React.useEffect(() => {
    async function loadUsers() {
      const { data, error } = await supabase
        .from("app_users")
        .select("id, email, role, role_id, roles");

      if (error) {
        console.error("Users load error:", error);
        return;
      }

      setUsers(data || []);
    }

    loadUsers();
  }, []);

  const [draft, setDraft] = useState({
    customerId: null,
    jobType: 'spray_foam',
    crewId: null,
    dayIdx: todayIdx,
    start_date: formatDateToYMD(days[todayIdx >= 0 ? todayIdx : 0]),
    start: '08:00',
    durationMin: 180,
    area: 'Attic',
    sqft: '1000',
    thicknessIn: '3.5',
    rValue: '50',
    product: 'Elastochem Extreme',
    crewType: '',
    notes: '',
    options: { topUp: false, baffles: 10, perimeterBatts: true, vaporBarrier: 'Poly 6mil' }
  });

  // Time blocks for the calendar
  const blocks = useMemo(() => {
    const result = [];
    for (let h = 8; h < 18; h++) {
      result.push({ label: `${h}:00` });
    }
    return result;
  }, []);

  // Load crews, customers, and this user's jobs for the week
  React.useEffect(() => {
  if (user === undefined) return; // Wait until user loads

  (async () => {
    setLoading(true);
    const userData = JSON.parse(localStorage.getItem("user"));
    try {
      // Base query
      let jobsQuery = supabase.from("jobs").select("*");

      if (!isAdminOrSubAdmin(userData)) {
        const crewIds = getCrewRoleIds(userData);
        if (crewIds.length === 1) {
          jobsQuery = jobsQuery.eq("crew_id", crewIds[0]);
        } else if (crewIds.length > 1) {
          jobsQuery = jobsQuery.in("crew_id", crewIds);
        }
      }

      // Fetch all in parallel
      const [{ data: c1 }, { data: c2 }, { data: j, error: je }] =
        await Promise.all([
          supabase
            .from("crews")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase
            .from("customers")
            .select("*")
            .order("created_at", { ascending: false }),

          jobsQuery,
        ]);

      if (je) console.error("Jobs fetch error:", je.message);

      /* ------------------------------
          WEEK RANGE FILTER (FIX)
      ------------------------------ */
      const today = new Date();
      const startOfWeek = new Date(days[0]);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(days[6]);
      endOfWeek.setHours(23, 59, 59, 999);

      // Keep only jobs whose start_date is inside THIS WEEK
      const weekJobs = (j || []).filter((jb) => {
        if (!jb.start_date) return false;

        const jobDate = new Date(`${jb.start_date}T12:00:00`);
        const startOfWeek = new Date(days[0]);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(days[6]);
        endOfWeek.setHours(23, 59, 59, 999);

        return jobDate >= startOfWeek && jobDate <= endOfWeek;
      });

      // Save UI-converted jobs
      setJobs(weekJobs.map(job => dbToUi(job, days)));

      // Prefill draft
      if ((c1?.length || 0) > 0)
        setDraft((d) => ({ ...d, crewId: c1[0].id }));

      if ((c2?.length || 0) > 0)
        setDraft((d) => ({ ...d, customerId: c2[0].id }));

      setCrews(c1 || []);
      setCustomers(c2 || []);
    } catch (err) {
      console.error("Failed to load schedule:", err);
      alert("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  })();
}, [user, days]);

  function getCanadaCreatedAt() {
    return new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "America/Toronto",
      })
    );
  }
  
  async function addJob({ leadWorkers = [], assignedWorkers = [] } = {}) {
    if (leadWorkers.length === 0) return alert('Select at least one lead');
    // if (assignedWorkers.length === 0) return alert('Select at least one worker');

    // 1️⃣ Create job first
    const jobPayload = {
      ...uiToDb(draft),
      created_by: user.id,
      created_at: getCanadaCreatedAt(),
    };

    // return;

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert(jobPayload)
      .select()
      .single();

    if (jobError) return alert(`Error creating job: ${jobError.message}`);

    const uniqueUserIds = [...new Set([...leadWorkers, ...assignedWorkers])];

    const assignments = uniqueUserIds.map(uid => ({
      job_id: job.id,
      user_id: uid,
      role: leadWorkers.includes(uid) ? 'lead' : 'worker'
    }));

    const { error: assignError } = await supabase
      .from('job_assignments')
      .insert(assignments);

    if (assignError) return alert(`Error assigning users: ${assignError.message}`);

    // 3️⃣ Update state
    setJobs(prev => [...prev, dbToUi(job)]);

    setToast("Job created successfully 🎉");

    setModalOpen(false);
    setEditingJob(null);

    setTimeout(() => setToast(null), 3000);
  }

  async function updateJobStatus(jobId, status, remarks = null) {
    return runLocked(`status-${jobId}-${status}`, async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const { error } = await supabase
          .from("jobs")
          .update({
            status,
            status_updated_by: user.id,
            remarks: remarks,
          })
          .eq("id", jobId);

        await loadJobs();
        setCancelRemark("");
        setCancellingJob(null);
        if (error) throw error;
      } catch (err) {
        setCancelRemark("");
        setCancellingJob(null);
        // alert(err.message || err);
      }
    });
  }

  async function updateJob({ leadWorkers = [], assignedWorkers = [] } = {}) {
    if (!draft.customerId || !draft.crewId) return alert('Select customer and crew');
    if (leadWorkers.length === 0) return alert('Select at least one lead');
    // if (assignedWorkers.length === 0) return alert('Select at least one worker');

    const user = JSON.parse(localStorage.getItem("user"));

    // 1️⃣ Update job details
    const payload = { ...uiToDb(draft), created_by: user.id };
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .update(payload)
      .eq('id', editingJob.id)
      .select()
      .single();

    if (jobError) {
      alert(`Error updating job: ${jobError.message}`);
      return;
    }

    // 2️⃣ Update assignments
    // Delete existing assignments first
    const { error: deleteError } = await supabase
      .from('job_assignments')
      .delete()
      .eq('job_id', editingJob.id);

    if (deleteError) {
      alert(`Error clearing previous assignments: ${deleteError.message}`);
      return;
    }

    // Insert new assignments
    const assignments = [
      ...leadWorkers.map(uid => ({ job_id: editingJob.id, user_id: uid, role: 'lead' })),
      ...assignedWorkers.map(uid => ({ job_id: editingJob.id, user_id: uid, role: 'worker' }))
    ];

    const { error: assignError } = await supabase
      .from('job_assignments')
      .insert(assignments);

    if (assignError) {
      alert(`Error assigning users: ${assignError.message}`);
      return;
    }

    // 3️⃣ Update state
    setJobs(prev => prev.map(job => job.id === editingJob.id ? dbToUi(jobData) : job));
    setModalOpen(false);
    setEditingJob(null);
  }

  async function deleteJob(jobId) {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      // 1️⃣ Delete assignments explicitly (optional if ON DELETE CASCADE is set)
      const { error: assignError } = await supabase
        .from('job_assignments')
        .delete()
        .eq('job_id', jobId);

      if (assignError) throw assignError;

      // 2️⃣ Delete the job itself
      const { error: jobError } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      if (jobError) throw jobError;

      // 3️⃣ Update UI
      setJobs(prev => prev.filter(job => job.id !== jobId));
      alert('Job deleted successfully!');
      return true;
    } catch (err) {
      alert(`Error deleting job: ${err.message}`);
      return false;
    }
  }

  async function editJob(job) {
    setEditingJob(job);

    // 1️⃣ Load existing assignments
    const { data: assignments, error } = await supabase
      .from("job_assignments")
      .select("user_id, role")
      .eq("job_id", job.id);

    if (error) {
      console.error("Failed to load job assignments", error);
    }

    // 2️⃣ Separate leads & workers
    const leads = assignments
      ?.filter(a => a.role === "lead")
      .map(a => a.user_id) || [];

    const workers = assignments
      ?.filter(a => a.role === "worker")
      .map(a => a.user_id) || [];

    // 3️⃣ Set checkbox state BEFORE opening modal
    setLeadWorkers(leads);
    setAssignedWorkers(workers);

    // 4️⃣ Set job draft
    setDraft({
      customerId: job.customerId,
      jobType: job.jobType,
      crewId: job.crewId,
      dayIdx: job.dayIdx,
      start_date: job.start_date,
      start: job.start,
      durationMin: job.durationMin,
      area: job.area,
      sqft: job.sqft,
      thicknessIn: job.thicknessIn,
      rValue: job.rValue,
      product: job.product,
      notes: job.notes,
      options: job.options,
    });

    // 5️⃣ Open modal
    setModalOpen(true);
  }

  function formatDateToYMD(date) {
    const canadaDate = new Date(
      date.toLocaleString("en-US", { timeZone: "America/Toronto" })
    );
    const year = canadaDate.getFullYear();
    const month = String(canadaDate.getMonth() + 1).padStart(2, "0");
    const day = String(canadaDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function newJob() {
    resetJobModal();
    
    const dayIdx = typeof draft.dayIdx === "number" ? draft.dayIdx : 0;
    const startDate = days[dayIdx];

    // Preserve the currently-selected day (from draft) when opening the "Schedule New Job" modal.
    // Also prefer existing draft crew/customer if available, otherwise fall back to first crew/customer.
    setEditingJob(null);
    setDraft(prev => {
      const firstCrew = crews[0] || {};
      const firstCustomer = customers[0] || {};
      return {
        customerId: prev.customerId || firstCustomer.id || null,
        crewId: prev.crewId || firstCrew.id || null,
        jobType: prev.jobType || firstCrew.job_type || 'spray_foam', // fallback
        crewType: prev.crewType || firstCrew.name || null,
        dayIdx: (typeof prev.dayIdx === 'number' ? prev.dayIdx : 0),
        start_date: formatDateToYMD(startDate),
        start: prev.start || '08:00',
        durationMin: prev.durationMin || 180,
        area: prev.area || 'Attic',
        sqft: prev.sqft || '1000',
        thicknessIn: prev.thicknessIn || '3.5',
        rValue: prev.rValue || '50',
        product: prev.product || 'Elastochem Extreme',
        notes: prev.notes || '',
        options: prev.options || { topUp: false, baffles: 10, perimeterBatts: true, vaporBarrier: 'Poly 6mil' }
      };
    });
    setModalOpen(true);
  }

  function resetJobModal() {
    setEditingJob(null);

    setDraft({
      customerId: null,
      crewId: null,
      jobType: null,
      crewType: null,
      dayIdx: draft.dayIdx,
      start_date: null,
      start: "",
      durationMin: 0,
      area: "",
      sqft: "",
      thicknessIn: "",
      rValue: "",
      product: "",
      notes: "",
      options: {},
    });

    setLeadWorkers([]);
    setAssignedWorkers([]);
    setStep(1);
  }


  async function addCustomer() {
    if (!newCustomer.name.trim()) return alert('Enter customer name');
    const { data, error } = await supabase
      .from('customers')
      .insert(newCustomer)
      .select()
      .single();
    if (error) {
      alert(`Error creating customer: ${error.message}`);
      return;
    }
    setCustomers(prev => [...prev, data]);
    setDraft(d => ({
      ...d,
      customerId: data.id
    }));
    setShowCustomerModal(false);
    setNewCustomer({ name: '', address: '' });
  }

  function jobsFor(dayIdx, crewId){ return jobs.filter(j => j.dayIdx===dayIdx && j.crewId===crewId); }
  // Debug user info
  React.useEffect(() => {
      if (user?.role) {
          console.log('Current user:', user);
      }
  }, [user?.role]);
  React.useEffect(() => {
    if (modalOpen) {
      setStep(1);
      setAssignedUsers([]);
    }
  }, [modalOpen]);
  // Wait for user to resolve (Protected route ensures not null)
  if (user === undefined) return <div style={{ padding:24 }}>Loading…</div>;
  if (loading) return <div style={{ padding:24 }}>Loading schedule…</div>;
  const activeDayIdx =  typeof draft.dayIdx === "number" ? draft.dayIdx : todayIdx;

  return (
    <div
      className="schedule-page"
      style={{ padding: 16, background: 'linear-gradient(135deg, #0f172a, #1e293b)', minHeight: 'calc(100vh - 60px)' }}
    >
      <style>
        {`
          .schedule-page .back-btn {
            width: 44px;
            height: 44px;
            border: 1px solid rgba(255,255,255,.16);
            background: rgba(255,255,255,.1);
            color: #fff;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all .25s ease;
            margin-bottom: 18px;
            cursor: pointer;
            padding: 0;
          }

          .schedule-page .back-btn:hover {
            transform: translateX(-3px);
            background: rgba(255,255,255,.18);
          }
        `}
      </style>

      <button
        type="button"
        className="back-btn"
        onClick={() => navigate("/dashboard")}
        aria-label="Back to dashboard"
      >
        <FiArrowLeft size={20} />
      </button>
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize: 24, margin: 0, fontWeight: 600, color: '#1f2937' }}></h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>
            Week of {days[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button onClick={newJob} style={btnPrimary}>
          <span style={{ marginRight: 8 }}>+</span> New Job
        </button>
      </header>

      {/* Calendar at the top */}
        <div style={card}>
          <div style={cardHeader}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <div style={{ fontWeight:600, fontSize: 16 }}>
                Weekly Schedule
              </div>
            </div>
            <br />
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {days.map((d, i) => {
                const today = new Date();
                today.setHours(0,0,0,0);
                const isPast =
                  weekOffset === 0 && d < today; // only block past in current week
                return (
                  <span
                    key={i}
                    onClick={() => {
                      if (isPast) return;

                      setDraft(prev => ({
                        ...prev,
                        dayIdx: i,
                        start_date: formatDateToYMD(d)
                      }));
                    }}
                    style={{
                      ...badge,
                      background: i===todayIdx ? '#3b82f6'
                        : i===draft.dayIdx ? '#10b981'
                        : '#fff',
                      color: isPast
                        ? '#9ca3af'
                        : i===todayIdx || i===draft.dayIdx
                        ? '#fff'
                        : '#374151',
                      borderColor: i===todayIdx ? '#3b82f6'
                        : i===draft.dayIdx ? '#10b981'
                        : '#d1d5db',
                      fontWeight: (i===todayIdx || i===draft.dayIdx) ? 600 : 400,
                      cursor: isPast ? "not-allowed" : "pointer",
                      opacity: isPast ? 0.5 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {formatDay(d)}
                  </span>
                );
              })}
            </div>
            <br />
            <div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button
                  style={btnSmall}
                  disabled={weekOffset === 0}
                  onClick={() => setWeekOffset(prev => prev - 1)}
                >
                  ← Prev
                </button>
                <button
                  style={btnSmall}
                  onClick={() => {
                    setWeekOffset(prev => prev + 1);

                    const nextWeekFirstDay = new Date(days[0]);
                    nextWeekFirstDay.setDate(nextWeekFirstDay.getDate() + 7);

                    setDraft(prev => ({
                      ...prev,
                      dayIdx: 0,
                      start_date: formatDateToYMD(nextWeekFirstDay)
                    }));
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

          <div style={{ overflowX:'auto' }}>
            <div style={{ minWidth: 900 }}>
              {/* header row */}
              <div style={{ display:'grid', gridTemplateColumns: `100px repeat(${crews.length}, 1fr)` }}>
                <div style={{ padding:8, fontSize:12, color:'#666' }}>Time</div>
                {crews.map(c => <div key={c.id} style={{ padding:8, fontSize:12, fontWeight:600 }}>{c.name}</div>)}
              </div>

              {/* grid rows */}
              <div style={{ position:'relative', borderTop:'1px solid #eee' }}>
                {/* {blocks.map((b,i)=>(
                  <div key={i} style={{ display:'grid', gridTemplateColumns: `100px repeat(${crews.length}, 1fr)` }}>
                    <div style={{ height:32, display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:6, fontSize:11, color:'#aaa' }}>{b.label}</div>
                    {crews.map(c=><div key={c.id+i} style={{ height:32, borderLeft:'1px solid #f4f4f5' }} />)}
                  </div>
                ))} */}

                {/* day columns with jobs */}
                {/* {days.map((_, dayIdx) => (
                  <div key={dayIdx}>
                    <div style={{ display:'grid', gridTemplateColumns: `100px repeat(${crews.length}, 1fr)` }}>
                      <div style={{ padding:8, background:'#fff', position:'sticky', left:0, borderTop:'1px solid #eee', borderBottom:'1px solid #eee', zIndex:1 }}>
                        <div style={{ fontSize:12, fontWeight:600 }}>{formatDay(days[dayIdx]).split(',')[0]}</div>
                      </div>
                      {crews.map((crew) => (
                        <div key={crew.id} style={{ position:'relative', height: 32 * blocks.length, borderTop:'1px solid #eee', borderLeft:'1px solid #eee', background:'#fff' }}>
                          {jobsFor(dayIdx, crew.id).map(job => (
                          <div key={job.id} style={{ 
                            position:'absolute', 
                            left:6, 
                            right:6, 
                            top:blockTopPx(job.start), 
                            height:blockHeightPx(job.durationMin),
                            background:'#ffffff', 
                            border:'1px solid #e5e7eb', 
                            borderRadius:8, 
                            padding:8, 
                            fontSize:12, 
                            overflow:'hidden',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => editJob(job)}
                          onMouseEnter={(e) => {
                            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                            e.target.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                            e.target.style.transform = 'translateY(0)';
                          }}>
                            <div style={{ display:'flex', justifyContent:'space-between', gap:6, alignItems:'flex-start' }}>
                              <div style={{ fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:'#1f2937' }}>
                                  {(customers.find(c=>c.id===job.customerId)||{}).name}
                              </div>
                              <span style={{ 
                                ...badge, 
                                fontSize:10, 
                                background: job.jobType === 'spray_foam' ? '#dbeafe' : job.jobType === 'blow_in' ? '#fef3c7' : '#f3e8ff',
                                color: job.jobType === 'spray_foam' ? '#1e40af' : job.jobType === 'blow_in' ? '#92400e' : '#7c3aed',
                                border: 'none',
                                fontWeight: 500
                              }}>
                                {job.jobType.replace('_',' ')}
                              </span>
                            </div>
                            <div style={{ marginTop:4, color:'#6b7280', fontSize:11 }}>
                              {job.start} · {Math.round(job.durationMin/60)}
                            </div>
                            <div style={{ color:'#9ca3af', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontSize:11 }}>
                                {job.area} · {job.jobType!=='blow_in' ? `${job.sqft} sqft` : `${job.sqft} sqft · R${job.rValue}`}
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => { setDraft(d => ({ ...d, crewId: crew.id, dayIdx })); setModalOpen(true); }}
                          style={{ position:'absolute', bottom:8, right:8, fontSize:10, border:'1px solid #e5e7eb', borderRadius:999, padding:'4px 8px', background:'#fff', cursor: 'pointer' }}>
                            Quick add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))} */}
            </div>
              </div>
            </div>
          </div>

      {/* Quick Stats Row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16, marginTop:16 }}>
        <div style={card}>
          <div style={{ padding:16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#1f2937' }}>
              {jobs.filter(j => j.dayIdx === todayIdx).length}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Jobs Today</div>
          </div>
        </div>
        <div style={card}>
          <div style={{ padding:16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#1f2937' }}>
              {jobs.length}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Total This Week</div>
          </div>
        </div>
        <div style={card}>
          <div style={{ padding:16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#1f2937' }}>
              {crews.length}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Active Crews</div>
          </div>
        </div>
        <div style={card}>
          <div style={{ padding:16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#1f2937' }}>
              {customers.length}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Total Customers</div>
          </div>
        </div>
        </div>

      {/* Crew Details at the bottom */}
      <div style={{ marginTop:16 }}>
          <div style={card}>
          <div style={cardHeader}>
            <div style={{ fontWeight:600, fontSize: 16 }}>  Crew Details & Jobs for {formatDay(days[activeDayIdx])}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {days[activeDayIdx].toLocaleDateString('en-US', {  weekday: 'long',  month: 'long',  day: 'numeric'})}
            </div>
          </div>
          <div style={{ padding:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:16 }}>
              {crews.map(crew => (
                <div key={crew.id} style={{ 
                  border:'1px solid #e5e7eb', 
                  borderRadius:12, 
                  padding:16, 
                  background: '#fafafa'
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <div style={{ fontWeight:600, fontSize: 16, color: '#1f2937' }}>{crew.name}</div>
                    <span style={{
                      ...badge, 
                      background: jobsFor(activeDayIdx, crew.id).length > 0 ? '#dbeafe' : '#f3f4f6',
                      color: jobsFor(activeDayIdx, crew.id).length > 0 ? '#1e40af' : '#6b7280',
                      border: 'none',
                      fontWeight: 500
                    }}>
                      {jobsFor(activeDayIdx, crew.id).length} job{jobsFor(activeDayIdx, crew.id).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div>
                    {jobsFor(activeDayIdx, crew.id)
                      .sort((a, b) => {
                        const [ah, am] = a.start.split(':').map(Number);
                        const [bh, bm] = b.start.split(':').map(Number);
                        return (ah * 60 + am) - (bh * 60 + bm);
                      })
                      .map(job => (
                      <div key={job.id} style={{ 
                        border:'1px solid #e5e7eb', 
                        borderRadius:8, 
                        padding:12, 
                        marginBottom:8,
                        background: '#fff',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                          <div>
                            <div style={{ fontWeight:600, fontSize: 14, color: '#1f2937' }}>
                              {job.start} · {(customers.find(c=>c.id===job.customerId)||{}).name}
                            </div>
                            <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>
                              {(customers.find(c=>c.id===job.customerId)||{}).address}
                            </div>
                          </div>
                          <span style={{
                            ...badge,
                            fontSize: 10,
                            background: job.jobType === 'spray_foam' ? '#dbeafe' : job.jobType === 'blow_in' ? '#fef3c7' : '#f3e8ff',
                            color: job.jobType === 'spray_foam' ? '#1e40af' : job.jobType === 'blow_in' ? '#92400e' : '#7c3aed',
                            border: 'none',
                            fontWeight: 500
                          }}>
                            {job.jobType.replace('_',' ')}
                          </span>
                        </div>
                        <div style={{ marginTop:8, display:'flex', gap:6, flexWrap: 'wrap' }}>
                          <button 
                            onClick={() => {
                              if (confirm(`Mark job as start`)) {
                                updateJobStatus(job.id, "started")
                              }
                            }}
                            disabled={isLocked(`status-${job.id}-started`)}
                            style={{
                              ...btnSmall,
                              background: '#3b82f6',
                              color: '#fff',
                              border: 'none',
                              fontWeight: 500,
                              opacity: isLocked(`status-${job.id}-started`) ? 0.6 : 1,
                              cursor: isLocked(`status-${job.id}-started`) ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isLocked(`status-${job.id}-started`) ? 'Updating...' : 'Start'}
                          </button>
                          <button 
                            onClick={() => {
                              console.log('Checklist for job:', job.id);
                              alert(`Opening checklist for: ${(customers.find(c=>c.id===job.customerId)||{}).name}`);
                            }}
                            style={{
                              ...btnSmall,
                              background: '#f3f4f6',
                              color: '#374151',
                              border: '1px solid #d1d5db'
                            }}
                          >
                            Checklist
                          </button>
                          <button 
                            onClick={() => {
                              console.log('Complete job:', job.id);
                              if (confirm(`Mark job as complete: ${(customers.find(c=>c.id===job.customerId)||{}).name}?`)) {
                                updateJobStatus(job.id, "completed")
                              }
                            }}
                            disabled={isLocked(`status-${job.id}-completed`)}
                            style={{
                              ...btnSmall,
                              background: '#10b981',
                              color: '#fff',
                              border: 'none',
                              fontWeight: 500,
                              opacity: isLocked(`status-${job.id}-completed`) ? 0.6 : 1,
                              cursor: isLocked(`status-${job.id}-completed`) ? 'not-allowed' : 'pointer',
                            }}
                          >
                            Complete
                          </button>
                          <button 
                            onClick={() => editJob(job)}
                            style={{
                              ...btnSmall,
                              background: '#f59e0b',
                              color: '#fff',
                              border: 'none',
                              fontWeight: 500
                            }}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => {
                              console.log('Complete job:', job.id);
                              if (confirm(`Mark job as Cancled:`)) {
                                setCancellingJob(job)
                              }
                            }}
                            style={{
                              ...btnSmall,
                              background: '#ed4765',
                              color: '#fff',
                              border: 'none',
                              fontWeight: 500
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            style={{ ...btn, background: '#ef4444', color: '#fff', flex: 1 }}
                            onClick={async () => {
                              const success = await deleteJob(job.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {jobsFor(activeDayIdx, crew.id).length === 0 && (
                      <div style={{ 
                        fontSize:12, 
                        color:'#9ca3af', 
                        textAlign: 'center',
                        padding: '16px 0',
                        fontStyle: 'italic'
                      }}>
                        No jobs scheduled for today
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Job Modal */}
      {modalOpen && (
        <>
          {/* Smooth animation styles */}
          <style>{`
            .job-modal-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.45);
              backdrop-filter: blur(3px);
              z-index: 1000;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              overflow-y: auto;
              padding: 60px 16px 40px;
              animation: fadeIn .25s ease;
            }

            .job-modal {
              background: #ffffff;
              width: 100%;
              max-width: 760px;
              max-height: 95vh;
              border-radius: 16px;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              animation: slideUp .3s ease;
            }

            .job-modal-header {
              padding: 18px 20px;
              border-bottom: 1px solid #f1f5f9;
              font-weight: 600;
              font-size: 18px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #fff;
              position: sticky;
              top: 0;
              z-index: 5;
            }

            .job-modal-body {
              padding: 20px;
              overflow-y: auto;
            }

            .job-modal-footer {
              padding: 16px 20px;
              border-top: 1px solid #f1f5f9;
              display: flex;
              gap: 12px;
              background: #fff;
              position: sticky;
              bottom: 0;
            }

            .form-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
              gap: 16px;
            }

            .form-group {
              display: flex;
              flex-direction: column;
            }

            .form-group label {
              font-size: 13px;
              font-weight: 500;
              margin-bottom: 6px;
              color: #475569;
            }

            .form-group input,
            .form-group select,
            .form-group textarea {
              height: 42px;
              padding: 8px 12px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              font-size: 14px;
              outline: none;
              transition: all .2s ease;
            }

            .form-group textarea {
              height: auto;
              min-height: 90px;
              resize: vertical;
            }

            .form-group input:focus,
            .form-group select:focus,
            .form-group textarea:focus {
              border-color: #2563eb;
              box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
            }

            .progress-bar-wrapper {
              height: 6px;
              background: #e2e8f0;
              border-radius: 20px;
              overflow: hidden;
            }

            .progress-bar {
              height: 100%;
              background: linear-gradient(90deg,#2563eb,#4f46e5);
              transition: width .35s ease;
            }

            .btn-modern {
              padding: 10px 16px;
              border-radius: 10px;
              border: none;
              font-weight: 500;
              cursor: pointer;
              transition: all .2s ease;
            }

            .btn-primary-modern {
              background: linear-gradient(90deg,#2563eb,#4f46e5);
              color: #fff;
            }

            .btn-primary-modern:hover {
              opacity: .9;
            }

            .btn-secondary-modern {
              background: #f1f5f9;
            }

            @keyframes fadeIn {
              from {opacity:0}
              to {opacity:1}
            }

            @keyframes slideUp {
              from {transform: translateY(20px); opacity:0}
              to {transform: translateY(0); opacity:1}
            }

            @media(max-width: 640px){
              .job-modal {
                border-radius: 12px;
              }
            }
          `}</style>

          <div
            className="job-modal-overlay"
            onClick={() => setModalOpen(false)}
          >
            <div
              className="job-modal"
              onClick={(e) => e.stopPropagation()}
            >
              {/* HEADER */}
              <div className="job-modal-header">
                <div>
                  {editingJob ? "Edit Job" : "Schedule New Job"}
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Step {step} of 2
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{
                    fontSize: 22,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "#64748b",
                  }}
                >
                  ×
                </button>
              </div>

              {/* Progress */}
              <div style={{ padding: "0 20px", marginTop: 8 }}>
                <div className="progress-bar-wrapper">
                  <div
                    className="progress-bar"
                    style={{ width: step === 1 ? "50%" : "100%" }}
                  />
                </div>
              </div>

              {/* BODY */}
              <div className="job-modal-body">

                {/* STEP 1 */}
                {step === 1 && (
                  <>
                    {/* Crew Select */}
                    <div className="form-group">
                      <label>Job Type (Crew)</label>
                      <select
                        value={draft.crewId || ""}
                        onChange={(e) => {
                          const crewId = e.target.value;
                          const selectedCrew = crews.find(c => c.id === crewId);

                          setDraft(d => ({
                            ...d,
                            crewId,
                            jobType: selectedCrew?.job_type || null,
                            crewType: selectedCrew?.name || null
                          }));

                          // Reset workers when crew changes
                          setAssignedWorkers([]);
                          setLeadWorkers([]);
                        }}
                      >
                        <option value="">Select job type...</option>
                        {crews.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Workers Selection */}
                    {draft.crewId && (
                      <>
                        {/* Lead Workers */}
                        <div style={{ marginTop: 20 }}>
                          <label style={{ fontSize: 13, fontWeight: 600 }}>
                            Select Lead Workers
                          </label>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                            {users
                              .filter((u) => userBelongsToCrew(u, draft.crewId))
                              .map(u => (
                                <label
                                  key={u.id}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: 8,
                                    border: "1px solid #e2e8f0",
                                    cursor: "pointer",
                                    background: leadWorkers.includes(u.id)
                                      ? "linear-gradient(90deg,#2563eb,#4f46e5)"
                                      : "#fff",
                                    color: leadWorkers.includes(u.id) ? "#fff" : "#000",
                                    fontSize: 13,
                                    transition: "all .2s"
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    hidden
                                    checked={leadWorkers.includes(u.id)}
                                    onChange={() =>
                                      setLeadWorkers(prev =>
                                        prev.includes(u.id)
                                          ? prev.filter(id => id !== u.id)
                                          : [...prev, u.id]
                                      )
                                    }
                                  />
                                  {u.email}
                                </label>
                              ))}
                          </div>
                        </div>

                        {/* Team Workers */}
                        <div style={{ marginTop: 20 }}>
                          <label style={{ fontSize: 13, fontWeight: 600 }}>
                            Select Team Workers
                          </label>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                            {users
                              .filter((u) => userBelongsToCrew(u, draft.crewId))
                              .map(u => {
                                const isDisabled = leadWorkers.includes(u.id);

                                return (
                                  <label
                                    key={u.id}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: 8,
                                      border: "1px solid #e2e8f0",
                                      cursor: isDisabled ? "not-allowed" : "pointer",
                                      background: assignedWorkers.includes(u.id)
                                        ? "linear-gradient(90deg,#2563eb,#4f46e5)"
                                        : "#fff",
                                      color: isDisabled
                                        ? "#94a3b8"
                                        : assignedWorkers.includes(u.id)
                                        ? "#fff"
                                        : "#000",
                                      fontSize: 13,
                                      transition: "all .2s"
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      hidden
                                      disabled={isDisabled}
                                      checked={assignedWorkers.includes(u.id)}
                                      onChange={() =>
                                        setAssignedWorkers(prev =>
                                          prev.includes(u.id)
                                            ? prev.filter(id => id !== u.id)
                                            : [...prev, u.id]
                                        )
                                      }
                                    />
                                    {u.email}
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <>
                    <div className="form-grid">

                      <div className="form-group">
                        <label>Customer</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <select
                            value={draft.customerId || ""}
                            onChange={(e) =>
                              setDraft(d => ({ ...d, customerId: e.target.value }))
                            }
                            style={{ flex: 1 }}
                          >
                            <option value="">Select customer...</option>
                            {customers.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setShowCustomerModal(true)}
                            className="btn-modern"
                            style={{
                              background: "#10b981",
                              color: "#fff",
                              whiteSpace: "nowrap",
                              padding: "0 14px"
                            }}
                          >
                            + New
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="form-grid">

                      <div className="form-group">
                        <label>Day</label>
                        <select
                          value={String(draft.dayIdx)}
                          onChange={(e) => {
                            const idx = Number(e.target.value);
                            const selectedDate = days[idx];
                            setDraft(o => ({
                              ...o,
                              dayIdx: idx,
                              start_date: formatDateToYMD(selectedDate)
                            }));
                          }}
                        >
                          {days.map((d, i) => (
                            <option key={i} value={i}>
                              {formatDay(d)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Start Time</label>
                        <input
                          type="time"
                          value={draft.start}
                          onChange={(e) =>
                            setDraft(d => ({ ...d, start: e.target.value }))
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label>Duration (min)</label>
                        <input
                          type="number"
                          value={draft.durationMin}
                          onChange={(e) =>
                            setDraft(d => ({ ...d, durationMin: e.target.value }))
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label>Area</label>
                        <input
                          value={draft.area}
                          onChange={(e) =>
                            setDraft(d => ({ ...d, area: e.target.value }))
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label>Sq Ft</label>
                        <input
                          value={draft.sqft}
                          onChange={(e) =>
                            setDraft(d => ({ ...d, sqft: e.target.value }))
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label>Thickness (in)</label>
                        <input
                          value={draft.thicknessIn}
                          onChange={(e) =>
                            setDraft(d => ({ ...d, thicknessIn: e.target.value }))
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label>Product</label>
                        <input
                          value={draft.product}
                          onChange={(e) =>
                            setDraft(d => ({ ...d, product: e.target.value }))
                          }
                        />
                      </div>

                    </div>

                    <div className="form-group" style={{ marginTop: 18 }}>
                      <label>Notes</label>
                      <textarea
                        value={draft.notes}
                        onChange={(e) =>
                          setDraft(d => ({ ...d, notes: e.target.value }))
                        }
                      />
                    </div>
                  </>
                )}
              </div>

              {/* FOOTER */}
              <div className="job-modal-footer">
                {step === 2 && (
                  <button
                    className="btn-modern btn-secondary-modern"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                )}

                {step === 1 && (
                  <button
                    className="btn-modern btn-primary-modern"
                    style={{ flex: 1 }}
                    disabled={!draft.crewId || leadWorkers.length === 0}
                    onClick={() => setStep(2)}
                  >
                    Next
                  </button>
                )}

                {step === 2 && (
                  <button
                    className="btn-modern btn-primary-modern"
                    style={{ flex: 1 }}
                    disabled={showCustomerModal}
                    onClick={() =>
                      editingJob
                        ? updateJob({ leadWorkers, assignedWorkers })
                        : addJob({ leadWorkers, assignedWorkers })
                    }
                  >
                    {editingJob ? "Update Job" : "Create Job"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div
          onClick={() => setShowCustomerModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: window.innerWidth < 640 ? 'flex-end' : 'center',
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: 480,
              padding: 16,
              borderRadius: window.innerWidth < 640 ? '16px 16px 0 0' : 12,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 -10px 25px rgba(0,0,0,0.15)',
            }}
          >
            {/* Header */}
            <div
              style={{
                position: 'sticky',
                top: 0,
                background: '#fff',
                zIndex: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 18, color: '#1f2937' }}>
                Add New Customer
              </div>
              <button
                onClick={() => setShowCustomerModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: 4,
                }}
              >
                ×
              </button>
            </div>

            {/* Inputs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth < 640 ? '1fr' : '1fr 1fr',
                gap: 12,
              }}
            >
              <LabeledInput
                label="Customer Name"
                value={newCustomer.name}
                onChange={(v) => setNewCustomer((d) => ({ ...d, name: v }))}
                placeholder="Enter customer name"
              />
              <LabeledInput
                label="Address"
                value={newCustomer.address}
                onChange={(v) => setNewCustomer((d) => ({ ...d, address: v }))}
                placeholder="Enter address"
              />
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginTop: 20,
                flexDirection: window.innerWidth < 640 ? 'column' : 'row',
              }}
            >
              <button
                onClick={() => setShowCustomerModal(false)}
                style={{ ...btn, width: '100%' }}
              >
                Cancel
              </button>
              <button
                onClick={addCustomer}
                style={{ ...btnPrimary, width: '100%' }}
              >
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            background: "linear-gradient(90deg,#10b981,#059669)",
            color: "#fff",
            padding: "14px 20px",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            fontWeight: 500,
            zIndex: 10000,
            animation: "slideInRight .4s ease"
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// Data conversion helpers
function uiToDb(ui) {
  return {
    customer_id: ui.customerId,
    crew_id: ui.crewId,
    day_idx: ui.dayIdx,
    start_date: ui.start_date,
    start: ui.start,
    duration_min: ui.durationMin,
    job_type: ui.crewType,
    area: ui.area,
    sqft: ui.sqft,
    thickness_in: ui.thicknessIn,
    r_value: ui.rValue,
    product: ui.product,
    crew_type: ui.crewType,
    notes: ui.notes,
    options: ui.options
  };
}

function getDayIdxFromStartDate(startDate, days) {
  if (!startDate) return 0;

  const jobDate = new Date(`${startDate}T12:00:00`);
  return days.findIndex(d => {
    const day = new Date(d);
    day.setHours(12, 0, 0, 0);
    return day.toDateString() === jobDate.toDateString();
  });
}

function dbToUi(db, days = []) {
  const calculatedDayIdx = getDayIdxFromStartDate(db.start_date, days);

  return {
    id: db.id,
    customerId: db.customer_id,
    crewId: db.crew_id,
    dayIdx: calculatedDayIdx >= 0 ? calculatedDayIdx : db.day_idx,
    start_date: db.start_date,
    start: db.start || db.start_time,
    durationMin: db.duration_min,
    jobType: db.job_type,
    area: db.area,
    sqft: db.sqft,
    thicknessIn: db.thickness_in,
    rValue: db.r_value,
    product: db.product,
    crew_type: db.crew_type,
    notes: db.notes,
    options: db.options
  };
}
