/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState } from "react";
import { supabase } from "../supabase";
import Container from "react-bootstrap/Container";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Collapse from "react-bootstrap/Collapse";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Modal from "react-bootstrap/Modal";
import Card from "react-bootstrap/Card";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiBriefcase,
  FiSearch,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUsers,
  FiEye,
  FiEyeOff,
  FiImage,
  FiDownload,
  FiUser,
  FiInfo,
  FiFilter,
} from "react-icons/fi";
import {
  computeJobStatus,
  statusBadgeVariant,
  JOB_STATUS_FILTERS,
} from "../jobStatus";

export default function JobDetails() {
  const [jobs, setJobs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  const [search, setSearch] = React.useState("");
  const [jobDate, setJobDate] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);
  const [totalRows, setTotalRows] = React.useState(0);

  const [expanded, setExpanded] = React.useState({});
  const pageSizes = [10, 15, 30, 50, 100];

  const [mediaModalShow, setMediaModalShow] = useState(false);
  const [selectedJobMedia, setSelectedJobMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  function dateToDayIdx(dateStr) {
    if (!dateStr) return null;
    const idx = new Date(dateStr).getDay();
    return idx === 0 ? 6 : idx - 1;
  }

  const dayLabel = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  async function loadJobMedia(jobId) {
    try {
      setMediaLoading(true);

      const { data, error } = await supabase
        .from("job_media")
        .select(`
          *,
          uploader:user_id ( id, email )
        `)
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setSelectedJobMedia([]);
        setMediaModalShow(true);
        return;
      }

      const mediaWithUrls = await Promise.all(
        data.map(async (m) => {
          const { data: signed } = await supabase.storage
            .from("job-media")
            .createSignedUrl(m.file_url, 3600);

          return {
            ...m,
            signedUrl: signed?.signedUrl,
          };
        })
      );

      setSelectedJobMedia(mediaWithUrls);
      setMediaModalShow(true);
    } catch (err) {
      console.error(err);
      alert("Failed to load media");
    } finally {
      setMediaLoading(false);
    }
  }

  async function applySearchAndDateFilters(query) {
    if (search.trim() !== "") {
      const term = search.trim();

      const [{ data: matchingCustomers }, { data: matchingCrews }] =
        await Promise.all([
          supabase
            .from("customers")
            .select("id")
            .or(`name.ilike.%${term}%,address.ilike.%${term}%`),

          supabase
            .from("crews")
            .select("id")
            .ilike("name", `%${term}%`),
        ]);

      const customerIds = matchingCustomers?.map((c) => c.id) || [];
      const crewIds = matchingCrews?.map((c) => c.id) || [];

      if (customerIds.length === 0 && crewIds.length === 0) {
        return { query, empty: true };
      }

      const filters = [];

      if (customerIds.length > 0) {
        filters.push(`customer_id.in.(${customerIds.join(",")})`);
      }

      if (crewIds.length > 0) {
        filters.push(`crew_id.in.(${crewIds.join(",")})`);
      }

      query = query.or(filters.join(","));
    }

    if (jobDate) {
      const dayIdx = dateToDayIdx(jobDate);
      if (dayIdx !== null) query = query.eq("day_idx", dayIdx);
    }

    return { query, empty: false };
  }

  function baseJobsQuery(countExact = false) {
    return supabase
      .from("jobs")
      .select(
        `
          *,
          crew:crew_id ( id, name ),
          customer:customer_id ( id, name, address ),
          status_user:status_updated_by ( id, email ),
          created_by_user:created_by ( id, email )
        `,
        countExact ? { count: "exact" } : undefined
      )
      .order("created_at", { ascending: false });
  }

  async function enrichJobs(jobsData) {
    if (!jobsData?.length) return [];

    const jobIds = jobsData.map((j) => j.id);

    const [
      { data: mediaRows, error: mediaError },
      { data: sessions, error: sessionsErr },
      { data: assignments, error: assignErr },
    ] = await Promise.all([
      supabase.from("job_media").select("job_id").in("job_id", jobIds),
      supabase
        .from("job_work_sessions")
        .select("job_id, user_id, ended_at, duration_min")
        .in("job_id", jobIds),
      supabase.from("job_assignments").select("job_id, user_id").in("job_id", jobIds),
    ]);

    if (mediaError) throw mediaError;
    if (sessionsErr) throw sessionsErr;
    if (assignErr) throw assignErr;

    const mediaJobIds = new Set(mediaRows?.map((m) => m.job_id));

    const assigneesByJob = {};
    (assignments || []).forEach((a) => {
      if (!assigneesByJob[a.job_id]) assigneesByJob[a.job_id] = [];
      assigneesByJob[a.job_id].push(a.user_id);
    });

    return jobsData.map((job) => {
      const jobSessions = sessions?.filter((s) => s.job_id === job.id) || [];
      return {
        ...job,
        hasMedia: mediaJobIds.has(job.id),
        computed_status: computeJobStatus(
          job,
          jobSessions,
          assigneesByJob[job.id] || []
        ),
      };
    });
  }

  async function loadJobs() {
    setLoading(true);

    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const useServerPagination =
        statusFilter === "all" || statusFilter === "cancelled";

      let query = baseJobsQuery(useServerPagination);

      if (statusFilter === "cancelled") {
        query = query.eq("status", "cancelled");
      }

      const { query: filteredQuery, empty } = await applySearchAndDateFilters(query);

      if (empty) {
        setJobs([]);
        setTotalRows(0);
        return;
      }

      query = filteredQuery;

      if (useServerPagination) {
        const { data, error, count } = await query.range(from, to);

        if (error) throw error;

        if (!data?.length) {
          setJobs([]);
          setTotalRows(count || 0);
          return;
        }

        const enriched = await enrichJobs(data);
        setJobs(enriched);
        setTotalRows(count || 0);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;

      let enriched = await enrichJobs(data || []);
      enriched = enriched.filter((j) => j.computed_status === statusFilter);

      setTotalRows(enriched.length);
      setJobs(enriched.slice(from, to + 1));
    } catch (err) {
      console.error("loadJobs error:", err);
      alert(err.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (totalRows > 0) {
      const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
      if (page > totalPages) setPage(totalPages);
    }

    loadJobs();
  }, [page, pageSize, search, jobDate, statusFilter]);

  React.useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [totalRows, pageSize]);

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  function MediaSection({ title, media }) {
    if (!media.length) {
      return (
        <div className="mb-4">
          <h6 className="fw-bold">{title}</h6>
          <div className="text-muted small">No media uploaded.</div>
        </div>
      );
    }

    return (
      <div className="mb-4">
        <h6 className="fw-bold mb-3">
          {title} ({media.length})
        </h6>

        <Row>
          {media.map((m) => (
            <Col md={4} key={m.id} className="mb-3">
              <Card className="media-card border-0 h-100">
                <div className="media-preview">
                  {m.file_url.match(/\.(mp4|webm|mov)$/i) ? (
                    <video src={m.signedUrl} controls />
                  ) : (
                    <img src={m.signedUrl} alt="" />
                  )}
                </div>

                <Card.Body>
                  <div className="small text-muted">Uploaded by</div>

                  <div className="fw-semibold small mb-2">
                    {m.uploader?.email || "Unknown"}
                  </div>

                  <div className="small text-muted mb-2">
                    {new Date(m.created_at).toLocaleString()}
                  </div>

                  <a
                    href={m.signedUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-outline-success w-100 media-download"
                  >
                    <FiDownload />
                    Download
                  </a>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  return (
    <div className="job-details-page">
      <style>
        {`
          .job-details-page {
            min-height: 100vh;
            background:
              radial-gradient(circle at top left, rgba(59,130,246,.26), transparent 34%),
              radial-gradient(circle at bottom right, rgba(16,185,129,.18), transparent 30%),
              linear-gradient(135deg, #020617, #0f172a 48%, #1e293b);
            color: #fff;
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
            transition: all .25s ease;
            margin-bottom: 18px;
          }

          .back-btn:hover {
            transform: translateX(-3px);
            background: rgba(255,255,255,.18);
          }

          .page-title {
            font-size: 28px;
            font-weight: 800;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .page-subtitle {
            color: rgba(255,255,255,.65);
            font-size: 14px;
            margin-top: 6px;
          }

          .glass-panel {
            border-radius: 22px;
            border: 1px solid rgba(255,255,255,.12);
            background: rgba(255,255,255,.08);
            backdrop-filter: blur(16px);
            box-shadow: 0 18px 45px rgba(0,0,0,.28);
          }

          .filter-input,
          .filter-select {
            border-radius: 14px !important;
            border: 1px solid rgba(255,255,255,.12) !important;
            background: rgba(255,255,255,.96) !important;
            min-height: 46px;
          }

          .filter-label {
            color: rgba(255,255,255,.78);
            font-weight: 700;
            font-size: 13px;
          }

          .table-shell {
            border-radius: 22px;
            overflow: hidden;
            background: rgba(255,255,255,.96);
            box-shadow: 0 18px 45px rgba(0,0,0,.28);
          }

          .table-shell table {
            margin-bottom: 0;
          }

          .table-shell thead th {
            background: #0f172a !important;
            color: #fff !important;
            border-color: rgba(255,255,255,.08) !important;
            padding: 14px !important;
            white-space: nowrap;
          }

          .table-shell tbody td {
            vertical-align: middle;
            padding: 14px !important;
          }

          .view-btn {
            border-radius: 12px !important;
            display: inline-flex !important;
            align-items: center;
            gap: 6px;
            font-weight: 700 !important;
          }

          .details-panel {
            background: #f8fafc;
            color: #0f172a;
            padding: 18px;
          }

          .detail-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }

          .detail-box {
            border-radius: 14px;
            background: #fff;
            border: 1px solid #e2e8f0;
            padding: 12px;
          }

          .detail-label {
            color: #64748b;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 4px;
          }

          .mobile-job-card {
            border-radius: 22px;
            background: rgba(255,255,255,.96);
            color: #0f172a;
            box-shadow: 0 18px 42px rgba(0,0,0,.25);
            border: none;
            overflow: hidden;
            transition: all .25s ease;
          }

          .mobile-job-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 26px 55px rgba(0,0,0,.34);
          }

          .mobile-info {
            display: grid;
            grid-template-columns: 1fr;
            gap: 9px;
            margin: 14px 0;
          }

          .mobile-info-row {
            border-radius: 12px;
            background: #f8fafc;
            padding: 9px 11px;
            font-size: 14px;
          }

          .pagination-box {
            border-radius: 18px;
            background: rgba(255,255,255,.1);
            border: 1px solid rgba(255,255,255,.12);
            backdrop-filter: blur(14px);
            padding: 14px;
            color: #fff;
          }

          .pagination-btn {
            border-radius: 12px !important;
            font-weight: 700 !important;
          }

          .loading-box,
          .empty-box {
            border-radius: 22px;
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.12);
            backdrop-filter: blur(16px);
            padding: 55px 25px;
            text-align: center;
            box-shadow: 0 18px 45px rgba(0,0,0,.25);
          }

          .media-card {
            border-radius: 18px;
            overflow: hidden;
            box-shadow: 0 14px 34px rgba(15,23,42,.16);
          }

          .media-preview {
            height: 200px;
            overflow: hidden;
            background: #e2e8f0;
          }

          .media-preview img,
          .media-preview video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .media-download {
            border-radius: 12px !important;
            display: flex !important;
            align-items: center;
            justify-content: center;
            gap: 7px;
            font-weight: 700 !important;
          }

          .status-filter-wrap {
            margin-top: 4px;
          }

          .status-filter-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: rgba(255,255,255,.75);
            margin-bottom: 10px;
          }

          .status-filter-pills {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .status-filter-pill {
            border: 1px solid rgba(255,255,255,.2);
            background: rgba(255,255,255,.08);
            color: rgba(255,255,255,.88);
            border-radius: 999px;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all .2s ease;
          }

          .status-filter-pill:hover {
            background: rgba(255,255,255,.16);
            border-color: rgba(255,255,255,.35);
          }

          .status-filter-pill.active {
            background: linear-gradient(135deg, #38bdf8, #2563eb);
            border-color: transparent;
            color: #fff;
            box-shadow: 0 8px 22px rgba(37,99,235,.35);
          }

          @media (max-width: 768px) {
            .detail-grid {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <Container className="py-4">
        <button className="back-btn" onClick={() => navigate("/dashboard")}>
          <FiArrowLeft />
        </button>

        <div className="mb-4">
          <h2 className="page-title">
            <FiBriefcase />
            Job Details
          </h2>

          <div className="page-subtitle">
            View scheduled jobs, status, customer details, and uploaded job media.
          </div>
        </div>

        <div className="glass-panel p-3 mb-4">
          <Row className="g-3 align-items-end">
            <Col xs={12} md={4}>
              <Form.Group>
                <Form.Label className="filter-label">
                  <FiSearch /> Search
                </Form.Label>

                <Form.Control
                  className="filter-input"
                  placeholder="Search crew"
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                />
              </Form.Group>
            </Col>

            <Col xs={12} md={4}>
              <Form.Group>
                <Form.Label className="filter-label">
                  <FiCalendar /> Job Date
                </Form.Label>

                <Form.Control
                  className="filter-input"
                  type="date"
                  value={jobDate}
                  onChange={(e) => {
                    setPage(1);
                    setJobDate(e.target.value);
                  }}
                />
              </Form.Group>
            </Col>

            <Col xs={12} md={4}>
              <Form.Group>
                <Form.Label className="filter-label">
                  <FiInfo /> Rows per page
                </Form.Label>

                <Form.Select
                  className="filter-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPage(1);
                    setPageSize(Number(e.target.value));
                  }}
                >
                  {pageSizes.map((s) => (
                    <option key={s} value={s}>
                      {s} per page
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12}>
              <div className="status-filter-wrap">
                <div className="status-filter-label">
                  <FiFilter />
                  Status
                </div>
                <div className="status-filter-pills" role="group" aria-label="Filter by job status">
                  {JOB_STATUS_FILTERS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`status-filter-pill${statusFilter === opt.value ? " active" : ""}`}
                      onClick={() => {
                        setPage(1);
                        setStatusFilter(opt.value);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </Col>
          </Row>
        </div>

        <div className="d-none d-md-block table-shell">
          <Table bordered hover responsive>
            <thead>
              <tr>
                <th>Crew</th>
                <th>Customer</th>
                <th>Address</th>
                <th>Job Date</th>
                <th>Day</th>
                <th>Start</th>
                <th>Duration</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Details</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>
                    <div className="text-center py-4">
                      <Spinner animation="border" />
                      <div className="mt-2">Loading jobs...</div>
                    </div>
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={9}>No jobs found</td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const open = !!expanded[job.id];

                  return (
                    <React.Fragment key={job.id}>
                      <tr>
                        <td>
                          <FiUsers className="me-1" />
                          {job.crew?.name || "-"}
                        </td>
                        <td className="fw-semibold">{job.customer?.name || "-"}</td>
                        <td>{job.customer?.address || "-"}</td>
                        <td>{job.start_date || "---"}</td>
                        <td>
                          {typeof job.day_idx === "number"
                            ? dayLabel[job.day_idx]
                            : "-"}
                        </td>
                        <td>
                          <FiClock className="me-1" />
                          {job.start
                            ? new Date(`1970-01-01T${job.start}`).toLocaleTimeString(
                                [],
                                { hour: "numeric", minute: "2-digit" }
                              )
                            : "-"}
                        </td>
                        <td>
                          {job.duration_min != null
                            ? `${job.duration_min} min`
                            : "-"}
                        </td>
                        <td>
                          <Badge bg={statusBadgeVariant(job.computed_status)} pill>
                            {(job.computed_status || "new").toUpperCase()}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant={open ? "outline-dark" : "dark"}
                            className="view-btn"
                            onClick={() =>
                              setExpanded((p) => ({
                                ...p,
                                [job.id]: !open,
                              }))
                            }
                          >
                            {open ? <FiEyeOff /> : <FiEye />}
                            {open ? "Hide" : "View"}
                          </Button>
                        </td>
                      </tr>

                      <tr>
                        <td colSpan={9} className="p-0">
                          <Collapse in={open}>
                            <div className="details-panel">
                              <h6 className="fw-bold mb-3">Job Information</h6>

                              <div className="detail-grid">
                                <DetailBox label="Area" value={job.area || "-"} />
                                <DetailBox label="Job Type" value={job.job_type || "-"} />
                                <DetailBox label="Product" value={job.product || "-"} />
                                <DetailBox label="R-Value" value={job.r_value ?? "-"} />
                                <DetailBox label="SQFT" value={job.sqft ?? "-"} />
                                <DetailBox
                                  label="Thickness"
                                  value={`${job.thickness_in ?? "-"}"`}
                                />
                                <DetailBox
                                  label="Created By"
                                  value={job.created_by_user?.email || "N/A"}
                                />
                                <DetailBox
                                  label="Created At"
                                  value={
                                    job.created_at
                                      ? new Date(job.created_at).toLocaleString()
                                      : "-"
                                  }
                                />
                              </div>

                              <div className="detail-box mt-3">
                                <div className="detail-label">Notes</div>
                                <div>{job.notes || "-"}</div>
                              </div>

                              {job.hasMedia && (
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="mt-3 view-btn"
                                  onClick={() => loadJobMedia(job.id)}
                                >
                                  <FiImage />
                                  View Media
                                </Button>
                              )}
                            </div>
                          </Collapse>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>

        <div className="d-block d-md-none">
          {loading ? (
            <div className="loading-box">
              <Spinner animation="border" variant="light" />
              <div className="mt-3" style={{ opacity: 0.75 }}>
                Loading jobs...
              </div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="empty-box">No jobs found</div>
          ) : (
            jobs.map((job) => {
              const open = !!expanded[job.id];

              return (
                <Card key={job.id} className="mobile-job-card mb-3">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <h5 className="fw-bold mb-1">{job.customer?.name}</h5>

                        <div className="text-muted small d-flex gap-1">
                          <FiMapPin />
                          <span>{job.customer?.address || "-"}</span>
                        </div>
                      </div>

                      <Badge bg={statusBadgeVariant(job.computed_status)} pill>
                        {(job.computed_status || "new").toUpperCase()}
                      </Badge>
                    </div>

                    <div className="mobile-info">
                      <div className="mobile-info-row">
                        <strong>Start Date:</strong> {job.start_date || "---"}
                      </div>
                      <div className="mobile-info-row">
                        <strong>Day:</strong>{" "}
                        {typeof job.day_idx === "number"
                          ? dayLabel[job.day_idx]
                          : "-"}
                      </div>
                      <div className="mobile-info-row">
                        <strong>Start:</strong>{" "}
                        {job.start
                          ? new Date(`1970-01-01T${job.start}`).toLocaleTimeString(
                              [],
                              { hour: "numeric", minute: "2-digit" }
                            )
                          : "-"}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={open ? "outline-dark" : "dark"}
                      className="w-100 view-btn justify-content-center"
                      onClick={() =>
                        setExpanded((p) => ({
                          ...p,
                          [job.id]: !open,
                        }))
                      }
                    >
                      {open ? <FiEyeOff /> : <FiEye />}
                      {open ? "Hide Details" : "View Details"}
                    </Button>

                    <Collapse in={open}>
                      <div className="mt-3">
                        <div className="detail-grid">
                          <DetailBox
                            label="Created By"
                            value={job.created_by_user?.email || "N/A"}
                          />
                          <DetailBox label="Crew" value={job.crew?.name || "-"} />
                          <DetailBox label="Duration" value={job.duration_min != null ? `${job.duration_min} min` : "-"} />
                          <DetailBox label="Area" value={job.area || "-"} />
                          <DetailBox label="Job Type" value={job.job_type || "-"} />
                          <DetailBox label="Product" value={job.product || "-"} />
                          <DetailBox label="R-Value" value={job.r_value ?? "-"} />
                          <DetailBox label="SQFT" value={job.sqft ?? "-"} />
                          <DetailBox
                            label="Thickness"
                            value={`${job.thickness_in ?? "-"}"`}
                          />
                        </div>

                        <div className="detail-box mt-3">
                          <div className="detail-label">Notes</div>
                          <div>{job.notes || "-"}</div>
                        </div>

                        {job.hasMedia && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="mt-3 w-100 view-btn justify-content-center"
                            onClick={() => loadJobMedia(job.id)}
                          >
                            <FiImage />
                            View Media
                          </Button>
                        )}
                      </div>
                    </Collapse>
                  </Card.Body>
                </Card>
              );
            })
          )}
        </div>

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mt-4 gap-2 pagination-box">
          <div>
            <Button
              variant="light"
              size="sm"
              className="pagination-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>{" "}

            <Button
              variant="light"
              size="sm"
              className="pagination-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>

          <div>
            Page {page} of {totalPages} — Showing {jobs.length || 0} rows
          </div>

          <div>
            <Form.Select
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
              }}
              style={{ width: 140 }}
              size="sm"
            >
              {pageSizes.map((s) => (
                <option key={s} value={s}>
                  {s} / page
                </option>
              ))}
            </Form.Select>
          </div>
        </div>

        <Modal
          show={mediaModalShow}
          onHide={() => setMediaModalShow(false)}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <FiImage className="me-2" />
              Job Media
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {mediaLoading && (
              <div className="text-center py-4">
                <Spinner animation="border" />
              </div>
            )}

            {!mediaLoading && selectedJobMedia.length === 0 && (
              <Alert variant="info">No media found for this job.</Alert>
            )}

            {!mediaLoading && selectedJobMedia.length > 0 && (
              <>
                <MediaSection
                  title="Before Work"
                  media={selectedJobMedia.filter(
                    (m) => m.media_type === "before"
                  )}
                />

                <hr />

                <MediaSection
                  title="After Work"
                  media={selectedJobMedia.filter(
                    (m) => m.media_type === "after"
                  )}
                />
              </>
            )}
          </Modal.Body>
        </Modal>
      </Container>
    </div>
  );
}

function DetailBox({ label, value }) {
  return (
    <div className="detail-box">
      <div className="detail-label">{label}</div>
      <div className="fw-semibold">{value}</div>
    </div>
  );
}
