-- Backfill jobs that were completed through job_work_sessions
-- but still have jobs.status saved as "started".
--
-- Run once in Supabase SQL editor if old completed jobs still show as started
-- in places that read the raw jobs.status column.

UPDATE jobs AS j
SET
  status = 'completed',
  status_updated_by = COALESCE(j.status_updated_by, s.completed_by)
FROM (
  SELECT
    job_id,
    (ARRAY_AGG(user_id ORDER BY ended_at DESC NULLS LAST))[1] AS completed_by
  FROM job_work_sessions
  GROUP BY job_id
  HAVING
    COUNT(*) > 0
    AND BOOL_OR(ended_at IS NOT NULL OR COALESCE(duration_min, 0) > 0)
    AND BOOL_AND(ended_at IS NOT NULL OR COALESCE(duration_min, 0) > 0)
) AS s
WHERE
  j.id = s.job_id
  AND j.status = 'started';
