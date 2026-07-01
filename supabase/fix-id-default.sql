-- Fix: Add DEFAULT gen_random_uuid() to all id columns
-- Run this in Supabase SQL Editor

ALTER TABLE employees ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE devices ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE attendance_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE schedules ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE employee_schedules ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE permissions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE api_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE webhook_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE employees ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE devices ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE employee_schedules ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE permissions ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE api_logs ALTER COLUMN created_at SET DEFAULT now();
