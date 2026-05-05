import { NextRequest, NextResponse } from "next/server";
import { listPlayers } from "@/lib/sessions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const players = await listPlayers(id);
  return NextResponse.json({ players });
}
