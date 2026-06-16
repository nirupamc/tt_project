#!/usr/bin/env node

/**
 * Script to run migrations directly using Supabase client
 * Usage: node run-migration.js
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, "supabase/migrations/20260512_assign_supervisor_omar_ansari.sql");
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, "utf-8");
    
    console.log("📋 Running migration: 20260512_assign_supervisor_omar_ansari.sql");
    console.log("---");

    // Execute the SQL
    const { error } = await supabase.rpc("exec", { sql });

    if (error) {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    }

    console.log("---");
    console.log("✅ Migration completed successfully!");
    console.log("\n📝 Summary:");
    console.log("   - Created/updated Omar Ansari as supervisor (omaransari@tantech-llc.com)");
    console.log("   - Assigned Omar Ansari as supervisor for all employees");
    
  } catch (error) {
    console.error("❌ Error running migration:", error);
    process.exit(1);
  }
}

runMigration();
