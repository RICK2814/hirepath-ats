#!/usr/bin/env node
// One-off import of an existing Hirepath SQLite database (and its uploads folder) into Postgres.
//   npm i --no-save better-sqlite3     (only needed for this script)
//   npm run db:deploy                  (create the tables first)
//   DATABASE_URL=postgresql://... node scripts/import-sqlite.js ./ats.db ./uploads
// Ids are preserved, resumes move into the database, and the target must be empty.
const fs = require("fs"), path = require("path");
const [dbFile, uploads] = process.argv.slice(2);
if (!dbFile || !process.env.DATABASE_URL) { console.error("usage: DATABASE_URL=postgresql://... node scripts/import-sqlite.js <ats.db> [uploads-dir]"); process.exit(1); }
let Sqlite; try { Sqlite = require("better-sqlite3"); } catch { console.error("better-sqlite3 is needed for this script: npm i --no-save better-sqlite3"); process.exit(1); }
const { PrismaClient } = require("../generated/client.ts"), { PrismaPg } = require("@prisma/adapter-pg");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const src = new Sqlite(dbFile, { readonly: true }), all = t => src.prepare(`SELECT * FROM ${t}`).all(), D = v => new Date(v), S = v => v ?? "";

(async () => {
  if ((await prisma.user.count()) + (await prisma.candidate.count())) throw new Error("Target database is not empty. Refusing to import.");
  const n = {};
  await prisma.$transaction(async tx => {
    n.users = (await tx.user.createMany({ data: all("users").map(r => ({ id: r.id, email: r.email, name: r.name, pass: r.pass, role: r.role || "recruiter" })) })).count;
    n.jobs = (await tx.job.createMany({ data: all("jobs").map(r => ({ id: r.id, title: r.title, department: S(r.department), location: S(r.location), description: S(r.description), status: r.status || "open", created_at: D(r.created_at) })) })).count;
    n.candidates = (await tx.candidate.createMany({ data: all("candidates").map(r => ({ id: r.id, name: r.name, email: r.email, phone: S(r.phone), job_id: r.job_id, skills: S(r.skills), source: r.source || "Careers page", rating: r.rating || 0,
      stage: r.stage, stage_at: D(r.stage_at), created_at: D(r.created_at), resume_name: r.resume_name, resume_text: S(r.resume_text), match_score: r.match_score, match_json: r.match_json })) })).count;
    n.events = (await tx.event.createMany({ data: all("events").map(r => ({ id: r.id, candidate_id: r.candidate_id, type: r.type, stage: r.stage, body: S(r.body), user_name: r.user_name || "System", at: D(r.at) })) })).count;
    n.scorecards = (await tx.scorecard.createMany({ data: all("scorecards").map(r => ({ id: r.id, candidate_id: r.candidate_id, user_id: r.user_id, user_name: r.user_name, recommendation: r.recommendation, scores: JSON.parse(r.scores), overall: r.overall, comment: S(r.comment), created_at: D(r.created_at) })) })).count;
    n.emails = (await tx.email.createMany({ data: all("emails").map(r => ({ id: r.id, candidate_id: r.candidate_id, to_addr: r.to_addr, subject: r.subject, body: r.body, status: r.status, user_name: r.user_name, at: D(r.at) })) })).count;
    n.resumes = 0;
    if (uploads) for (const c of all("candidates").filter(r => r.resume_name)) {
      const ext = [".pdf", ".txt", ".md"].find(e => fs.existsSync(path.join(uploads, c.id + e)));
      if (ext) { await tx.candidate.update({ where: { id: c.id }, data: { resume_ext: ext, resume_data: fs.readFileSync(path.join(uploads, c.id + ext)) } }); n.resumes++; }
      else console.warn(`candidate ${c.id}: resume file missing, keeping extracted text only`);
    }
    for (const t of ["users", "jobs", "candidates", "events", "scorecards", "emails"]) await tx.$queryRawUnsafe(`SELECT setval(pg_get_serial_sequence('${t}','id'), COALESCE((SELECT MAX(id) FROM ${t}), 1))::text`);
  }, { timeout: 300000, maxWait: 60000 });
  console.log("Imported:", JSON.stringify(n));
})().catch(e => { console.error("Import failed, nothing was written:", e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
