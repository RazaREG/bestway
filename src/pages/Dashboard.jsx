import { Capacitor } from "@capacitor/core";
import React, { useEffect, useState } from "react";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { supabase } from "../supabase";
import { useNavigate, Link } from "react-router-dom";
import PullToRefresh from "react-simple-pull-to-refresh";
import {
  FiArrowLeft,
  FiBriefcase,
  FiUsers,
  FiCalendar,
  FiClock,
  FiPlayCircle,
  FiCheckCircle,
  FiXCircle,
  FiExternalLink,
  FiPackage,
  FiSettings,
} from "react-icons/fi";
import { isAdminOrSubAdmin, getCrewRoleIds } from "../roles";

import { computeJobStatus } from "../jobStatus";

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const isApp = Capacitor.isNativePlatform();

  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();
  const crewIds = getCrewRoleIds(user);
  const userId = user?.id;

  const [users, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    setUser(parsedUser);
  }, []);

  const handleRefresh = async () => {
    window.location.reload();
    return true;
  };

  const loadAdminDashboard = async () => {
    setLoading(true);
    try {
      const today = new Date().toLocaleDateString("en-CA");

      const [{ data: jobs }, { data: crews }] = await Promise.all([
        supabase.from("jobs").select("id, status, start_date"),
        supabase.from("crews").select("id"),
      ]);

      const jobList = jobs || [];
      const jobIds = jobList.map((j) => j.id);

      let sessions = [];
      let assignments = [];
      if (jobIds.length > 0) {
        const [{ data: sessionRows, error: sessionsErr }, { data: assignRows, error: assignErr }] =
          await Promise.all([
            supabase
              .from("job_work_sessions")
              .select("job_id, user_id, ended_at, duration_min")
              .in("job_id", jobIds),
            supabase.from("job_assignments").select("job_id, user_id").in("job_id", jobIds),
          ]);

        if (sessionsErr) throw sessionsErr;
        if (assignErr) throw assignErr;
        sessions = sessionRows || [];
        assignments = assignRows || [];
      }

      const assigneesByJob = {};
      assignments.forEach((a) => {
        if (!assigneesByJob[a.job_id]) assigneesByJob[a.job_id] = [];
        assigneesByJob[a.job_id].push(a.user_id);
      });

      let completedJobs = 0;
      let pendingJobs = 0;

      jobList.forEach((job) => {
        const jobSessions = sessions.filter((s) => s.job_id === job.id);
        const status = computeJobStatus(
          job,
          jobSessions,
          assigneesByJob[job.id] || []
        );

        if (status === "completed") {
          completedJobs += 1;
        } else if (status !== "cancelled" && job.start_date >= today) {
          pendingJobs += 1;
        }
      });

      setStats({
        completedJobs,
        pendingJobs,
        activeCrews: crews?.length ?? 0,
      });
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCrewDashboard = async () => {
    setLoading(true);

    try {
      if (!userId) {
        console.error("No logged-in user id");
        return;
      }

      // 1. Get only jobs assigned to logged-in user
      const { data: assignments, error: assignErr } = await supabase
        .from("job_assignments")
        .select("job_id")
        .eq("user_id", userId);

      if (assignErr) throw assignErr;

      const assignedJobIds = [...new Set((assignments || []).map((a) => a.job_id))];

      if (assignedJobIds.length === 0) {
        setStats({
          totalJobs: 0,
          todayJobs: 0,
          startedJobs: 0,
          completedJobs: 0,
          cancelledJobs: 0,
        });
        return;
      }

      // 2. Load only assigned jobs
      const { data: jobs, error: jobsErr } = await supabase
        .from("jobs")
        .select("*")
        .in("id", assignedJobIds);

      if (jobsErr) throw jobsErr;

      const today = new Date().toISOString().split("T")[0];

      const todayJobsArray = (jobs || []).filter((j) => j.start_date === today);

      // 3. Load today's team sessions + all assignees per job
      const todayJobIds = todayJobsArray.map((j) => j.id);

      let sessions = [];
      const assigneesByJob = {};

      const { data: teamAssignments, error: teamAssignErr } = await supabase
        .from("job_assignments")
        .select("job_id, user_id")
        .in("job_id", assignedJobIds);

      if (teamAssignErr) throw teamAssignErr;

      (teamAssignments || []).forEach((a) => {
        if (!assigneesByJob[a.job_id]) assigneesByJob[a.job_id] = [];
        assigneesByJob[a.job_id].push(a.user_id);
      });

      if (todayJobIds.length > 0) {
        const { data: sessionRows, error: sessionsErr } = await supabase
          .from("job_work_sessions")
          .select("job_id, user_id, ended_at, duration_min")
          .in("job_id", todayJobIds);

        if (sessionsErr) throw sessionsErr;

        sessions = sessionRows || [];
      }

      let startedJobs = 0;
      let completedJobs = 0;

      todayJobsArray.forEach((job) => {
        if (job.status === "cancelled") return;

        const jobSessions = sessions.filter((s) => s.job_id === job.id);
        const status = computeJobStatus(
          job,
          jobSessions,
          assigneesByJob[job.id] || []
        );

        if (status === "started") startedJobs += 1;
        if (status === "completed") completedJobs += 1;
      });

      const cancelledJobs = todayJobsArray.filter(
        (j) => j.status === "cancelled"
      ).length;

      setStats({
        totalJobs: jobs?.length || 0,
        todayJobs: todayJobsArray.length,
        startedJobs,
        completedJobs,
        cancelledJobs,
      });
    } catch (err) {
      console.error("Crew dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (isApp) return;

    if (isAdminOrSubAdmin(user)) {
      loadAdminDashboard();
    } else {
      loadCrewDashboard();
    }
  }, []);

  function BackButton() {
    return (
      <button className="back-btn" onClick={() => navigate("/dashboard")}>
        <FiArrowLeft />
      </button>
    );
  }

  function StatCard({ title, value, icon, gradient, onClick }) {
    return (
      <Card
        role={onClick ? "button" : undefined}
        onClick={onClick}
        className="premium-card border-0 text-white h-100"
        style={{ background: gradient }}
      >
        <Card.Body>
          <div className="card-glow" />

          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className="stat-title">{title}</div>
              <div className="stat-value">{loading ? "…" : value}</div>
            </div>

            <div className="stat-icon">{icon}</div>
          </div>
        </Card.Body>
      </Card>
    );
  }

  const styles = (
    <style>
      {`
        .dashboard-page {
          min-height: 100vh;
          color: #fff;
          background:
            radial-gradient(circle at top left, rgba(59,130,246,.28), transparent 32%),
            radial-gradient(circle at bottom right, rgba(16,185,129,.18), transparent 28%),
            linear-gradient(135deg, #020617, #0f172a 48%, #1e293b);
          padding: 24px 0;
        }

        .back-btn {
          width: 44px;
          height: 44px;
          border: 1px solid rgba(255,255,255,.16);
          background: rgba(255,255,255,.1);
          color: #fff;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(12px);
          box-shadow: 0 10px 24px rgba(0,0,0,.25);
          transition: all .25s ease;
          margin-bottom: 18px;
        }

        .back-btn:hover {
          transform: translateX(-3px);
          background: rgba(255,255,255,.18);
        }

        .dashboard-heading {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .dashboard-subtitle {
          color: rgba(255,255,255,.65);
          margin-bottom: 24px;
          font-size: 14px;
        }

        .premium-card {
          border-radius: 22px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 18px 42px rgba(0,0,0,.28);
          transition: all .25s ease;
          min-height: 145px;
        }

        .premium-card:hover {
          transform: translateY(-7px) scale(1.01);
          box-shadow: 0 26px 55px rgba(0,0,0,.38);
        }

        .premium-card:active {
          transform: scale(.98);
        }

        .card-glow {
          position: absolute;
          width: 130px;
          height: 130px;
          border-radius: 999px;
          background: rgba(255,255,255,.18);
          right: -45px;
          top: -45px;
        }

        .stat-title {
          font-size: 14px;
          opacity: .86;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .stat-value {
          font-size: 38px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -.5px;
        }

        .stat-icon {
          width: 52px;
          height: 52px;
          border-radius: 18px;
          background: rgba(255,255,255,.18);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 25px;
          backdrop-filter: blur(10px);
        }

        .quick-card {
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.09);
          backdrop-filter: blur(14px);
          color: #fff;
          box-shadow: 0 18px 42px rgba(0,0,0,.25);
        }

        .quick-link {
          border-radius: 14px;
          padding: 12px 18px;
          text-decoration: none;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all .25s ease;
          border: 1px solid rgba(255,255,255,.12);
        }

        .quick-link:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 28px rgba(0,0,0,.25);
        }

        .quick-dark {
          background: #fff;
          color: #0f172a;
        }

        .quick-outline {
          background: rgba(255,255,255,.08);
          color: #fff;
        }

        .quick-warning {
          background: linear-gradient(135deg, #facc15, #f59e0b);
          color: #111827;
        }
      `}
    </style>
  );

  if (isAdminOrSubAdmin(user)) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="dashboard-page">
          {styles}

          <Container>
            <BackButton />

            <div>
              <h2 className="dashboard-heading">Main Dashboard</h2>
              <p className="dashboard-subtitle">
                Overview of completed and pending jobs, and active crews.
              </p>
            </div>

            <Row className="g-4">
              <Col md={4}>
                <StatCard
                  title="Completed Jobs"
                  value={stats.completedJobs}
                  icon={<FiCheckCircle />}
                  gradient="linear-gradient(135deg, #10b981, #047857)"
                  onClick={() => navigate("/job_details")}
                />
              </Col>

              <Col md={4}>
                <StatCard
                  title="Pending Jobs"
                  value={stats.pendingJobs}
                  icon={<FiClock />}
                  gradient="linear-gradient(135deg, #6366f1, #4338ca)"
                  onClick={() => navigate("/job_details")}
                />
              </Col>

              <Col md={4}>
                <StatCard
                  title="Active Crews"
                  value={stats.activeCrews}
                  icon={<FiUsers />}
                  gradient="linear-gradient(135deg, #f59e0b, #b45309)"
                  onClick={() => navigate("/crews")}
                />
              </Col>
            </Row>

            <div className="mt-5">
              <Card className="quick-card">
                <Card.Body>
                  <Card.Title className="mb-3" style={{ fontWeight: 800 }}>
                    Quick Links
                  </Card.Title>

                  <div className="d-flex flex-wrap gap-3">
                    <Link className="quick-link quick-dark" to="/schedule">
                      <FiCalendar />
                      Open Schedule
                    </Link>

                    <Link className="quick-link quick-outline" to="/users">
                      <FiSettings />
                      Manage Users
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </Container>
        </div>
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="dashboard-page">
        {styles}

        <Container>
          <BackButton />

          <div>
            <h2 className="dashboard-heading">Crew Dashboard</h2>
            <p className="dashboard-subtitle">
              Today’s work summary and quick actions.
            </p>
          </div>

          <Row className="g-3 mb-4">
            <Col xs={12} md={6} lg={3}>
              <StatCard
                title="Today's Jobs"
                value={stats.todayJobs}
                icon={<FiCalendar />}
                gradient="linear-gradient(135deg, #4f46e5, #6366f1)"
              />
            </Col>

            <Col xs={12} md={6} lg={3}>
              <StatCard
                title="Started"
                value={stats.startedJobs}
                icon={<FiPlayCircle />}
                gradient="linear-gradient(135deg, #f59e0b, #f97316)"
              />
            </Col>

            <Col xs={12} md={6} lg={3}>
              <StatCard
                title="Completed"
                value={stats.completedJobs}
                icon={<FiCheckCircle />}
                gradient="linear-gradient(135deg, #10b981, #059669)"
              />
            </Col>

            <Col xs={12} md={6} lg={3}>
              <StatCard
                title="Cancelled"
                value={stats.cancelledJobs}
                icon={<FiXCircle />}
                gradient="linear-gradient(135deg, #ef4444, #dc2626)"
              />
            </Col>
          </Row>

          <div className="mt-4">
            <Card className="quick-card">
              <Card.Body>
                <Card.Title className="mb-3" style={{ fontWeight: 800 }}>
                  Quick Links
                </Card.Title>

                <div className="d-flex gap-3 mt-2 flex-wrap">
                  <Link className="quick-link quick-dark" to="/my_jobs">
                    <FiExternalLink />
                    My Jobs
                  </Link>

                  {user?.inventory_access && (
                    <Link className="quick-link quick-warning" to="/inventory-data">
                      <FiPackage />
                      Inventory
                    </Link>
                  )}
                </div>
              </Card.Body>
            </Card>
          </div>
        </Container>
      </div>
    </PullToRefresh>
  );
}
