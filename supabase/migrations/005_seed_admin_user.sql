-- Migration 005: Seed an admin user
-- Run this after 004_rls_policies.sql

-- IMPORTANT: Change this password hash before running!
-- The hash below is for password: "admin123" (using bcrypt, 10 rounds)
-- Generate your own hash at: https://bcrypt-generator.com/

-- Default admin credentials:
-- Email: admin@tantechllc.com
-- Password: admin123 (CHANGE THIS!)

INSERT INTO public.users (name, email, password_hash, role)
VALUES (
  'Admin User',
  'admin@tantechllc.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- bcrypt hash of "admin123"
  'admin'
)
ON CONFLICT (email) DO NOTHING;

-- Optional: Create a test employee user
-- Password: employee123
INSERT INTO public.users (name, email, password_hash, role)
VALUES (
  'Test Employee',
  'employee@tantechllc.com',
  '$2a$10$YourHashHere', -- Replace with bcrypt hash of your chosen password
  'employee'
)
ON CONFLICT (email) DO NOTHING;
