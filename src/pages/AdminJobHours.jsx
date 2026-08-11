import React from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import {
  FiArrowLeft,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiFilter,
  FiPlus,
  FiRefreshCw,
  FiUser,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { computeJobStatus, statusBadgeVariant } from "../jobStatus";

const STATUS_OPTIONS = ["new", "started", "completed", "cancelled"];

function minutesFromSession(session) {
  if (session?.duration_min != null && Number(session.duration_min) > 0) {
    return Number(session.duration_min);
  }

  if (!session?.started_at || !session?.ended_at) return 0;

  const diff = new Date(session.ended_at) - new Date(session.started_at);
  return diff > 0 ? Math.round(diff / 60000) : 0;
}

function formatHours(minutes) {
  const total = Number(minutes || 0);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatSessionTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSessionWindow(session) {
  if (!session?.started_at && !session?.ended_at) return "No time recorded";

  return `${formatSessionTime(session.started_at)} - ${formatSessionTime(session.ended_at)}`;
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date - offset).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value) {
  return value ? new Date(value).toISOString() : null;
}

function defaultStartForJob(job) {
  const date = job?.start_date || new Date().toLocaleDateString("en-CA");
  const time = job?.start?.slice(0, 5) || "08:00";
  return `${date}T${time}`;
}

function addMinutes(localDateTime, minutes) {
  if (!localDateTime) return "";
  const date = new Date(localDateTime);
  date.setMinutes(date.getMinutes() + Number(minutes || 0));
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date - offset).toISOString().slice(0, 16);
}

function splitMinutes(totalMinutes) {
  const total = Math.max(0, Number(totalMinutes || 0));
  return {
    hours: String(Math.floor(total / 60)),
    minutes: String(total % 60),
  };
}

function formToMinutes(form) {
  const hours = Math.max(0, Number(form.hours || 0));
  const minutes = Math.max(0, Number(form.minutes || 0));
  return Math.round(hours * 60 + minutes);
}

export default function AdminJobHours() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user"));

  const [jobs, setJobs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [savingStatusId, setSavingStatusId] = React.useState(null);
  const [statusConfirm, setStatusConfirm] = React.useState({
    show: false,
    job: null,
    from: "",
    to: "",
  });

  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [memberFilter, setMemberFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  const [sessionModal, setSessionModal] = React.useState({
    show: false,
    job: null,
    member: null,
  });
  const [sessionForm, setSessionForm] = React.useState({
    user_id: "",
    started_at: "",
    ended_at: "",
    hours: "",
    minutes: "",
  });
  const [savingSession, setSavingSession] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);

    try {
      let jobsQuery = supabase
        .from("jobs")
        .select(
          `
            *,
            crew:crew_id ( id, name ),
            customer:customer_id ( id, name, address )
          `
        )
        .order("start_date", { ascending: false })
        .order("start", { ascending: true });

      if (startDate) jobsQuery = jobsQuery.gte("start_date", startDate);
      if (endDate) jobsQuery = jobsQuery.lte("start_date", endDate);

      const [{ data: jobRows, error: jobsError }, { data: userRows, error: usersError }] =
        await Promise.all([
          jobsQuery,
          supabase.from("app_users").select("id, email, role, roles").order("email"),
        ]);

      if (jobsError) throw jobsError;
      if (usersError) throw usersError;

      const jobIds = (jobRows || []).map((job) => job.id);
      const [{ data: sessions, error: sessionsError }, { data: assignments, error: assignError }] =
        jobIds.length
          ? await Promise.all([
              supabase
                .from("job_work_sessions")
                .select("*")
                .in("job_id", jobIds)
                .order("started_at", { ascending: true }),
              supabase
                .from("job_assignments")
                .select("job_id, user_id, role")
                .in("job_id", jobIds),
            ])
          : [{ data: [] }, { data: [] }];

      if (sessionsError) throw sessionsError;
      if (assignError) throw assignError;

      const usersById = new Map((userRows || []).map((user) => [user.id, user]));
      const sessionsByJob = {};
      const assignmentsByJob = {};

      (sessions || []).forEach((session) => {
        if (!sessionsByJob[session.job_id]) sessionsByJob[session.job_id] = [];
        sessionsByJob[session.job_id].push({
          ...session,
          user: usersById.get(session.user_id),
          minutes: minutesFromSession(session),
        });
      });

      (assignments || []).forEach((assignment) => {
        if (!assignmentsByJob[assignment.job_id]) assignmentsByJob[assignment.job_id] = [];
        assignmentsByJob[assignment.job_id].push({
          ...assignment,
          user: usersById.get(assignment.user_id),
        });
      });

      const enriched = (jobRows || []).map((job) => {
        const jobSessions = sessionsByJob[job.id] || [];
        const jobAssignments = assignmentsByJob[job.id] || [];
        const computedStatus = computeJobStatus(job, jobSessions);
        const assignedMembers = jobAssignments.map((assignment) => {
          const memberSessions = jobSessions.filter(
            (session) => session.user_id === assignment.user_id
          );
          const minutes = memberSessions.reduce(
            (sum, session) => sum + session.minutes,
            0
          );

          return {
            ...assignment,
            sessions: memberSessions,
            primarySession: memberSessions[0] || null,
            minutes,
          };
        });
        const totalMinutes = assignedMembers.reduce(
          (sum, member) => sum + member.minutes,
          0
        );

        return {
          ...job,
          sessions: jobSessions,
          assignments: jobAssignments,
          assignedMembers,
          computed_status: computedStatus,
          total_minutes: totalMinutes,
        };
      });

      setJobs(enriched);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load job hours");
    } finally {
      setLoading(false);
    }
  }, [endDate, startDate]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const memberOptions = React.useMemo(() => {
    const byId = new Map();

    jobs.forEach((job) => {
      job.assignedMembers.forEach((member) => {
        if (!byId.has(member.user_id)) byId.set(member.user_id, member);
      });
    });

    return [...byId.values()].sort((a, b) =>
      (a.user?.email || "").localeCompare(b.user?.email || "")
    );
  }, [jobs]);

  const filteredJobs = React.useMemo(() => {
    return jobs
      .filter((job) => {
      const matchesStatus =
        statusFilter === "all" || job.computed_status === statusFilter;
      const matchesMember =
        memberFilter === "all" ||
        job.assignedMembers.some((member) => member.user_id === memberFilter);

      return matchesStatus && matchesMember;
    })
      .map((job) => ({
        ...job,
        visibleMembers:
          memberFilter === "all"
            ? job.assignedMembers
            : job.assignedMembers.filter((member) => member.user_id === memberFilter),
      }));
  }, [jobs, memberFilter, statusFilter]);

  const totals = React.useMemo(() => {
    const minutes = filteredJobs.reduce(
      (sum, job) =>
        sum +
        job.visibleMembers.reduce(
          (memberSum, member) => memberSum + member.minutes,
          0
        ),
      0
    );
    const sessions = filteredJobs.reduce(
      (sum, job) =>
        sum +
        job.visibleMembers.reduce(
          (memberSum, member) => memberSum + member.sessions.length,
          0
        ),
      0
    );
    return {
      jobs: filteredJobs.length,
      sessions,
      minutes,
    };
  }, [filteredJobs]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const pageStart = filteredJobs.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, filteredJobs.length);
  const paginatedJobs = React.useMemo(
    () => filteredJobs.slice((page - 1) * pageSize, page * pageSize),
    [filteredJobs, page, pageSize]
  );

  React.useEffect(() => {
    setPage(1);
  }, [endDate, memberFilter, startDate, statusFilter]);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function openSessionModal(job, member = null) {
    const selectedMember = member || job.assignedMembers?.[0] || null;
    const session = selectedMember?.primarySession || null;
    const totalMinutes =
      selectedMember?.minutes ?? job.duration_min ?? 0;
    const split = splitMinutes(totalMinutes);
    const startedAt = session?.started_at
      ? toDateTimeLocal(session.started_at)
      : defaultStartForJob(job);

    setSessionForm({
      user_id: selectedMember?.user_id || "",
      started_at: startedAt,
      ended_at: addMinutes(startedAt, totalMinutes),
      hours: split.hours,
      minutes: split.minutes,
    });

    setSessionModal({ show: true, job, member: selectedMember });
  }

  function closeSessionModal() {
    if (savingSession) return;
    setSessionModal({ show: false, job: null, member: null });
  }

  function updateTimeParts(nextParts) {
    setSessionForm((prev) => ({
      ...prev,
      ...nextParts,
      ended_at: addMinutes(prev.started_at, formToMinutes({ ...prev, ...nextParts })),
    }));
  }

  function handleMemberChange(userId) {
    const job = sessionModal.job;
    const member = job?.assignedMembers?.find((item) => item.user_id === userId) || null;
    const session = member?.primarySession || null;
    const totalMinutes = member?.minutes ?? job?.duration_min ?? 0;
    const split = splitMinutes(totalMinutes);
    const startedAt = session?.started_at
      ? toDateTimeLocal(session.started_at)
      : defaultStartForJob(job);

    setSessionModal((prev) => ({ ...prev, member }));
    setSessionForm({
      user_id: userId,
      started_at: startedAt,
      ended_at: addMinutes(startedAt, totalMinutes),
      hours: split.hours,
      minutes: split.minutes,
    });
  }

  async function saveSession() {
    const job = sessionModal.job;
    const member =
      job?.assignedMembers?.find((item) => item.user_id === sessionForm.user_id) ||
      sessionModal.member;
    const session = member?.primarySession || null;
    const minutes = formToMinutes(sessionForm);

    if (!job) return;
    if (!sessionForm.user_id) return alert("Select a member");

    const startedAt = fromDateTimeLocal(sessionForm.started_at || defaultStartForJob(job));
    const endedAt = fromDateTimeLocal(
      addMinutes(sessionForm.started_at || defaultStartForJob(job), minutes)
    );

    setSavingSession(true);

    try {
      const payload = {
        job_id: job.id,
        user_id: sessionForm.user_id,
        started_at: startedAt,
        ended_at: endedAt,
        duration_min: minutes,
      };

      const { error } = session
        ? await supabase.from("job_work_sessions").update(payload).eq("id", session.id)
        : await supabase.from("job_work_sessions").insert(payload);

      if (error) throw error;

      if (session && member?.sessions?.length > 1) {
        const extraSessionIds = member.sessions
          .filter((item) => item.id !== session.id)
          .map((item) => item.id);

        if (extraSessionIds.length > 0) {
          const { error: deleteError } = await supabase
            .from("job_work_sessions")
            .delete()
            .in("id", extraSessionIds);

          if (deleteError) throw deleteError;
        }
      }

      await loadData();
      closeSessionModal();
    } catch (err) {
      alert(err.message || "Failed to save hours");
    } finally {
      setSavingSession(false);
    }
  }

  async function updateJobStatus(job, status) {
    setSavingStatusId(job.id);

    try {
      const { error } = await supabase
        .from("jobs")
        .update({
          status,
          status_updated_by: currentUser?.id || null,
        })
        .eq("id", job.id);

      if (error) throw error;

      setJobs((prev) =>
        prev.map((item) =>
          item.id === job.id
            ? { ...item, status, computed_status: computeJobStatus({ ...item, status }, item.sessions) }
            : item
        )
      );
    } catch (err) {
      alert(err.message || "Failed to update status");
    } finally {
      setSavingStatusId(null);
    }
  }

  function requestStatusChange(job, nextStatus) {
    const currentStatus = job.status || job.computed_status || "new";

    if (nextStatus === currentStatus) return;

    setStatusConfirm({
      show: true,
      job,
      from: currentStatus,
      to: nextStatus,
    });
  }

  function closeStatusConfirm() {
    if (savingStatusId) return;
    setStatusConfirm({ show: false, job: null, from: "", to: "" });
  }

  async function confirmStatusChange() {
    if (!statusConfirm.job || !statusConfirm.to) return;

    await updateJobStatus(statusConfirm.job, statusConfirm.to);
    setStatusConfirm({ show: false, job: null, from: "", to: "" });
  }

  return (
    <div className="admin-hours-page">
      <style>
        {`
          .admin-hours-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #f8fafc, #e2e8f0 48%, #eef2ff);
            color: #0f172a;
            padding: 24px 0 36px;
          }

          .admin-hours-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 22px;
          }

          .admin-hours-title {
            font-size: 28px;
            font-weight: 800;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .admin-hours-subtitle {
            color: #64748b;
            font-size: 14px;
            margin-top: 6px;
          }

          .admin-hours-back {
            width: 42px;
            height: 42px;
            border: 1px solid #cbd5e1;
            background: #fff;
            color: #0f172a;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .admin-hours-panel {
            border: 1px solid #dbe3ef;
            border-radius: 8px;
            background: rgba(255,255,255,.92);
            box-shadow: 0 18px 42px rgba(15,23,42,.08);
          }

          .summary-tile {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            background: #fff;
          }

          .summary-label {
            font-size: 12px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            display: flex;
            gap: 7px;
            align-items: center;
          }

          .summary-value {
            font-size: 28px;
            font-weight: 800;
            margin-top: 6px;
          }

          .filter-label {
            font-size: 12px;
            color: #475569;
            font-weight: 800;
            text-transform: uppercase;
          }

          .hours-table th {
            background: #0f172a !important;
            color: #fff !important;
            border-color: #1e293b !important;
            font-size: 12px;
            text-transform: uppercase;
            white-space: nowrap;
          }

          .hours-table td {
            vertical-align: top;
          }

          .member-row {
            display: grid;
            grid-template-columns: minmax(170px, 1fr) 95px 130px;
            gap: 10px;
            align-items: center;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            border-radius: 8px;
            padding: 9px 10px;
            margin-bottom: 8px;
          }

          .member-role {
            color: #64748b;
            font-size: 12px;
            font-weight: 700;
            text-transform: capitalize;
          }

          .member-session-times {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 6px;
          }

          .member-session-time {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            color: #475569;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 3px 6px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
          }

          .muted-line {
            color: #64748b;
            font-size: 12px;
          }

          .compact-action {
            border-radius: 8px !important;
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-weight: 700 !important;
          }

          .datatable-toolbar,
          .datatable-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 16px;
            background: #fff;
          }

          .datatable-toolbar {
            border-bottom: 1px solid #e2e8f0;
            border-radius: 8px 8px 0 0;
          }

          .datatable-footer {
            border-top: 1px solid #e2e8f0;
            border-radius: 0 0 8px 8px;
          }

          .page-controls {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          @media (max-width: 900px) {
            .admin-hours-header {
              flex-direction: column;
            }

            .member-row {
              grid-template-columns: 1fr;
            }

            .datatable-toolbar,
            .datatable-footer {
              align-items: stretch;
              flex-direction: column;
            }

            .page-controls {
              justify-content: space-between;
            }
          }
        `}
      </style>

      <Container fluid="lg">
        <div className="admin-hours-header">
          <div className="d-flex gap-3 align-items-start">
            <button className="admin-hours-back" onClick={() => navigate("/dashboard")}>
              <FiArrowLeft />
            </button>
            <div>
              <h2 className="admin-hours-title">
                <FiClock />
                Job Hours
              </h2>
              <div className="admin-hours-subtitle">
                Review job labor time, adjust member hours, and control job status.
              </div>
            </div>
          </div>

          <Button className="compact-action" variant="dark" onClick={loadData} disabled={loading}>
            <FiRefreshCw />
            Refresh
          </Button>
        </div>

        <Row className="g-3 mb-3">
          <Col md={4}>
            <div className="summary-tile">
              <div className="summary-label">
                <FiBriefcase />
                Jobs
              </div>
              <div className="summary-value">{loading ? "-" : totals.jobs}</div>
            </div>
          </Col>
          <Col md={4}>
            <div className="summary-tile">
              <div className="summary-label">
                <FiUser />
                Work Sessions
              </div>
              <div className="summary-value">{loading ? "-" : totals.sessions}</div>
            </div>
          </Col>
          <Col md={4}>
            <div className="summary-tile">
              <div className="summary-label">
                <FiCheckCircle />
                Total Hours
              </div>
              <div className="summary-value">{loading ? "-" : formatHours(totals.minutes)}</div>
            </div>
          </Col>
        </Row>

        <Card className="admin-hours-panel mb-3">
          <Card.Body>
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <Form.Label className="filter-label">
                  <FiCalendar /> Start Date
                </Form.Label>
                <Form.Control
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Col>
              <Col md={3}>
                <Form.Label className="filter-label">
                  <FiCalendar /> End Date
                </Form.Label>
                <Form.Control
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Col>
              <Col md={2}>
                <Form.Label className="filter-label">
                  <FiFilter /> Status
                </Form.Label>
                <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Label className="filter-label">
                  <FiUser /> Team Member
                </Form.Label>
                <Form.Select
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                >
                  <option value="all">All members</option>
                  {memberOptions.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.user?.email || "Unknown member"}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={1}>
                <Button className="w-100 compact-action" variant="primary" onClick={loadData}>
                  Go
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card className="admin-hours-panel">
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
                <div className="mt-2 text-muted">Loading job hours...</div>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-5 text-muted">No jobs found.</div>
            ) : (
              <>
              <div className="datatable-toolbar">
                <div className="fw-semibold">
                  Showing {pageStart}-{pageEnd} of {filteredJobs.length} jobs
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="muted-line">Rows per page</span>
                  <Form.Select
                    size="sm"
                    value={pageSize}
                    onChange={(e) => {
                      setPage(1);
                      setPageSize(Number(e.target.value));
                    }}
                    style={{ width: 92 }}
                  >
                    {[20, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </Form.Select>
                </div>
              </div>

              <Table responsive hover className="hours-table mb-0">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Date</th>
                    <th>Status</th>
                    {/* <th>Total</th> */}
                    <th>Member Hours</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedJobs.map((job) => (
                    <tr key={job.id}>
                      <td style={{ minWidth: 260 }}>
                        <div className="fw-bold">{job.customer?.name || "No customer"}</div>
                        <div className="muted-line">{job.customer?.address || "-"}</div>
                        <div className="muted-line mt-1">
                          {job.crew?.name || "No crew"} · {job.job_type || "-"}
                        </div>
                      </td>
                      <td style={{ minWidth: 130 }}>
                        <div className="fw-semibold">{job.start_date || "-"}</div>
                        <div className="muted-line">{job.start || "-"}</div>
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <Badge bg={statusBadgeVariant(job.computed_status)} pill>
                          {job.computed_status.toUpperCase()}
                        </Badge>
                        <Form.Select
                          size="sm"
                          className="mt-2"
                          value={job.status || job.computed_status}
                          disabled={savingStatusId === job.id}
                          onChange={(e) => requestStatusChange(job, e.target.value)}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Form.Select>
                      </td>
                      {/* <td style={{ minWidth: 100 }}>
                        <div className="fw-bold">
                          {formatHours(
                            memberFilter === "all"
                              ? job.total_minutes
                              : job.visibleMembers[0]?.minutes || 0
                          )}
                        </div>
                        <div className="muted-line">
                          {memberFilter === "all" ? "job total" : "member total"}
                        </div>
                      </td> */}
                      <td style={{ minWidth: 420 }}>
                        {job.visibleMembers.length === 0 ? (
                          <div className="muted-line">No assigned members.</div>
                        ) : (
                          job.visibleMembers.map((member) => (
                            <div className="member-row" key={member.user_id}>
                              <div>
                                <div className="fw-semibold">
                                  {member.user?.email || "Unknown member"}
                                </div>
                                <div className="member-role">{member.role || "worker"}</div>
                                <div className="member-session-times">
                                  {member.sessions.length > 0 ? (
                                    member.sessions.map((session) => (
                                      <span className="member-session-time" key={session.id}>
                                        <FiClock />
                                        {formatSessionWindow(session)}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="member-session-time">
                                      <FiClock />
                                      No time recorded
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="fw-bold">{formatHours(member.minutes)}</div>
                              <Button
                                size="sm"
                                variant="outline-dark"
                                className="compact-action"
                                onClick={() => openSessionModal(job, member)}
                              >
                                <FiEdit3 />
                                {member.minutes > 0 ? "Edit Hours" : "Add Hours"}
                              </Button>
                            </div>
                          ))
                        )}
                      </td>
                      <td style={{ minWidth: 130 }}>
                        <Button
                          size="sm"
                          variant="success"
                          className="compact-action"
                          disabled={job.assignedMembers.length === 0}
                          onClick={() =>
                            openSessionModal(
                              job,
                              memberFilter === "all"
                                ? null
                                : job.assignedMembers.find(
                                    (member) => member.user_id === memberFilter
                                  )
                            )
                          }
                        >
                          <FiPlus />
                          Add Hours
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <div className="datatable-footer">
                <div className="muted-line">
                  Page {page} of {totalPages}
                </div>
                <div className="page-controls">
                  <Button
                    size="sm"
                    variant="outline-dark"
                    disabled={page <= 1}
                    onClick={() => setPage(1)}
                  >
                    First
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-dark"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-dark"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    Next
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-dark"
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                  >
                    Last
                  </Button>
                </div>
              </div>
              </>
            )}
          </Card.Body>
        </Card>
      </Container>

      <Modal show={sessionModal.show} onHide={closeSessionModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {sessionModal.member?.minutes > 0 ? "Edit Member Hours" : "Add Member Hours"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <div className="fw-bold">{sessionModal.job?.customer?.name}</div>
            <div className="text-muted small">
              {sessionModal.job?.start_date} · {sessionModal.job?.crew?.name || "No crew"}
            </div>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Member</Form.Label>
            <Form.Select
              value={sessionForm.user_id}
              onChange={(e) => handleMemberChange(e.target.value)}
            >
              <option value="">Select member</option>
              {(sessionModal.job?.assignedMembers || []).map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.user?.email || "Unknown member"}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Hours</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="1"
                  value={sessionForm.hours}
                  onChange={(e) => updateTimeParts({ hours: e.target.value })}
                  placeholder="0"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Minutes</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                  value={sessionForm.minutes}
                  onChange={(e) =>
                    updateTimeParts({
                      minutes: String(
                        Math.min(59, Math.max(0, Number(e.target.value || 0)))
                      ),
                    })
                  }
                  placeholder="0"
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={closeSessionModal} disabled={savingSession}>
            Cancel
          </Button>
          <Button variant="dark" onClick={saveSession} disabled={savingSession}>
            {savingSession ? "Saving..." : "Save Hours"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={statusConfirm.show} onHide={closeStatusConfirm} centered>
        <Modal.Header closeButton>
          <Modal.Title>Update Job Status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-2">
            Do you want to update status from{" "}
            <strong>{statusConfirm.from || "-"}</strong> to{" "}
            <strong>{statusConfirm.to || "-"}</strong>?
          </div>
          <div className="text-muted small">
            Job: {statusConfirm.job?.customer?.name || "Selected job"}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="light"
            onClick={closeStatusConfirm}
            disabled={!!savingStatusId}
          >
            Cancel
          </Button>
          <Button
            variant="dark"
            onClick={confirmStatusChange}
            disabled={!!savingStatusId}
          >
            {savingStatusId ? "Updating..." : "Yes"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
