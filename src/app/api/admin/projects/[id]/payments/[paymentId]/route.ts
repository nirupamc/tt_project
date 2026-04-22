import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  try {
    const { id, paymentId } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("payment_logs")
      .update({
        payment_date: body.payment_date,
        inr_amount: Number(body.inr_amount),
        utr_reference: body.utr_reference,
        usd_equivalent: Number(body.usd_equivalent),
        payment_method: body.payment_method,
        notes: body.notes || null,
      })
      .eq("id", paymentId)
      .eq("project_id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating payment log:", error);
    return NextResponse.json(
      { message: "Failed to update payment log" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  try {
    const { id, paymentId } = await params;
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("payment_logs")
      .delete()
      .eq("id", paymentId)
      .eq("project_id", id);

    if (error) throw error;
    return NextResponse.json({ message: "Payment log deleted" });
  } catch (error) {
    console.error("Error deleting payment log:", error);
    return NextResponse.json(
      { message: "Failed to delete payment log" },
      { status: 500 },
    );
  }
}
