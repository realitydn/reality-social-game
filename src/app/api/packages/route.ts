import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createPackage, listPackages } from "@/lib/packages";
import { getGameType } from "@/games/registry";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const gameType = url.searchParams.get("gameType") ?? undefined;
  const authorId = url.searchParams.get("authorId") ?? undefined;
  const packages = await listPackages({ gameType, authorId });
  return NextResponse.json({ packages });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { name?: string; gameType?: string; config?: unknown; content?: unknown }
    | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const gameType = (body.gameType ?? "").trim();
  if (!gameType || !getGameType(gameType))
    return NextResponse.json({ error: "unknown game type" }, { status: 400 });

  const created = await createPackage({
    name,
    gameType,
    authorId: user.id,
    config: body.config,
    content: body.content,
  });
  return NextResponse.json({ package: created }, { status: 201 });
}
