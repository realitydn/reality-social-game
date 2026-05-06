import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { deletePackage, getPackage, updatePackage } from "@/lib/packages";
import type { PackageStatus } from "@/lib/packages";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const pkg = await getPackage(id);
  if (!pkg) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ package: pkg });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const existing = await getPackage(id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as
    | { name?: string; config?: unknown; content?: unknown; status?: string }
    | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const status = body.status as PackageStatus | undefined;
  if (status && !["draft", "published", "archived"].includes(status))
    return NextResponse.json({ error: "invalid status" }, { status: 400 });

  await updatePackage(id, {
    name: body.name?.trim() || undefined,
    config: body.config,
    content: body.content,
    status,
  });
  const updated = await getPackage(id);
  return NextResponse.json({ package: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await deletePackage(id);
  return NextResponse.json({ ok: true });
}
