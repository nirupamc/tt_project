-- Migration 001: Enable required extensions
-- Run this first in Supabase SQL Editor

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional cryptographic functions (optional but useful)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
