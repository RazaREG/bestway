import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Spinner,
  Form,
  Container,
  Modal,
  Button,
  Badge,
} from "react-bootstrap";
import {
  FiArrowLeft,
  FiBriefcase,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiPlayCircle,
  FiCheckCircle,
  FiImage,
  FiUpload,
  FiTrash2,
  FiPackage,
  FiAlertTriangle,
} from "react-icons/fi";
import { useActionLock } from "../hooks/useActionLock";
import { compressImageFile } from "../utils/compressImage";
import {
  computeJobStatus,
  formatSessionDuration,
  workDurationMinutes,
} from "../jobStatus";
import {
  calcStockDeduction,
  getDeductRatio,
  maxEnterableQty,
  roundStock,
} from "../utils/inventoryStock";

/* ================= MAIN ================= */
export default function MyJobs() {
  const [sessions, setSessions] = useState({});
  const [teamSessionsByJob, setTeamSessionsByJob] = useState({});
  const [assigneesByJob, setAssigneesByJob] = useState({});
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const [mediaMap, setMediaMap] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState({});

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const activeSession = Object.values(sessions).find((s) => s && !s.ended_at);

  const [activeTab, setActiveTab] = useState("today");
  const [todayJobs, setTodayJobs] = useState([]);
  const [tomorrowJobs, setTomorrowJobs] = useState([]);
  const [showEmpty, setShowEmpty] = useState(false);

  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryUsage, setInventoryUsage] = useState({});
  const [completingJob, setCompletingJob] = useState(null);
  const [savingInventory, setSavingInventory] = useState(false);
  const [existingInventoryLog, setExistingInventoryLog] = useState(null);

  const { run: runLocked, isLocked } = useActionLock();

  useEffect(() => {
    loadJobs();

    const timer = setTimeout(() => {
      setShowEmpty(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [activeTab]);

  async function loadJobs() {
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      const { data: assignments, error: aErr } = await supabase
        .from("job_assignments")
        .select("job_id, user_id, role")
        .eq("user_id", user.id);

      if (aErr) throw aErr;

      if (!assignments.length) {
        setTodayJobs([]);
        setTomorrowJobs([]);
        return;
      }

      const jobIds = assignments.map((a) => a.job_id);

      const assigneeMap = {};
      assignments.forEach((a) => {
        if (!assigneeMap[a.job_id]) assigneeMap[a.job_id] = [];
        assigneeMap[a.job_id].push(a.user_id);
      });
      setAssigneesByJob(assigneeMap);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const { data: jobsData, error: jErr } = await supabase
        .from("jobs")
        .select(`*, customers(name, address)`)
        .in("id", jobIds)
        .in("start_date", [today, tomorrowStr]);

      if (jErr) throw jErr;

      const todayList = [];
      const tomorrowList = [];

      jobsData.forEach((j) => {
        const a = assignments.find((x) => x.job_id === j.id);
        const jobWithRole = { ...j, my_role: a?.role };

        if (j.start_date === today) {
          todayList.push(jobWithRole);
        } else if (j.start_date === tomorrowStr) {
          tomorrowList.push(jobWithRole);
        }
      });

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

      const { data: allSess } = await supabase
        .from("job_work_sessions")
        .select("*")
        .in("job_id", jobIds)
        .order("started_at", { ascending: false });

      const teamMap = {};
      const myMap = {};

      (allSess || []).forEach((s) => {
        if (!teamMap[s.job_id]) teamMap[s.job_id] = [];
        teamMap[s.job_id].push(s);

        if (s.user_id === user.id && !myMap[s.job_id]) {
          myMap[s.job_id] = s;
        }
      });

      setTeamSessionsByJob(teamMap);
      setSessions(myMap);

      const { data: mediaData, error: mErr } = await supabase
        .from("job_media")
        .select("*")
        .in("job_id", jobIds)
        .order("created_at", { ascending: false });

      if (mErr) throw mErr;

      const mediaWithUrls = await Promise.all(
        (mediaData || []).map(async (m) => {
          const { data } = await supabase.storage
            .from("job-media")
            .createSignedUrl(m.file_url, 3600);

          return {
            ...m,
            signedUrl: data?.signedUrl,
          };
        })
      );

      const grouped = {};
      mediaWithUrls.forEach((m) => {
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

  async function handleStart(job) {
    await runLocked(`start-${job.id}`, async () => {
      const existing = sessions[job.id];
      if (existing && !existing.ended_at) return;

      const confirmStart = window.confirm(
        "Are you sure you want to start this job?"
      );
      if (!confirmStart) return;

      const startedAt = new Date().toISOString();

      const { error: sessionError } = await supabase
        .from("job_work_sessions")
        .insert({
          job_id: job.id,
          user_id: user.id,
          started_at: startedAt,
        });

      if (sessionError) {
        alert(sessionError.message);
        return;
      }

      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: user.id,
        job_id: job.id,
        title: "Job Started",
        message: `Your job at ${job.customers?.name} has been started at ${new Date(
          startedAt
        ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
        type: "job_started",
      });

      if (notifError) {
        console.error("Failed to create notification:", notifError.message);
      }

      const { error: activityError } = await supabase
        .from("job_activity_log")
        .insert({
          job_id: job.id,
          user_id: user.id,
          action: "job_started",
          meta: {
            customer_name: job.customers?.name || "",
            address: job.customers?.address || "",
            job_type: job.job_type || "",
            area: job.area || "",
            sqft: job.sqft || 0,
            product: job.product || "",
            started_at: startedAt,
            started_by: user.email,
          },
        });

      if (activityError) {
        console.error("Activity log error:", activityError.message);
      }

      await loadJobs();
    });
  }

  async function handleComplete(job) {
    const session = sessions[job.id];
    if (!session || session.ended_at) return;

    await runLocked(`complete-${job.id}`, async () => {
      await handleCompleteFlow(job);
    });
  }

  async function handleCompleteFlow(job) {
    const session = sessions[job.id];
    if (!session || session.ended_at) return;

    const isLead = job.my_role === "lead";

    if (!isLead) {
      const ok = window.confirm(
        `Are you sure you want to complete this job for ${job.customers?.name}?`
      );

      if (!ok) return;

      await completeJob(job, [], {
        inventoryRequired: false,
        inventoryAlreadyAdded: false,
      });

      return;
    }

    try {
      const { data: logs, error: logError } = await supabase
        .from("job_activity_log")
        .select("id, user_id, created_at, meta")
        .eq("job_id", job.id)
        .eq("action", "job_completed")
        .order("created_at", { ascending: true });

      if (logError) throw logError;

      const inventoryLog = (logs || []).find(
        (log) =>
          Array.isArray(log?.meta?.materials_used) &&
          log.meta.materials_used.length > 0
      );

      setCompletingJob(job);
      setInventoryUsage({});

      if (inventoryLog) {
        setExistingInventoryLog(inventoryLog);
        setInventoryItems([]);
        setShowInventoryModal(true);
        return;
      }

      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .ilike("category", job.job_type);

      if (error) throw error;

      setExistingInventoryLog(null);
      setInventoryItems(data || []);
      setShowInventoryModal(true);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  async function completeJob(job, usedMaterials = [], options = {}) {
    return runLocked(`complete-exec-${job.id}`, async () => {
      try {
      const session = sessions[job.id];
      if (!session || session.ended_at) return;

      const end = new Date();
      const duration = workDurationMinutes(session.started_at, end);

      const { error } = await supabase
        .from("job_work_sessions")
        .update({
          ended_at: end.toISOString(),
          duration_min: duration,
        })
        .eq("id", session.id);

      if (error) throw error;

      const { error: jobStatusError } = await supabase
        .from("jobs")
        .update({
          status: "completed",
          status_updated_by: user.id,
        })
        .eq("id", job.id);

      if (jobStatusError) throw jobStatusError;

      const meta = {
        customer_name: job.customers?.name || "",
        address: job.customers?.address || "",
        completed_at: end.toISOString(),
        duration_minutes: duration,
        completed_by: user.email,
        completed_by_role: job.my_role || "",
      };

      if (options.inventoryRequired) {
        meta.materials_used = usedMaterials;
        meta.total_materials = usedMaterials.length;
        meta.inventory_already_added = !!options.inventoryAlreadyAdded;
        meta.inventory_added_by = options.inventoryAddedBy || user.email || user.id;
      }

      await supabase.from("job_activity_log").insert({
        job_id: job.id,
        user_id: user.id,
        action: "job_completed",
        meta,
      });

      setShowInventoryModal(false);
      setInventoryItems([]);
      setInventoryUsage({});
      setCompletingJob(null);
      setExistingInventoryLog(null);

      alert("Job completed successfully");
      await loadJobs();
    } catch (err) {
      alert(err.message);
    }
    });
  }

  async function confirmCompleteJob() {
    if (!completingJob) return;

    try {
      setSavingInventory(true);

      if (existingInventoryLog) {
        await completeJob(
          completingJob,
          existingInventoryLog.meta?.materials_used || [],
          {
            inventoryRequired: true,
            inventoryAlreadyAdded: true,
            inventoryAddedBy:
              existingInventoryLog.meta?.completed_by ||
              existingInventoryLog.meta?.inventory_added_by ||
              existingInventoryLog.user_id,
          }
        );

        return;
      }

      const usedMaterials = [];

      for (const item of inventoryItems) {
        const usedQty = Number(inventoryUsage[item.id] || 0);

        if (usedQty <= 0) continue;

        const { deduct, ratio, entered } = calcStockDeduction(usedQty, item);
        const maxQty = maxEnterableQty(item.stock_qty, ratio);

        if (entered > maxQty) {
          alert(
            `${item.name}: max ${maxQty} ${item.unit} (stock deducts ×${ratio})`
          );
          return;
        }

        const newStock = roundStock(item.stock_qty - deduct);

        usedMaterials.push({
          item_id: item.id,
          item_name: item.name,
          quantity: entered,
          deduct_ratio: ratio,
          stock_deducted: deduct,
          unit: item.unit,
          previous_stock: item.stock_qty,
          remaining_stock: newStock,
        });

        const { error: stockError } = await supabase
          .from("inventory_items")
          .update({
            stock_qty: newStock,
          })
          .eq("id", item.id);

        if (stockError) throw stockError;

        await supabase.from("inventory_logs").insert({
          item_id: item.id,
          quantity: deduct,
          action_type: "job_used",
          previous_stock: item.stock_qty,
          new_stock: newStock,
          note: `Job #${completingJob.id}: ${entered} ${item.unit} × ratio ${ratio}`,
          created_by: user.id,
        });

        if (newStock <= item.min_threshold) {
          await supabase.from("notifications").insert({
            user_id: "c2d4fe04-689c-47c2-a17c-f3fa9a7c2bf8",
            title: "Low Inventory Alert",
            message: `${item.name} stock is low`,
            type: "low_stock",
          });
        }
      }

      await completeJob(completingJob, usedMaterials, {
        inventoryRequired: true,
        inventoryAlreadyAdded: false,
        inventoryAddedBy: user.email || user.id,
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingInventory(false);
    }
  }

  function closeInventoryModal() {
    if (savingInventory) return;

    setShowInventoryModal(false);
    setInventoryItems([]);
    setInventoryUsage({});
    setCompletingJob(null);
    setExistingInventoryLog(null);
  }

  async function uploadMedia(job, files, type) {
    const fileList = Array.from(files || []);
    if (!fileList.length) return;

    await runLocked(`upload-${job.id}-${type}`, async () => {
    for (const file of fileList) {
      const uploadKey = `${job.id}-${type}`;

      setUploadingFiles((prev) => ({
        ...prev,
        [uploadKey]: (prev[uploadKey] || 0) + 1,
      }));

      try {
        const prepared = file.type?.startsWith("image/")
          ? await compressImageFile(file)
          : file;

        const ext =
          prepared.type === "image/jpeg"
            ? "jpg"
            : (prepared.name.split(".").pop() || "bin");
        const path = `${job.id}/${type}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("job-media")
          .upload(path, prepared);

        if (uploadError) throw uploadError;

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

        const { data: signed } = await supabase.storage
          .from("job-media")
          .createSignedUrl(path, 3600);

        const newMedia = {
          ...inserted,
          signedUrl: signed?.signedUrl,
        };

        setMediaMap((prev) => ({
          ...prev,
          [job.id]: [newMedia, ...(prev[job.id] || [])],
        }));
      } catch (err) {
        alert(err.message);
      } finally {
        setUploadingFiles((prev) => {
          const copy = { ...prev };
          const count = (copy[uploadKey] || 1) - 1;
          if (count <= 0) delete copy[uploadKey];
          else copy[uploadKey] = count;
          return copy;
        });
      }
    }
    });
  }

  const currentJobs = activeTab === "today" ? todayJobs : tomorrowJobs;
  const today = new Date().toISOString().split("T")[0];

  const isSameDay = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr).toISOString().split("T")[0] === today;
  };

  function formatTime(timeStr) {
    if (!timeStr) return "-";

    const [hours, minutes] = timeStr.split(":").map(Number);

    const date = new Date();
    date.setHours(hours, minutes);

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      <div className="my-jobs-page">
        <style>
          {`
            .my-jobs-page {
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

            .tab-wrap {
              background: rgba(255,255,255,.1);
              border: 1px solid rgba(255,255,255,.12);
              border-radius: 999px;
              padding: 5px;
              backdrop-filter: blur(14px);
              display: flex;
              gap: 5px;
            }

            .tab-btn {
              border: none;
              border-radius: 999px;
              padding: 10px 18px;
              font-weight: 700;
              transition: all .25s ease;
              color: #fff;
              background: transparent;
            }

            .tab-btn.active {
              background: linear-gradient(135deg, #38bdf8, #2563eb);
              box-shadow: 0 10px 24px rgba(37,99,235,.35);
            }

            .tab-btn:not(.active):hover {
              background: rgba(255,255,255,.12);
            }

            .job-card {
              border-radius: 24px !important;
              overflow: hidden;
              background: rgba(255,255,255,.96);
              color: #0f172a;
              box-shadow: 0 18px 42px rgba(0,0,0,.25);
              transition: all .25s ease;
              position: relative;
            }

            .job-card:hover {
              transform: translateY(-7px);
              box-shadow: 0 26px 55px rgba(0,0,0,.36);
            }

            .job-card::before {
              content: "";
              position: absolute;
              width: 160px;
              height: 160px;
              right: -70px;
              top: -70px;
              border-radius: 999px;
              background: rgba(37,99,235,.1);
            }

            .job-status {
              position: absolute;
              top: 16px;
              right: 16px;
              z-index: 2;
            }

            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-top: 18px;
            }

            .info-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              padding: 10px 12px;
              font-size: 13px;
            }

            .info-label {
              color: #64748b;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              margin-bottom: 3px;
            }

            .media-panel {
              margin-top: 20px;
              padding: 16px;
              border-radius: 18px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
            }

            .upload-box .form-control {
              border-radius: 12px;
            }

            .primary-job-btn {
              border: none;
              border-radius: 999px;
              min-height: 46px;
              font-weight: 800;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              transition: all .25s ease;
            }

            .primary-job-btn:hover:not(:disabled) {
              transform: translateY(-2px);
            }

            .start-btn {
              background: linear-gradient(135deg, #0f172a, #334155);
              color: #fff;
            }

            .complete-btn {
              background: linear-gradient(135deg, #10b981, #059669);
              color: #fff;
            }

            .disabled-btn {
              background: #e2e8f0;
              color: #64748b;
            }

            .started-wait-btn {
              background: linear-gradient(135deg, #0ea5e9, #0284c7);
              color: #fff;
              opacity: 0.92;
              cursor: not-allowed;
            }

            .empty-state,
            .loading-state {
              border-radius: 24px;
              background: rgba(255,255,255,.08);
              border: 1px solid rgba(255,255,255,.12);
              backdrop-filter: blur(16px);
              padding: 60px 30px;
              text-align: center;
              box-shadow: 0 18px 45px rgba(0,0,0,.25);
            }

            .empty-icon {
              width: 72px;
              height: 72px;
              border-radius: 22px;
              background: linear-gradient(135deg, #38bdf8, #2563eb);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 34px;
              margin: 0 auto 20px;
            }

            .gallery-thumb {
              position: relative;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 10px 24px rgba(0,0,0,.14);
              background: #e2e8f0;
            }

            .gallery-thumb img,
            .gallery-thumb video {
              width: 100%;
              height: 150px;
              object-fit: cover;
              display: block;
            }

            .delete-media-btn {
              position: absolute;
              top: 8px;
              right: 8px;
              width: 32px;
              height: 32px;
              border: none;
              border-radius: 10px;
              background: #dc2626;
              color: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .inventory-card {
              border-radius: 16px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 10px 24px rgba(15,23,42,.08);
            }

            @media (max-width: 576px) {
              .info-grid {
                grid-template-columns: 1fr;
              }

              .tab-btn {
                padding: 9px 14px;
              }
            }
          `}
        </style>

        <Container>
          <button className="back-btn" onClick={() => navigate("/dashboard")}>
            <FiArrowLeft />
          </button>

          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
            <div>
              <h3 className="page-title">
                <FiBriefcase />
                My Jobs
              </h3>
              <div className="page-subtitle">
                View assigned jobs, upload job media, and track work progress.
              </div>
            </div>

            <div className="tab-wrap">
              <button
                className={`tab-btn ${activeTab === "today" ? "active" : ""}`}
                onClick={() => setActiveTab("today")}
              >
                Today
              </button>

              <button
                className={`tab-btn ${activeTab === "tomorrow" ? "active" : ""}`}
                onClick={() => setActiveTab("tomorrow")}
              >
                Tomorrow
              </button>
            </div>
          </div>

          <Row>
            {currentJobs.length === 0 && !showEmpty ? (
              <Col xs={12}>
                <div className="loading-state">
                  <Spinner animation="border" variant="light" />
                  <p className="mt-3 mb-0" style={{ opacity: 0.7 }}>
                    Loading jobs...
                  </p>
                </div>
              </Col>
            ) : currentJobs.length === 0 ? (
              <Col xs={12}>
                <div className="empty-state">
                  <div className="empty-icon">
                    <FiCalendar />
                  </div>
                  <h4 className="fw-bold mb-2">
                    {activeTab === "today"
                      ? "No jobs scheduled today"
                      : "No jobs scheduled tomorrow"}
                  </h4>
                  <p style={{ opacity: 0.7, margin: 0 }}>
                    {activeTab === "today"
                      ? "You don’t have any assigned work today."
                      : "No upcoming jobs have been assigned yet."}
                  </p>
                </div>
              </Col>
            ) : (
              currentJobs.map((job) => {
                const session = sessions[job.id];
                const teamSessions = teamSessionsByJob[job.id] || [];
                const assigneeIds = assigneesByJob[job.id] || [];
                const teamStatus = computeJobStatus(
                  job,
                  teamSessions,
                  assigneeIds
                );

                const myWorkDone = !!session?.ended_at;
                const myWorkActive = session && !session.ended_at;
                const jobFullyComplete = teamStatus === "completed";
                const sessionMins =
                  session?.duration_min != null && session.duration_min > 0
                    ? session.duration_min
                    : formatSessionDuration(session);

                const isLead = job.my_role === "lead";

                const running =
                  activeSession &&
                  activeSession.job_id !== job.id &&
                  isSameDay(activeSession.started_at);

                return (
                  <Col md={6} key={job.id} className="mb-4">
                    <Card className="border-0 h-100 job-card">
                      <Card.Body>
                        <div className="job-status">
                          {jobFullyComplete ? (
                            <Badge bg="success" pill className="px-3 py-2">
                              Completed
                            </Badge>
                          ) : myWorkActive ? (
                            <Badge bg="warning" text="dark" pill className="px-3 py-2">
                              <Timer start={session.started_at} />
                            </Badge>
                          ) : myWorkDone ? (
                            <Badge bg="info" pill className="px-3 py-2">
                              Your work done
                            </Badge>
                          ) : !session && teamStatus === "started" ? (
                            <Badge bg="info" pill className="px-3 py-2">
                              Team in progress
                            </Badge>
                          ) : (
                            <Badge bg="secondary" pill className="px-3 py-2">
                              Pending
                            </Badge>
                          )}
                        </div>

                        <div style={{ paddingRight: 105 }}>
                          <h5 className="fw-bold mb-1">{job.customers?.name}</h5>

                          <div className="text-muted d-flex align-items-start gap-2">
                            <FiMapPin style={{ marginTop: 3 }} />
                            <span>{job.customers?.address}</span>
                          </div>
                        </div>

                        <div className="info-grid">
                          <InfoBox label="Job Type" value={job.job_type} />
                          <InfoBox label="Start Time" value={formatTime(job.start)} />
                          <InfoBox label="Duration" value={`${job.duration_min} mins`} />
                          <InfoBox label="Area" value={job.area} />
                          <InfoBox label="Sqft" value={job.sqft} />
                          <InfoBox label="Thickness" value={job.thickness_in} />
                          <InfoBox label="Product" value={job.product} />
                          <InfoBox label="Role" value={job.my_role || "-"} />
                        </div>

                        {isLead && activeTab === "today" && (
                          <div className="media-panel">
                            <h6 className="fw-bold d-flex align-items-center gap-2">
                              <FiImage />
                              Job Site Pictures / Videos
                            </h6>

                            <Form.Group className="mb-3 upload-box">
                              <Form.Label className="fw-semibold">
                                <FiUpload /> Before Work
                              </Form.Label>
                              <Form.Control
                                type="file"
                                multiple
                                accept="image/*,video/*"
                                disabled={isLocked(`upload-${job.id}-before`)}
                                onChange={async (e) => {
                                  const input = e.target;
                                  await uploadMedia(job, input.files, "before");
                                  input.value = "";
                                }}
                              />
                              <small className="text-muted">
                                You can add or update before photos anytime.
                              </small>
                            </Form.Group>

                            <Form.Group className="upload-box">
                              <Form.Label className="fw-semibold">
                                <FiUpload /> After Work
                              </Form.Label>
                              <Form.Control
                                type="file"
                                multiple
                                accept="image/*,video/*"
                                disabled={
                                  !session ||
                                  isLocked(`upload-${job.id}-after`)
                                }
                                onChange={async (e) => {
                                  const input = e.target;
                                  await uploadMedia(job, input.files, "after");
                                  input.value = "";
                                }}
                              />
                              <small className="text-muted">
                                {!session
                                  ? "Start the job to upload after-work media."
                                  : "You can add or update after photos once the job has started."}
                              </small>
                            </Form.Group>

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
                              jobStarted={!!session?.started_at}
                              mediaMap={mediaMap}
                              setMediaMap={setMediaMap}
                              uploadingFiles={uploadingFiles}
                            />
                          </div>
                        )}

                        {activeTab === "today" && (
                          <div className="mt-3">
                            {!session ? (
                              <button
                                className="primary-job-btn start-btn w-100"
                                disabled={
                                  running || isLocked(`start-${job.id}`)
                                }
                                onClick={() => handleStart(job)}
                              >
                                <FiPlayCircle />
                                {isLocked(`start-${job.id}`)
                                  ? "Starting..."
                                  : running
                                    ? "Another Job Running"
                                    : "Start Job"}
                              </button>
                            ) : myWorkDone ? (
                              <button
                                className="primary-job-btn disabled-btn w-100"
                                disabled
                              >
                                <FiCheckCircle />
                                {jobFullyComplete
                                  ? `Job completed (${sessionMins} mins)`
                                  : `Your work done (${sessionMins} mins)`}
                              </button>
                            ) : (
                              <JobCompleteButton
                                job={job}
                                session={session}
                                isLocked={isLocked}
                                savingInventory={savingInventory}
                                showInventoryModal={showInventoryModal}
                                completingJob={completingJob}
                                onComplete={() => handleComplete(job)}
                              />
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
      </div>

      <Modal show={showInventoryModal} onHide={closeInventoryModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FiPackage className="me-2" />
            {existingInventoryLog ? "Inventory Already Added" : "Materials Used"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="mb-3">
            <strong>Job:</strong> {completingJob?.customers?.name}
          </div>

          {existingInventoryLog ? (
            <>
              <div className="alert alert-info">
                Inventory was already added for this job by{" "}
                <strong>
                  {existingInventoryLog.meta?.completed_by ||
                    existingInventoryLog.meta?.inventory_added_by ||
                    existingInventoryLog.user_id}
                </strong>
                .
              </div>

              <div className="d-flex flex-column gap-3">
                {(existingInventoryLog.meta?.materials_used || []).map(
                  (item, index) => (
                    <Card key={`${item.item_id}-${index}`} className="inventory-card">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="fw-bold mb-1">{item.item_name}</h6>
                            <div className="text-muted small">
                              Used: {item.quantity} — {item.unit}
                            </div>
                          </div>

                          <Badge bg="success">
                            Remaining: {item.remaining_stock}
                          </Badge>
                        </div>
                      </Card.Body>
                    </Card>
                  )
                )}
              </div>
            </>
          ) : inventoryItems.length === 0 ? (
            <div className="text-center text-muted py-4">
              <FiAlertTriangle size={38} className="mb-2" />
              <div>No inventory items found for this category.</div>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {inventoryItems.map((item) => {
                const ratio = getDeductRatio(item);
                const entered = Number(inventoryUsage[item.id] || 0);
                const { deduct } = calcStockDeduction(entered, item);
                const remaining = roundStock(item.stock_qty - deduct);
                const maxQty = maxEnterableQty(item.stock_qty, ratio);

                return (
                  <Card key={item.id} className="inventory-card">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <h6 className="fw-bold mb-1">{item.name}</h6>

                          <div className="text-muted small">
                            In stock: {item.stock_qty} {item.unit}
                          </div>
                          <div className="text-muted small">
                            Deduct ratio: {ratio} (stock −{deduct || 0} per entry)
                          </div>
                        </div>

                        <Badge
                          bg={remaining <= item.min_threshold ? "danger" : "success"}
                        >
                          After: {remaining}
                        </Badge>
                      </div>

                      <Form.Control
                        type="number"
                        min={0}
                        max={maxQty}
                        step={ratio < 1 ? "1" : "1"}
                        placeholder={`Max ${maxQty}`}
                        value={inventoryUsage[item.id] || ""}
                        onChange={(e) =>
                          setInventoryUsage((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                      />
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={closeInventoryModal}>
            Cancel
          </Button>

          <Button
            variant="success"
            onClick={confirmCompleteJob}
            disabled={savingInventory}
          >
            {savingInventory ? "Completing..." : "Complete Job"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

/* ================= SMALL COMPONENTS ================= */
function InfoBox({ label, value }) {
  return (
    <div className="info-box">
      <div className="info-label">{label}</div>
      <div className="fw-semibold">{value || "-"}</div>
    </div>
  );
}

const COMPLETE_AVAILABLE_AFTER_SEC = 30;

function useElapsedSeconds(since) {
  const [sec, setSec] = useState(() =>
    since ? Math.floor((Date.now() - new Date(since)) / 1000) : 0
  );

  useEffect(() => {
    if (!since) return undefined;

    const tick = () => {
      setSec(Math.floor((Date.now() - new Date(since)) / 1000));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [since]);

  return sec;
}

/* ================= TIMER ================= */
function Timer({ start }) {
  const sec = useElapsedSeconds(start);
  const m = Math.floor(sec / 60);
  const s = sec % 60;

  return (
    <>
      <FiClock className="me-1" />
      {m}:{s.toString().padStart(2, "0")}
    </>
  );
}

function JobCompleteButton({
  job,
  session,
  isLocked,
  savingInventory,
  showInventoryModal,
  completingJob,
  onComplete,
}) {
  const elapsed = useElapsedSeconds(session.started_at);
  const canComplete = elapsed >= COMPLETE_AVAILABLE_AFTER_SEC;
  const remaining = Math.max(0, COMPLETE_AVAILABLE_AFTER_SEC - elapsed);

  const completing =
    isLocked(`complete-${job.id}`) ||
    isLocked(`complete-exec-${job.id}`);

  if (!canComplete) {
    return (
      <button className="primary-job-btn started-wait-btn w-100" disabled>
        <FiPlayCircle />
        Job started — complete available in {remaining}s
      </button>
    );
  }

  return (
    <button
      className="primary-job-btn complete-btn w-100"
      disabled={
        completing ||
        savingInventory ||
        (showInventoryModal && completingJob?.id === job.id)
      }
      onClick={onComplete}
    >
      <FiCheckCircle />
      {completing ? "Completing..." : "Complete Job"}
    </button>
  );
}

function MediaGallery({
  jobId,
  mediaMap,
  setMediaMap,
  uploadingFiles,
  jobStarted,
}) {
  const media = mediaMap[jobId] || [];

  async function deleteMedia(m) {
    if (!window.confirm("Remove this file?")) return;

    await supabase.storage.from("job-media").remove([m.file_url]);
    await supabase.from("job_media").delete().eq("id", m.id);

    setMediaMap((prev) => ({
      ...prev,
      [jobId]: prev[jobId].filter((x) => x.id !== m.id),
    }));
  }

  const before = media.filter((m) => m.media_type === "before");
  const after = media.filter((m) => m.media_type === "after");

  const handleRefresh = async () => {
    window.location.reload();
    return true;
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="mt-3">
        {["before", "after"].map((type) => {
            const list = type === "before" ? before : after;

            return (
              <div key={type} className="mb-3">
                <h6 className="fw-bold text-capitalize">
                  {type} Work ({list.length})
                </h6>

                <Row>
                  {list.map((m) => (
                    <Col md={4} key={m.id} className="mb-3">
                      <div className="gallery-thumb">
                        {m.file_url.match(/\.(mp4|webm|mov)$/i) ? (
                          <video src={m.signedUrl} controls />
                        ) : (
                          <img src={m.signedUrl} alt="" />
                        )}

                        <button
                          className="delete-media-btn"
                          onClick={() => deleteMedia(m)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </Col>
                  ))}

                  {(uploadingFiles[`${jobId}-${type}`] || 0) > 0 && (
                      <Col md={4} className="mb-3">
                        <div
                          className="gallery-thumb d-flex align-items-center justify-content-center"
                          style={{ height: 150 }}
                        >
                          <Spinner animation="border" />
                        </div>
                      </Col>
                    )}
                </Row>

                {list.length === 0 &&
                  !(uploadingFiles[`${jobId}-${type}`] || 0) && (
                  <div className="text-muted small">
                    {type === "after" && !jobStarted
                      ? "Start the job to upload after-work media."
                      : `No ${type} media uploaded.`}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </PullToRefresh>
  );
}
