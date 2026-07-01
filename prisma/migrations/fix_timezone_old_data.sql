-- Fix timezone for old attendance_logs data
-- Old data: WIB time stored as UTC (e.g., 08:12 WIB stored as 08:12 UTC)
-- Fix: subtract 7 hours to convert to correct UTC (08:12 WIB = 01:12 UTC)
-- Run this ONCE after deploying the fixed code

UPDATE attendance_logs
SET scan_time = scan_time - INTERVAL '7 hours'
WHERE scan_time IS NOT NULL;

-- Verify the fix
-- SELECT scan_time, scan_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta' as wib_time
-- FROM attendance_logs
-- ORDER BY created_at DESC
-- LIMIT 10;
