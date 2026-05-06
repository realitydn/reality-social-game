import { getDB } from "./db";
import { shortId } from "./short-id";
import type { QuizRoundConfig, QuizRoundQuestion } from "@/games/quiz-round/state";

// A package is host-authored content slotted into a game. The `content` and
// `config` columns are JSON blobs — questions live there, not in their own
// tables, so question shapes can evolve without migrations.

export type PackageStatus = "draft" | "published" | "archived";

export type PackageRow = {
  id: string;
  name: string;
  game_type: string;
  author_id: string;
  config: string;
  content: string;
  status: PackageStatus;
  created_at: number;
  updated_at: number;
};

export type QuizRoundContent = { questions: QuizRoundQuestion[] };

export type ParsedPackage = Omit<PackageRow, "config" | "content"> & {
  config: QuizRoundConfig | Record<string, unknown>;
  content: QuizRoundContent | Record<string, unknown>;
  author_name: string | null;
};

function parseRow(
  row: PackageRow & { author_name: string | null },
): ParsedPackage {
  let config: QuizRoundConfig | Record<string, unknown>;
  let content: QuizRoundContent | Record<string, unknown>;
  try {
    config = JSON.parse(row.config) as QuizRoundConfig;
  } catch {
    config = {};
  }
  try {
    content = JSON.parse(row.content) as QuizRoundContent;
  } catch {
    content = { questions: [] };
  }
  return {
    id: row.id,
    name: row.name,
    game_type: row.game_type,
    author_id: row.author_id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author_name: row.author_name,
    config,
    content,
  };
}

export async function createPackage(input: {
  name: string;
  gameType: string;
  authorId: string;
  config?: unknown;
  content?: unknown;
}): Promise<ParsedPackage> {
  const db = await getDB();
  const id = shortId(8);
  const now = Date.now();
  const config = JSON.stringify(input.config ?? {});
  const content = JSON.stringify(input.content ?? { questions: [] });
  await db
    .prepare(
      `INSERT INTO packages (id, name, game_type, author_id, config, content, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    )
    .bind(id, input.name, input.gameType, input.authorId, config, content, now, now)
    .run();
  const created = await getPackage(id);
  if (!created) throw new Error("Package created but not found");
  return created;
}

export async function getPackage(id: string): Promise<ParsedPackage | null> {
  const db = await getDB();
  const row = await db
    .prepare(
      `SELECT p.id, p.name, p.game_type, p.author_id, p.config, p.content, p.status,
              p.created_at, p.updated_at, u.name AS author_name
         FROM packages p
         LEFT JOIN users u ON u.id = p.author_id
        WHERE p.id = ?`,
    )
    .bind(id)
    .first<PackageRow & { author_name: string | null }>();
  return row ? parseRow(row) : null;
}

export async function listPackages(opts: {
  gameType?: string;
  authorId?: string;
  limit?: number;
} = {}): Promise<ParsedPackage[]> {
  const db = await getDB();
  const where: string[] = [];
  const binds: (string | number)[] = [];
  if (opts.gameType) {
    where.push("p.game_type = ?");
    binds.push(opts.gameType);
  }
  if (opts.authorId) {
    where.push("p.author_id = ?");
    binds.push(opts.authorId);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 200);
  binds.push(limit);
  const result = await db
    .prepare(
      `SELECT p.id, p.name, p.game_type, p.author_id, p.config, p.content, p.status,
              p.created_at, p.updated_at, u.name AS author_name
         FROM packages p
         LEFT JOIN users u ON u.id = p.author_id
         ${whereSql}
        ORDER BY p.updated_at DESC
        LIMIT ?`,
    )
    .bind(...binds)
    .all<PackageRow & { author_name: string | null }>();
  return (result.results ?? []).map(parseRow);
}

export async function updatePackage(
  id: string,
  patch: Partial<{
    name: string;
    config: unknown;
    content: unknown;
    status: PackageStatus;
  }>,
): Promise<void> {
  const db = await getDB();
  const fields: string[] = [];
  const binds: (string | number)[] = [];
  if (patch.name !== undefined) {
    fields.push("name = ?");
    binds.push(patch.name);
  }
  if (patch.config !== undefined) {
    fields.push("config = ?");
    binds.push(JSON.stringify(patch.config));
  }
  if (patch.content !== undefined) {
    fields.push("content = ?");
    binds.push(JSON.stringify(patch.content));
  }
  if (patch.status !== undefined) {
    fields.push("status = ?");
    binds.push(patch.status);
  }
  if (!fields.length) return;
  fields.push("updated_at = ?");
  binds.push(Date.now());
  binds.push(id);
  await db
    .prepare(`UPDATE packages SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();
}

export async function deletePackage(id: string): Promise<void> {
  const db = await getDB();
  await db.prepare("DELETE FROM packages WHERE id = ?").bind(id).run();
}
