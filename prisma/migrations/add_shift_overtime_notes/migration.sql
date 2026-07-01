-- Migration: Add shift/overtime fields and permission notes
-- Run this AFTER the timezone fix migration

-- Add new columns to schedules table
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS break_start TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS break_end TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS overtime_start TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS overtime_rate DOUBLE PRECISION DEFAULT 1.5;

-- Add notes column to permissions table
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS NOTES TEXT;
