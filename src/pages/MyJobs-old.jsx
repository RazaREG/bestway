import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Card, Row, Col, Spinner, Alert, Form, Container } from "react-bootstrap";

/* ================= MAIN ================= */
export default function MyJobs() {
  const [sessions, setSessions] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [mediaMap, setMediaMap] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState({});

  const user = JSON.parse(localStorage.getItem("user"));

  const activeSession = Object.values(sessions).find(
    s => s && !s.ended_at
  );

  const [activeTab, setActiveTab] = useState("today");
  const [todayJobs, setTodayJobs] = useState([]);
  const [tomorrowJobs, setTomorrowJobs] = useState([]);

  useEffect(() => {
    loadJobs();
  }, []);

  /* ================= LOAD JOBS ================= */
  async function loadJobs() {
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      // 1️⃣ assignments
      const { data: assignments, error: aErr } = await supabase
        .from("job_assignments")
        .select("job_id, role")
        .eq("user_id", user.id);

      if (aErr) throw aErr;
      if (!assignments.length) {
        setTodayJobs([]);
        setTomorrowJobs([]);
        return;
      }

      const jobIds = assignments.map(a => a.job_id);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      // 2️⃣ jobs
      const { data: jobsData, error: jErr } = await supabase
      .from("jobs")
      .select(`*, customers(name, address)`)
      .in("id", jobIds)
      .in("start_date", [today, tomorrowStr]);

      if (jErr) throw jErr;

      const todayList = [];
      const tomorrowList = [];

      jobsData.forEach(j => {
        const a = assignments.find(x => x.job_id === j.id);
        const jobWithRole = { ...j, my_role: a?.role };

        if (j.start_date === today) {
          todayList.push(jobWithRole);
        } else if (j.start_date === tomorrowStr) {
          tomorrowList.push(jobWithRole);
        }
      });

      // Sort both lists
      const sortByTime = (arr) => {
        arr.sort((a, b) => {
          const [ah, am] = a.start.split(":").map(Number);
          const [bh, bm] = b.start.split(":").map(Number);
          return ah !== bh ? ah - bh : am - bm;
        });
      };

      sortByTime(todayList);
      sortByTime(tomorrowList);

      setTodayJobs(todayList);
      setTomorrowJobs(tomorrowList);

      // 3️⃣ sessions
      const { data: sess } = await supabase
        .from("job_work_sessions")
        .select("*")
        .eq("user_id", user.id)
        .in("job_id", jobIds)
        .order("started_at", { ascending: false });

      const map = {};
      sess?.forEach(s => {
        if (!map[s.job_id]) map[s.job_id] = s;
      });
      setSessions(map);

      // 4️⃣ Load media for jobs
      const { data: mediaData, error: mErr } = await supabase
        .from("job_media")
        .select("*")
        .in("job_id", jobIds)
        .order("created_at", { ascending: false });

      if (mErr) throw mErr;
      // Create signed URLs
      const mediaWithUrls = await Promise.all(
        mediaData.map(async (m) => {
          const { data } = await supabase.storage
            .from("job-media")
            .createSignedUrl(m.file_url, 3600);

          return {
            ...m,
            signedUrl: data?.signedUrl
          };
        })
      );

      // Group media by job_id
      const grouped = {};
      mediaWithUrls.forEach(m => {
        if (!grouped[m.job_id]) grouped[m.job_id] = [];
        grouped[m.job_id].push(m);
      });

      setMediaMap(grouped);

    } catch (e) {
      console.error(e);
      alert("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  /* ================= START JOB ================= */
  async function handleStart(job) {
    if (activeSession && activeSession.job_id !== job.id) {
      return alert("Complete the current job first.");
    }

    const confirmStart = window.confirm(
      `Are you sure you want to start this job for ${job.customers?.name}?`
    );

    if (!confirmStart) return;

    const { error } = await supabase
      .from("job_work_sessions")
      .insert({
        job_id: job.id,
        user_id: user.id,
        started_at: new Date().toISOString(),
      });

    if (error) return alert(error.message);
    loadJobs();
  }

  /* ================= COMPLETE JOB ================= */
  async function handleComplete(job) {
    const session = sessions[job.id];
    if (!session) return;

    const confirmComplete = window.confirm(
      `Are you sure you want to complete this job?`
    );

    if (!confirmComplete) return;

    const end = new Date();
    const start = new Date(session.started_at);
    const duration = Math.floor((end - start) / 60000);

    const { error } = await supabase
      .from("job_work_sessions")
      .update({
        ended_at: end.toISOString(),
        duration_min: duration,
      })
      .eq("id", session.id);

    if (error) return alert(error.message);
    loadJobs();
  }

  /* ================= UPLOAD MEDIA ================= */
  async function uploadMedia(job, files, type) {
    for (let file of files) {
      const tempId = crypto.randomUUID();

      // Show spinner immediately
      setUploadingFiles(prev => ({
        ...prev,
        [tempId]: true
      }));

      try {
        const ext = file.name.split(".").pop();
        const path = `${job.id}/${type}/${crypto.randomUUID()}.${ext}`;

        // 1️⃣ Upload file
        const { error: uploadError } = await supabase.storage
          .from("job-media")
          .upload(path, file);

        if (uploadError) throw uploadError;

        // 2️⃣ Insert DB
        const { data: inserted, error: dbError } = await supabase
          .from("job_media")
          .insert({
            job_id: job.id,
            user_id: user.id,
            media_type: type,
            phase: type,
            file_url: path,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // 3️⃣ Create signed URL
        const { data: signed } = await supabase.storage
          .from("job-media")
          .createSignedUrl(path, 3600);

        const newMedia = {
          ...inserted,
          signedUrl: signed?.signedUrl
        };

        // 4️⃣ Instantly push into state (NO REFRESH)
        setMediaMap(prev => ({
          ...prev,
          [job.id]: [newMedia, ...(prev[job.id] || [])]
        }));

      } catch (err) {
        alert(err.message);
      } finally {
        // Remove spinner
        setUploadingFiles(prev => {
          const copy = { ...prev };
          delete copy[tempId];
          return copy;
        });
      }
    }
  }

  const currentJobs = activeTab === "today" ? todayJobs : tomorrowJobs;

  /* ================= RENDER ================= */
  return (
    <Container
      className="py-4"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fafc, #eef2ff)"
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold m-0">My Jobs</h3>

        <div className="d-flex bg-white shadow-sm rounded-pill p-1">
          <button
            className={`btn btn-sm rounded-pill px-4 ${
              activeTab === "today" ? "btn-dark" : "btn-light"
            }`}
            onClick={() => setActiveTab("today")}
          >
            Today
          </button>

          <button
            className={`btn btn-sm rounded-pill px-4 ${
              activeTab === "tomorrow" ? "btn-dark" : "btn-light"
            }`}
            onClick={() => setActiveTab("tomorrow")}
          >
            Tomorrow
          </button>
        </div>
      </div>

      <Row>
        {currentJobs.length === 0 ? (
          <Col xs={12}>
            <div className="text-center py-5">
              <div style={{ fontSize: "48px" }}>📭</div>
              <h5 className="mt-3 fw-semibold">
                {activeTab === "today"
                  ? "No jobs scheduled for today"
                  : "No jobs scheduled for tomorrow"}
              </h5>
              <p className="text-muted mb-0">
                {activeTab === "today"
                  ? "You don’t have any assigned work today."
                  : "No upcoming jobs have been assigned yet."}
              </p>
            </div>
          </Col>
        ) : (
          currentJobs.map(job => {
            const session = sessions[job.id];
            
            const isStarted = !!session?.started_at;
            const isCompleted = !!session?.ended_at;
            
            const isLead = job.my_role === "lead";
            const running = activeSession && activeSession.job_id !== job.id;

            // Format start/end times
            const started = session?.started_at
              ? new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : null;
            const ended = session?.ended_at
              ? new Date(session.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : null;

            return (
              <Col md={6} key={job.id} className="mb-4">
                <Card
                  className="border-0 h-100 job-card"
                  style={{
                    borderRadius: 18,
                    transition: "all 0.25s ease"
                  }}
                >
                  <Card.Body>
                    {/* STATUS BADGE */}
                    <div className="position-absolute top-0 end-0 p-3">
                      {!session ? (
                        <span className="badge rounded-pill bg-secondary px-3 py-2">
                          Pending
                        </span>
                      ) : session.ended_at ? (
                        <span className="badge rounded-pill bg-success px-3 py-2">
                          Completed
                        </span>
                      ) : (
                        <span className="badge rounded-pill bg-warning text-dark px-3 py-2">
                          <Timer start={session.started_at} />
                        </span>
                      )}
                    </div>
                    <h5 className="fw-bold">{job.customers?.name}</h5>
                    <p className="text-muted">{job.customers?.address}</p>
                    <div className="mt-3 small text-muted">
                      <div><strong>Job Type:</strong> {job.job_type}</div>
                      <div><strong>Start Time:</strong> {job.start}</div>
                      <div><strong>Duration:</strong> {job.duration_min} mins</div>
                      <div><strong>Area:</strong> {job.area}</div>
                      <div><strong>Sqft:</strong> {job.sqft}</div>
                      <div><strong>Thickness:</strong> {job.thickness_in}</div>
                      <div><strong>Product:</strong> {job.product}</div>
                    </div>

                    {/* ========== LEAD MEDIA UPLOAD ========== */}
                    
                    {isLead && activeTab === "today" && (
                      <div className="mt-4 border-top pt-3" style={{
                        background: "#f9fafb",
                        borderRadius: 14
                      }}>
                        <h6 className="fw-bold">Job site Picture/Videos</h6>

                        {/* BEFORE */}
                        {!isCompleted && (
                        <Form.Group className="mb-2">
                          <Form.Label>Before Work</Form.Label>
                          <Form.Control
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            onChange={e => uploadMedia(job, e.target.files, "before", setProgress)}
                          />
                        </Form.Group>
                        )}

                        {/* AFTER (LOCKED UNTIL COMPLETED) */}
                        {isCompleted && (
                        <Form.Group>
                          <Form.Label>After Work</Form.Label>
                          <Form.Control
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            disabled={!session?.ended_at}
                            onChange={e => uploadMedia(job, e.target.files, "after", setProgress)}
                          />
                          {!session?.ended_at && (
                            <small className="text-muted">
                              Complete job to upload after-work media
                            </small>
                          )}
                        </Form.Group>
                        )}

                        {/* Progress */}
                        {progress > 0 && (
                          <div className="progress mt-2">
                            <div
                              className="progress-bar"
                              style={{ width: `${progress}%` }}
                            >
                              {progress}%
                            </div>
                          </div>
                        )}

                        <MediaGallery
                          jobId={job.id}
                          sessionEnded={session?.ended_at}
                          mediaMap={mediaMap}
                          setMediaMap={setMediaMap}
                          uploadingFiles={uploadingFiles}
                          status={isCompleted}
                        />
                      </div>
                    )}

                    {activeTab === "today" && (
                      <div className="mt-3">
                        {!session ? (
                          <button
                            className="btn btn-dark w-100 rounded-pill py-2"
                            disabled={running}
                            onClick={() => handleStart(job)}
                          >
                            {running ? "Another Job Running" : "Start Job"}
                          </button>
                        ) : session.ended_at ? (
                          <button className="btn btn-light w-100 rounded-pill py-2" disabled>
                            Completed ({session.duration_min} mins)
                          </button>
                        ) : (
                          <button
                            className="btn btn-success w-100 rounded-pill py-2"
                            onClick={() => handleComplete(job)}
                          >
                            Complete Job
                          </button>
                        )}
                      </div>
                    )}

                  </Card.Body>
                </Card>
              </Col>
            );
          })
        )}
      </Row>
    </Container>
  );
}

/* ================= TIMER ================= */
function Timer({ start }) {
  const [sec, setSec] = useState(0);

  useEffect(() => {
    const i = setInterval(() => {
      setSec(Math.floor((Date.now() - new Date(start)) / 1000));
    }, 1000);
    return () => clearInterval(i);
  }, [start]);

  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return <>In Progress {m}:{s.toString().padStart(2, "0")}</>;
}

function MediaGallery({ jobId, sessionEnded, mediaMap, setMediaMap, uploadingFiles, status }) {

  const media = mediaMap[jobId] || [];

  async function deleteMedia(m) {
    if (!window.confirm("Delete this file?")) return;

    await supabase.storage.from("job-media").remove([m.file_url]);
    await supabase.from("job_media").delete().eq("id", m.id);

    setMediaMap(prev => ({
      ...prev,
      [jobId]: prev[jobId].filter(x => x.id !== m.id)
    }));
  }

  const before = media.filter(m => m.media_type === "before");
  const after = media.filter(m => m.media_type === "after");

  return (
    <div className="mt-3">

      {["before", "after"]
      .filter(type => !(status === false && type === "after"))
      .map(type => {
        const list = type === "before" ? before : after;

        return (
          <div key={type} className="mb-3">
            <h6 className="fw-bold text-capitalize">
              {type} Work ({list.length})
            </h6>

            <Row>
              {list.map(m => (
                <Col md={4} key={m.id} className="mb-3">
                  <div className="position-relative border rounded overflow-hidden shadow-sm">

                    {m.file_url.match(/\.(mp4|webm|mov)$/i) ? (
                      <video src={m.signedUrl} controls className="w-100" />
                    ) : (
                      <img
                        src={m.signedUrl}
                        alt=""
                        className="w-100"
                        style={{ height: 150, objectFit: "cover" }}
                      />
                    )}

                    {/* {!sessionEnded && ( */}
                    {((status === false && type === "before") ||
                      (status === true && type === "after")) && (
                      <button
                        className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2"
                        onClick={() => deleteMedia(m)}
                      >
                        ✕
                      </button>
                    )}
                    {/* )} */}

                  </div>
                </Col>
              ))}

              {/* Upload spinner preview */}
              {Object.keys(uploadingFiles).length > 0 &&
              ((status === false && type === "before") ||
                (status === true && type === "after")) && (
                <Col md={4} className="mb-3">
                  <div
                    className="border rounded d-flex align-items-center justify-content-center"
                    style={{ height: 150 }}
                  >
                    <Spinner animation="border" />
                  </div>
                </Col>
              )}

            </Row>

            {list.length === 0 && Object.keys(uploadingFiles).length === 0 && (
              <div className="text-muted small">No {type} media uploaded.</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
