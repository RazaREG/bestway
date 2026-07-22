/**
 * Job status from work sessions.
 * A finished session is the source of truth when workers complete from My Jobs;
 * the jobs.status field can lag behind if it was only set to "started".
 */
export function computeJobStatus(job, jobSessions = []) {
  if (job.status === "cancelled") return "cancelled";
  if (job.status === "completed") return "completed";

  const sessions = jobSessions || [];
  if (sessions.length === 0) return "new";

  const isFinishedSession = (session) =>
    session.ended_at != null ||
    (session.duration_min != null && Number(session.duration_min) > 0);

  const hasActive = sessions.some(
    (s) => !isFinishedSession(s)
  );
  if (hasActive) return "started";

  return sessions.some(isFinishedSession) ? "completed" : "started";
}

/** Minutes worked in a session (minimum 1 when any time elapsed). */
export function workDurationMinutes(startedAt, endedAt = new Date()) {
  if (!startedAt) return 0;
  const ms = new Date(endedAt) - new Date(startedAt);
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / 60000));
}

export function formatSessionDuration(session) {
  if (!session?.started_at) return 0;
  const end = session.ended_at || new Date().toISOString();
  return workDurationMinutes(session.started_at, end);
}

export function statusBadgeVariant(status) {
  switch (status) {
    case "new":
      return "secondary";
    case "started":
      return "info";
    case "completed":
      return "success";
    case "cancelled":
      return "danger";
    default:
      return "secondary";
  }
}

export const JOB_STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "started", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];
