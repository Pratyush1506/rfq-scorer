import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data", "app.db");
const SEED_DIR = path.join(process.cwd(), "seed");

// Shape of each entry in seed/rfqs.json
export type RfqBody = {
  id: string;
  title: string;
  category: string;
  quantity: string;
  material: string;
  delivery: string;
  technical: string[];
  mandatory: string[];
  required: string[];
  preferred: string[];
};

export type Rfq = {
  id: string;
  title: string;
  body: RfqBody;
  markdown: string;
};

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS rfqs (
    id       TEXT PRIMARY KEY,  -- e.g. "RFQ-001"
    title    TEXT NOT NULL,     -- shown in the dropdown
    body     TEXT NOT NULL,     -- structured RFQ from rfqs.json, as JSON
    markdown TEXT NOT NULL      -- full human-readable seed/RFQ-xxx.md
  );

  CREATE TABLE IF NOT EXISTS evaluations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    rfq_id          TEXT    NOT NULL REFERENCES rfqs(id),
    rfq_title       TEXT    NOT NULL,  -- title at the time of evaluation
    vendor_name     TEXT    NOT NULL,
    vendor_profile  TEXT    NOT NULL,  -- exact text that was evaluated
    score           INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    result          TEXT    NOT NULL,  -- JSON: reasons and gaps
    model           TEXT    NOT NULL,  -- which LLM was used
    scoring_version TEXT    NOT NULL,  -- which prompt/rubric version produced the score
    created_at      TEXT    NOT NULL   -- ISO timestamp
  );

  CREATE INDEX IF NOT EXISTS evaluations_created_at ON evaluations(created_at DESC);
`;

// Upserts every RFQ from seed/rfqs.json together with its matching markdown file.
// Safe to run repeatedly; existing rows are refreshed from the seed files.
export function seedRfqs(db: Database.Database): number {
  const rfqs: RfqBody[] = JSON.parse(
    fs.readFileSync(path.join(SEED_DIR, "rfqs.json"), "utf8"),
  );

  const upsert = db.prepare(`
    INSERT INTO rfqs (id, title, body, markdown)
    VALUES (@id, @title, @body, @markdown)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      body = excluded.body,
      markdown = excluded.markdown
  `);

  db.transaction(() => {
    for (const rfq of rfqs) {
      upsert.run({
        id: rfq.id,
        title: rfq.title,
        body: JSON.stringify(rfq),
        markdown: fs.readFileSync(path.join(SEED_DIR, `${rfq.id}.md`), "utf8"),
      });
    }
  })();

  return rfqs.length;
}

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

  // Seed on first run so a clean clone works without a separate step.
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM rfqs").get() as {
    count: number;
  };
  if (count === 0) seedRfqs(db);

  return db;
}

// Reuse one connection across dev-server hot reloads.
const globalForDb = globalThis as unknown as { db?: Database.Database };
export const db = globalForDb.db ?? open();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

type RfqRow = { id: string; title: string; body: string; markdown: string };

function toRfq(row: RfqRow): Rfq {
  return { ...row, body: JSON.parse(row.body) as RfqBody };
}

export function listRfqs(): { id: string; title: string }[] {
  return db.prepare("SELECT id, title FROM rfqs ORDER BY id").all() as {
    id: string;
    title: string;
  }[];
}

export function getRfq(id: string): Rfq | undefined {
  const row = db.prepare("SELECT * FROM rfqs WHERE id = ?").get(id) as
    | RfqRow
    | undefined;
  return row && toRfq(row);
}

export type EvaluationResult = {
  reasons: string[];
  gaps: string[];
};

export type Evaluation = {
  id: number;
  rfqId: string;
  rfqTitle: string;
  vendorName: string;
  vendorProfile: string;
  score: number;
  result: EvaluationResult;
  model: string;
  scoringVersion: string;
  createdAt: string;
};

type EvaluationRow = {
  id: number;
  rfq_id: string;
  rfq_title: string;
  vendor_name: string;
  vendor_profile: string;
  score: number;
  result: string;
  model: string;
  scoring_version: string;
  created_at: string;
};

function toEvaluation(row: EvaluationRow): Evaluation {
  return {
    id: row.id,
    rfqId: row.rfq_id,
    rfqTitle: row.rfq_title,
    vendorName: row.vendor_name,
    vendorProfile: row.vendor_profile,
    score: row.score,
    result: JSON.parse(row.result) as EvaluationResult,
    model: row.model,
    scoringVersion: row.scoring_version,
    createdAt: row.created_at,
  };
}

export function insertEvaluation(
  e: Omit<Evaluation, "id" | "createdAt">,
): Evaluation {
  const row = db
    .prepare(
      `INSERT INTO evaluations
         (rfq_id, rfq_title, vendor_name, vendor_profile, score, result, model, scoring_version, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`,
    )
    .get(
      e.rfqId,
      e.rfqTitle,
      e.vendorName,
      e.vendorProfile,
      e.score,
      JSON.stringify(e.result),
      e.model,
      e.scoringVersion,
      new Date().toISOString(),
    ) as EvaluationRow;
  return toEvaluation(row);
}

export function listEvaluations(limit = 50): Evaluation[] {
  const rows = db
    .prepare("SELECT * FROM evaluations ORDER BY created_at DESC, id DESC LIMIT ?")
    .all(limit) as EvaluationRow[];
  return rows.map(toEvaluation);
}
