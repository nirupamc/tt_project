import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("payment_logs")
      .select("*")
      .eq("project_id", id)
      .order("payment_date", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching payment logs:", error);
    return NextResponse.json(
      { message: "Failed to fetch payment logs" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("payment_logs")
      .insert({
        project_id: id,
        payment_date: body.payment_date,
        inr_amount: Number(body.inr_amount),
        utr_reference: body.utr_reference,
        usd_equivalent: Number(body.usd_equivalent),
        payment_method: body.payment_method,
        notes: body.notes || null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating payment log:", error);
    return NextResponse.json(
      { message: "Failed to create payment log" },
      { status: 500 },
    );
  }
}
