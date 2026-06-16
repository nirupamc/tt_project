#!/usr/bin/env node

/**
 * Script to assign Omar Ansari as supervisor for all employees
 * Run this script: node scripts/assign-supervisor.js
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  try {
    console.log("🔄 Assigning Omar Ansari as supervisor for all employees...\n");

    // Step 1: Find Omar Ansari (do NOT touch his password if he already exists)
    console.log("📝 Step 1: Looking up Omar Ansari...");
    const { data: existingOmar } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", "omaransari@tantech-llc.com")
      .maybeSingle();

    let omarId = existingOmar?.id;

    if (omarId) {
      if (existingOmar.role !== "supervisor") {
        const { error: roleError } = await supabase
          .from("users")
          .update({ role: "supervisor", job_title: "Supervisor" })
          .eq("id", omarId);
        if (roleError) {
          console.error("❌ Error updating Omar's role:", roleError);
          process.exit(1);
        }
      }
    } else {
      const { data: createdOmar, error: omarError } = await supabase
        .from("users")
        .insert({
          name: "Omar Ansari",
          email: "omaransari@tantech-llc.com",
          role: "supervisor",
          job_title: "Supervisor",
          password_hash: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy", // temporary default password, change after first login
        })
        .select("id")
        .single();

      if (omarError || !createdOmar) {
        console.error("❌ Error creating Omar Ansari:", omarError);
        process.exit(1);
      }
      omarId = createdOmar.id;
    }

    console.log(`✅ Omar Ansari ready (ID: ${omarId})`);

    // Step 2: Get all employees not yet supervised by Omar
    console.log("\n📝 Step 2: Finding employees not assigned to Omar...");
    const { data: allEmployees, error: employeesError } = await supabase
      .from("users")
      .select("id, name, email, supervisor_id")
      .eq("role", "employee");

    if (employeesError) {
      console.error("❌ Error fetching employees:", employeesError);
      process.exit(1);
    }

    const employees = (allEmployees || []).filter(
      (emp) => emp.supervisor_id !== omarId,
    );
    console.log(
      `✅ Found ${employees.length} employee(s) to update (${(allEmployees || []).length - employees.length} already assigned to Omar)`,
    );

    if (employees && employees.length > 0) {
      // Step 3: Update all employees to have Omar as supervisor
      console.log("\n📝 Step 3: Assigning Omar Ansari as supervisor...");
      
      for (const employee of employees) {
        const { error: updateError } = await supabase
          .from("users")
          .update({ supervisor_id: omarId })
          .eq("id", employee.id);

        if (updateError) {
          console.warn(`   ⚠️  Failed to update ${employee.name} (${employee.email}):`, updateError.message);
        } else {
          console.log(`   ✅ Updated: ${employee.name} (${employee.email})`);
        }
      }
    }

    // Step 4: Verify results
    console.log("\n📝 Step 4: Verifying updates...");
    const { data: updated, error: verifyError } = await supabase
      .from("users")
      .select("name, email, supervisor:supervisor_id(name, email)")
      .eq("role", "employee");

    if (verifyError) {
      console.warn("⚠️  Could not verify updates:", verifyError);
    } else {
      console.log(`✅ Verification complete:`);
      const withSupervisor = updated?.filter(u => u.supervisor) || [];
      console.log(`   - Employees with supervisors: ${withSupervisor.length}`);
      withSupervisor.slice(0, 3).forEach(emp => {
        console.log(`     • ${emp.name} → ${emp.supervisor?.name}`);
      });
      if (withSupervisor.length > 3) {
        console.log(`     ... and ${withSupervisor.length - 3} more`);
      }
    }

    console.log("\n✨ All done! Omar Ansari is now the supervisor for all employees.");
    console.log("\n📌 Note: Employees will see the supervisor info on refresh/reload.");

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

main();
