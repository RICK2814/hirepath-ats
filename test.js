const assert = require("assert");
process.env.NODE_ENV = "test";
// Tests TRUNCATE every table. Never inherit DATABASE_URL from the shell: use TEST_DATABASE_URL, and only a *_test database.
const testUrl = process.env.TEST_DATABASE_URL || "postgresql://ats:ats@localhost:5432/ats_test";
if (!/_test(\?.*)?$/.test(testUrl)) throw new Error("Refusing to run: the test database name must end in _test (set TEST_DATABASE_URL)");
process.env.DATABASE_URL = testUrl;
process.env.APPLY_LIMIT = "6";
process.env.WS_HEARTBEAT_MS = "1000"; // exercise session revocation without waiting for the production 30 s heartbeat
delete process.env.ANTHROPIC_API_KEY; delete process.env.RESEND_API_KEY;
const app = require("./server.ts");
const srv = app.listen(0, async () => {
  const b = `http://localhost:${srv.address().port}`; let tok = "";
  const j = (u, m = "GET", body) => fetch(b + u, { method: m, headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok }, body: body && JSON.stringify(body) });
  const login = async (e, p) => (await (await fetch(b + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e, password: p }) })).json());
  try {
    await app.resetDb(); await app.seed();
    assert.equal((await j("/api/candidates")).status, 401);
    assert.equal((await j("/api/calendar.ics")).status, 401);
    assert.ok((await login("admin@ats.dev", "bad")).error);
    tok = (await login("recruiter@ats.dev", "recruit123")).token; assert.ok(tok);
    const l = await (await j("/api/candidates?limit=5")).json(); assert.equal(l.items.length, 5); assert.equal(l.total, 14); assert.equal(l.pages, 3);
    assert.equal((await (await j("/api/candidates?q=react")).json()).total, 1);
    assert.equal((await (await j("/api/candidates?stage=Hired&sort=name&dir=asc")).json()).total, 1);
    assert.equal((await j("/api/candidates", "POST", { name: "x" })).status, 400);
    assert.equal((await j("/api/candidates", "POST", { name: "Bad rating", email: "bad-rating@example.com", rating: 9 })).status, 400);
    assert.equal((await j("/api/candidates", "POST", { name: "Bad role", email: "bad-role@example.com", job_id: "1; DROP TABLE jobs" })).status, 400);
    assert.equal((await j("/api/jobs", "POST", { title: "Bad extra", is_admin: true })).status, 400);
    const c = await (await j("/api/candidates", "POST", { name: "Zed", email: "Z@E.com", job_id: "1", rating: 5, skills: "React, TypeScript" })).json();
    assert.equal(c.email, "z@e.com"); assert.equal(c.rating, 5); assert.equal(c.events.length, 1);
    const u = await (await j("/api/candidates/" + c.id, "PUT", { stage: "Interview" })).json(); assert.equal(u.events.length, 2);
    const interviewAt = new Date(Date.now() + 86400000).toISOString();
    assert.equal((await j(`/api/candidates/${c.id}/interview`, "PUT", { interview_at: interviewAt, duration_minutes: 60 })).status, 200);
    const calendar = await (await j("/api/calendar.ics")).text(); assert.ok(calendar.includes("BEGIN:VEVENT") && calendar.includes("Interview: Zed"));
    assert.equal((await j(`/api/candidates/${c.id}/interview`, "PUT", { interview_at: "tomorrow" })).status, 400);
    assert.equal((await j(`/api/candidates/${c.id}/interview`, "PUT", { interview_at: interviewAt, duration_minutes: 1000 })).status, 400);
    const semantic = await (await j("/api/candidates/semantic-search?q=React%20TypeScript&limit=5")).json(); assert.ok(Array.isArray(semantic.results) && semantic.results.length > 0);
    assert.equal((await j("/api/candidates/" + c.id, "PUT", { stage: "Nope" })).status, 400);
    assert.equal((await (await j(`/api/candidates/${c.id}/notes`, "POST", { body: "Good call" })).json()).events.length, 3);
    assert.equal((await j(`/api/candidates/${c.id}/match`, "POST")).status, 200);
    const up = await fetch(`${b}/api/candidates/${c.id}/resume`, { method: "POST", headers: { Authorization: "Bearer " + tok, "x-filename": "cv.txt" }, body: "Built apps with GraphQL and Tailwind" });
    const uc = await up.json(); assert.equal(up.status, 201); assert.ok(/graphql/i.test(uc.skills));
    assert.equal((await fetch(`${b}/api/candidates/${c.id}/resume`, { method: "POST", headers: { Authorization: "Bearer " + tok, "x-filename": "x.exe" }, body: "x" })).status, 400);
    const mt = await (await j(`/api/candidates/${c.id}/match`, "POST")).json(); const mj = JSON.parse(mt.match_json);
    assert.equal(mj.engine, "keyword engine"); assert.ok(mj.score >= 40 && mj.gaps.includes("design systems"), JSON.stringify(mj));
    assert.equal((await j(`/api/candidates/${c.id}/resume`)).status, 200);
    const good = { scores: { Technical: 4, Communication: 5, "Problem solving": 4, "Culture add": 3 }, recommendation: "yes", comment: "Solid" };
    assert.equal((await j(`/api/candidates/${c.id}/scorecards`, "POST", { ...good, scores: { ...good.scores, Technical: 9 } })).status, 400);
    assert.equal((await j(`/api/candidates/${c.id}/scorecards`, "POST", { ...good, recommendation: "maybe" })).status, 400);
    await j(`/api/candidates/${c.id}/scorecards`, "POST", good);
    const sc = await (await j(`/api/candidates/${c.id}/scorecards`, "POST", { ...good, recommendation: "strong_yes" })).json();
    assert.equal(sc.scorecards.length, 1); assert.equal(sc.scorecards[0].overall, 4); assert.equal(sc.scorecards[0].recommendation, "strong_yes");
    assert.equal((await (await j("/api/candidates?q=zed")).json()).items[0].score_avg, 4);
    assert.equal((await j(`/api/candidates/${c.id}/email-draft?template=nope`)).status, 400);
    const dr = await (await j(`/api/candidates/${c.id}/email-draft?template=invite`)).json(); assert.ok(dr.body.startsWith("Hi Zed,") && dr.subject.includes("Senior Frontend"));
    const em = await (await j(`/api/candidates/${c.id}/email`, "POST", { subject: "Hi\r\nBcc: x@y.z", body: dr.body })).json();
    assert.equal(em.status, "simulated"); assert.ok(em.candidate.events.some(e => e.type === "email" && !e.body.includes("\n")));
    assert.equal((await j(`/api/candidates/${c.id}/email`, "POST", { subject: "", body: "x" })).status, 400);
    const s = await (await j("/api/stats")).json(); assert.equal(s.total, 15); assert.equal(s.weekly.length, 8);
    assert.ok((await (await j("/api/candidates/export")).text()).startsWith("name,email"));
    assert.equal((await j("/api/candidates/" + c.id, "DELETE")).status, 403);
    tok = (await login("admin@ats.dev", "admin123")).token;
    assert.equal((await j("/api/candidates/" + c.id, "DELETE")).status, 204);
    assert.equal((await j("/api/candidates/" + c.id)).status, 404);
    // public careers API (no auth). Rate limit is 5 submissions per IP, so keep the count in mind.
    const pub = (body) => fetch(b + "/api/public/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const waitFor = async (fn, message, tries = 40) => { for (let i = 0; i < tries; i++) { const value = await fn(); if (value) return value; await new Promise(r => setTimeout(r, 50)); } throw new Error(message); };
    const pj = await (await fetch(b + "/api/public/jobs")).json(); assert.ok(pj.length > 0); assert.ok(!("applicants" in pj[0]) && !("status" in pj[0]));
    assert.equal((await fetch(b + "/careers")).status, 200);
    const app1 = { job_id: String(pj[0].id), name: "Pat Public", email: "Pat@Example.com", cover: "Keen to join", resume_name: "cv.txt", resume_b64: Buffer.from("GraphQL and Tailwind").toString("base64"), consent: true };
    assert.equal((await pub(app1)).status, 201);
    assert.equal((await pub(app1)).status, 201); // duplicate looks like success but creates nothing
    assert.equal((await (await j("/api/candidates?q=pat@example.com")).json()).total, 1);
    assert.equal((await pub({ ...app1, email: "bad" })).status, 400);
    assert.equal((await pub({ ...app1, email: "nc@x.com", consent: false })).status, 400); // consent is mandatory
    assert.equal((await pub({ ...app1, email: "bot@x.com", website: "spam.com" })).status, 201);
    assert.equal((await (await j("/api/candidates?q=bot@x.com")).json()).total, 0);
    await j("/api/jobs/" + pj[1].id, "PUT", { status: "closed" });
    assert.equal((await pub({ ...app1, email: "q@x.com", job_id: String(pj[1].id) })).status, 400);
    await waitFor(async () => app.prisma.email.count({ where: { to_addr: "pat@example.com", status: "queued" } }), "acknowledgement email was not queued");
    assert.equal(await app.processEmails(), 1); // outbox worker sends the queued acknowledgement
    const pc = (await (await j("/api/candidates?q=pat@example.com")).json()).items[0];
    const pd = await (await j("/api/candidates/" + pc.id)).json();
    assert.equal(pd.source, "Careers page"); assert.equal(pd.stage, "Applied"); assert.ok(/graphql/i.test(pd.skills));
    assert.ok(pd.events.some(e => /Cover note/.test(e.body)) && pd.events.some(e => e.type === "email" && /simulated/.test(e.body)));
    assert.equal((await j(`/api/candidates/${pc.id}/resume`)).status, 200);
    assert.equal((await pub({ ...app1, email: "again@x.com" })).status, 429);
    // realtime: unauthenticated sockets are refused, authenticated ones get candidate events
    const wsUrl = b.replace("http", "ws") + "/ws";
    const open = (auth) => new Promise((ok, no) => { const w = new WebSocket(wsUrl); w.onopen = () => w.send(JSON.stringify({ type: "auth", token: auth })); w.onerror = no; w.q = []; w.onmessage = e => { const m = JSON.parse(e.data); w.q.push(m); w.onwaiter && w.onwaiter(); }; w.onclose = e => { w.closed = e.code; w.onwaiter && w.onwaiter(); }; ok(w); });
    const until = (w, f) => new Promise((ok, no) => { const chk = () => { const r = f(w); if (r) { ok(r); return true; } }; if (chk()) return; w.onwaiter = chk; setTimeout(() => no(new Error("ws timeout")), 5000); });
    const bad = await open("nope"); assert.equal(await until(bad, w => w.closed), 4401);
    const good2 = await open(tok); await until(good2, w => w.q.find(m => m.type === "ready"));
    await fetch(b + "/api/candidates/" + pc.id, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok, "x-client": "tabA" }, body: JSON.stringify({ stage: "Screening" }) });
    const ev = await until(good2, w => w.q.find(m => m.type === "candidate" && m.action === "updated" && m.src === "tabA"));
    assert.equal(ev.id, pc.id); assert.equal(ev.name, "Pat Public");
    good2.close();
    // CSV export neutralises spreadsheet formulas typed by applicants
    await j("/api/candidates", "POST", { name: "=1+1", email: "f@x.com" });
    assert.ok((await (await j("/api/candidates/export")).text()).includes(`"\'=1+1"`));
    // same email + role twice is refused
    assert.equal((await j("/api/candidates", "POST", { name: "Dup", email: "dup@e.com", job_id: 1 })).status, 201);
    const dupRes = await j("/api/candidates", "POST", { name: "Dup", email: "dup@e.com", job_id: 1 }); assert.equal(dupRes.status, 409);
    // email outbox: a failing provider keeps the message queued with backoff instead of losing it
    const cand = await app.prisma.candidate.findFirst({ where: { email: "dup@e.com" } });
    await app.prisma.email.create({ data: { candidate_id: cand.id, to_addr: "dup@e.com", subject: "Retry me", body: "x", status: "queued", next_at: new Date(), user_name: "System" } });
    process.env.RESEND_API_KEY = "re_invalid_test_key"; assert.equal(await app.processEmails(), 1); delete process.env.RESEND_API_KEY;
    const q1 = await app.prisma.email.findFirst({ where: { subject: "Retry me" } }); assert.equal(q1.status, "queued"); assert.equal(q1.attempts, 1); assert.ok(q1.next_at > new Date()); assert.ok(q1.last_error);
    assert.equal(await app.processEmails(), 0); // not due yet
    // anonymise: admin only, erases personal data, keeps stage history
    const rtok = (await login("recruiter@ats.dev", "recruit123")).token, atok = tok; tok = rtok;
    assert.equal((await j(`/api/candidates/${cand.id}/anonymise`, "POST")).status, 403);
    tok = atok; await j(`/api/candidates/${cand.id}/notes`, "POST", { body: "phone 555-1234" });
    const testVector = "[" + Array.from({ length: 384 }, (_, i) => i === 0 ? 1 : 0).join(",") + "]";
    await app.prisma.$executeRaw`UPDATE candidates SET embedding = ${testVector}::vector WHERE id = ${cand.id}`;
    assert.equal((await j(`/api/candidates/${cand.id}/anonymise`, "POST")).status, 200);
    const clearedEmbedding = await app.prisma.$queryRaw`SELECT embedding IS NULL AS cleared FROM candidates WHERE id = ${cand.id}`;
    assert.equal(clearedEmbedding[0].cleared, true);
    const an = await (await j("/api/candidates/" + cand.id)).json();
    assert.equal(an.name, "Anonymised candidate"); assert.ok(an.email.endsWith("@invalid.example"));
    assert.ok((await app.prisma.candidate.findUnique({ where: { id: cand.id } })).anonymised_at instanceof Date);
    assert.ok(an.events.some(e => e.type === "stage") && !an.events.some(e => /555-1234/.test(e.body)));
    assert.equal(await app.prisma.email.count({ where: { candidate_id: cand.id } }), 0);
    // retention sweep anonymises long-rejected candidates
    assert.equal(await app.retentionSweep(0), 0);
    assert.equal(await app.retentionSweep(1), 2); // the two seeded rejected candidates
    assert.equal(await app.prisma.candidate.count({ where: { stage: "Rejected", anonymised_at: null } }), 0);
    // export streams in batches of 500
    await app.prisma.candidate.createMany({ data: Array.from({ length: 1100 }, (_, i) => ({ name: "Bulk " + i, email: `bulk${i}@x.com`, created_at: new Date(Date.now() - i * 1000) })) });
    const bulk = (await (await j("/api/candidates/export?q=bulk")).text()).trim().split("\n"); assert.equal(bulk.length, 1101); assert.equal(new Set(bulk).size, 1101);
    // trigram search index exists and search still works with it
    assert.equal((await app.prisma.$queryRaw`SELECT 1 AS x FROM pg_indexes WHERE indexname = 'candidates_search_trgm_idx'`).length, 1);
    assert.equal((await (await j("/api/candidates?q=BULK77@X.COM")).json()).total, 1);
    assert.ok((await (await j("/api/candidates?q=frontend")).json()).total >= 1); // role title search
    // realtime: when the server's LISTEN connection dies, browsers are told to resync
    const ws3 = await open(tok); await until(ws3, w => w.q.find(m => m.type === "ready"));
    await app.prisma.$queryRaw`SELECT pg_terminate_backend(pid)::text FROM pg_stat_activity WHERE query = 'LISTEN ats_events' AND pid <> pg_backend_pid()`;
    await until(ws3, w => w.q.find(m => m.type === "resync")); ws3.close();
    // Revocation invalidates HTTP bearer tokens and closes established websocket sessions.
    const revokingSocket = await open(tok); await until(revokingSocket, w => w.q.find(m => m.type === "ready"));
    const oldToken = tok; assert.equal((await j("/api/auth/revoke-all", "POST", {})).status, 200);
    assert.equal((await fetch(b + "/api/auth/me", { headers: { Authorization: "Bearer " + oldToken } })).status, 401);
    // WebSocket revocation is checked on the bounded heartbeat interval.
    assert.equal(await until(revokingSocket, w => w.closed), 4401);
    tok = (await login("admin@ats.dev", "admin123")).token; assert.ok(tok);
    // production refuses to boot without a real JWT secret
    const boot = require("child_process").spawnSync(process.execPath, ["server.js"], { cwd: __dirname, env: { ...process.env, NODE_ENV: "production", JWT_SECRET: "" }, encoding: "utf8" });
    assert.notEqual(boot.status, 0); assert.ok(/JWT_SECRET/.test(boot.stderr), boot.stderr);
    // login limiter (stored in Postgres): must trip within 10 bad attempts. Keep this last, it locks this IP.
    let tripped = false; for (let i = 0; i < 10 && !tripped; i++) tripped = (await login("admin@ats.dev", "bad")).error?.startsWith("Too many");
    assert.ok(tripped, "login rate limit never tripped");
    console.log("all tests passed");
  } catch (e) { console.error(e); process.exitCode = 1; } finally { srv.closeAllConnections(); srv.close(); app.stopRealtime && app.stopRealtime(); await app.prisma.$disconnect(); }
});
app.attachRealtime(srv);
