const BASE = "http://localhost:3100";
let pass = 0, fail = 0; const failures = [];
const ok = (cond, label, extra = "") => { if (cond) pass++; else { fail++; failures.push(label + (extra ? ` -> ${extra}` : "")); } };

class Client {
  constructor() { this.cookie = ""; }
  async req(path, { method = "GET", body, headers = {}, redirect = "manual" } = {}) {
    const res = await fetch(BASE + path, { method, redirect, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { cookie: this.cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    const sc = res.headers.getSetCookie?.() ?? [];
    for (const c of sc) { const [pair] = c.split(";"); const [k, v] = pair.split("="); if (!v) this.cookie = ""; else this.cookie = `${k}=${v}`; }
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, headers: res.headers, setCookie: sc };
  }
}
const post = (c, p, b) => c.req(p, { method: "POST", body: b });
const patch = (c, p, b) => c.req(p, { method: "PATCH", body: b });
const del = (c, p) => c.req(p, { method: "DELETE" });
const line = (name, layer, color, pts) => ({ name, layer, color, points: pts });
const P = [[358000, 2799000], [358050, 2799010], [358100, 2799040]];

(async () => {
  const anon = new Client();
  // ---------- signed out ----------
  let r = await anon.req("/"); ok(r.status === 307 && r.headers.get("location")?.endsWith("/login"), "signed-out / redirects to /login", r.status);
  r = await anon.req("/admin"); ok(r.status === 307, "signed-out /admin redirects", r.status);
  r = await anon.req("/locate/demo"); ok(r.status === 307, "signed-out /locate redirects", r.status);
  r = await anon.req("/api/cables"); ok(r.status === 401, "signed-out /api/cables is 401", r.status);
  r = await anon.req("/api/users"); ok(r.status === 401, "signed-out /api/users is 401", r.status);
  r = await anon.req("/login"); ok(r.status === 200, "/login is open", r.status);
  r = await anon.req("/manifest.webmanifest"); ok(r.status === 200, "manifest open", r.status);
  r = await anon.req("/icon.svg"); ok(r.status === 200, "icon open", r.status);
  r = await anon.req("/api/auth/me"); ok(r.status === 200 && r.json.user === null && r.json.needsSetup === true, "me: nobody + needsSetup", JSON.stringify(r.json));
  r = await post(anon, "/api/auth/login", { fileNumber: "A1", password: "x" }); ok(r.status === 401, "login before setup fails", r.status);

  // ---------- first-run setup ----------
  r = await post(anon, "/api/auth/setup", { name: "", fileNumber: "CGC-1001", password: "longenough1" }); ok(r.status === 400, "setup: empty name 400", r.status);
  r = await post(anon, "/api/auth/setup", { name: "Boss", fileNumber: "no spaces!", password: "longenough1" }); ok(r.status === 400, "setup: bad file number 400", r.status);
  r = await post(anon, "/api/auth/setup", { name: "Boss", fileNumber: "CGC-1001", password: "short" }); ok(r.status === 400, "setup: short password 400", r.status);
  r = await post(anon, "/api/auth/setup", { name: "Boss", fileNumber: "cgc-1001", password: "longenough1" });
  ok(r.status === 200, "setup creates first admin", r.status);
  const sc = r.setCookie[0] ?? ""; ok(/HttpOnly/i.test(sc) && /SameSite=lax/i.test(sc) && /Path=\//.test(sc), "session cookie is HttpOnly + SameSite=Lax", sc);
  const admin = new Client(); admin.cookie = anon.cookie;
  r = await admin.req("/api/auth/me"); ok(r.json.user?.role === "admin" && r.json.user?.fileNumber === "CGC-1001" && r.json.needsSetup === false, "me: admin, file number upper-cased", JSON.stringify(r.json));
  r = await post(new Client(), "/api/auth/setup", { name: "Evil", fileNumber: "EVIL-1", password: "longenough1" }); ok(r.status === 403, "setup refuses once an account exists", r.status);

  // ---------- login / logout / wrong passwords ----------
  const t = new Client();
  r = await post(t, "/api/auth/login", { fileNumber: "CGC-1001", password: "wrongpass" }); ok(r.status === 401 && r.json.error === "Wrong file number or password", "wrong password 401", r.status);
  const unknown = await post(t, "/api/auth/login", { fileNumber: "NOBODY-9", password: "wrongpass" }); ok(unknown.status === 401 && unknown.json.error === r.json.error, "unknown file number gives the same message", unknown.json?.error);
  r = await post(t, "/api/auth/login", { fileNumber: "", password: "" }); ok(r.status === 401, "empty login 401", r.status);
  r = await t.req("/api/auth/login", { method: "POST", body: undefined }); ok(r.status === 401, "login with no body 401", r.status);
  r = await post(t, "/api/auth/login", { fileNumber: "  cgc-1001 ", password: "longenough1" }); ok(r.status === 200 && r.json.mustChangePassword === false, "login: file number trimmed and case-insensitive", r.status);
  r = await t.req("/api/cables"); ok(r.status === 200, "signed-in /api/cables 200", r.status);
  r = await post(t, "/api/auth/logout"); ok(r.status === 200 && t.cookie === "", "logout clears cookie", t.cookie);
  r = await t.req("/api/cables"); ok(r.status === 401, "after logout API is 401", r.status);
  r = await t.req("/"); ok(r.status === 307, "after logout page redirects", r.status);

  // ---------- lockout ----------
  const victim = await post(admin, "/api/users", { name: "Vic Tim", fileNumber: "VIC-2002", role: "ENGINEER", password: "temp12345" }); ok(victim.status === 200, "admin creates user", victim.status);
  const l = new Client(); let last;
  for (let i = 0; i < 5; i++) last = await post(l, "/api/auth/login", { fileNumber: "VIC-2002", password: "nope" + i });
  ok(last.status === 401, "5th wrong attempt still 401", last.status);
  last = await post(l, "/api/auth/login", { fileNumber: "VIC-2002", password: "temp12345" }); ok(last.status === 429, "locked after 5 failures, even with the right password", last.status);

  // ---------- users ----------
  r = await post(admin, "/api/users", { name: "Dup", fileNumber: "Vic-2002", role: "ENGINEER", password: "temp12345" }); ok(r.status === 409, "duplicate file number (any capitals) 409", r.status);
  r = await post(admin, "/api/users", { name: "Eng", fileNumber: "ENG-3003", role: "ENGINEER", password: "short" }); ok(r.status === 400, "short temp password 400", r.status);
  r = await post(admin, "/api/users", { name: "Eng", fileNumber: "bad!", role: "ENGINEER", password: "temp12345" }); ok(r.status === 400, "bad file number 400", r.status);
  r = await post(admin, "/api/users", { name: "", fileNumber: "E2-4004", role: "ENGINEER", password: "temp12345" }); ok(r.status === 400, "empty name 400", r.status);
  r = await post(admin, "/api/users", { name: "Eng One", fileNumber: "ENG-3003", role: "WEIRD", password: "temp12345" }); ok(r.status === 200, "unknown role falls back to engineer", r.status);
  r = await admin.req("/api/users"); const eng = r.json.users.find((u) => u.fileNumber === "ENG-3003");
  ok(eng?.role === "ENGINEER" && eng.mustChangePassword === true && !("passwordHash" in eng), "user list: role engineer, must change, no hash leaked", JSON.stringify(eng));
  ok(r.json.meId && r.json.users.length === 3, "user list has 3 and meId", r.json.users.length);

  // engineer session
  const e = new Client();
  r = await post(e, "/api/auth/login", { fileNumber: "ENG-3003", password: "temp12345" }); ok(r.status === 200 && r.json.mustChangePassword === true, "engineer login flags must-change", JSON.stringify(r.json));
  const oldEngCookie = e.cookie;
  r = await e.req("/api/cables"); ok(r.status === 200, "engineer can read cables", r.status);
  r = await post(e, "/api/cables", { project: "X", zone: 40, cables: [line("A", "ETC", "", P)] }); ok(r.status === 403, "engineer cannot add cables", r.status);
  r = await e.req("/api/users"); ok(r.status === 403, "engineer cannot list users", r.status);
  r = await patch(e, `/api/users/${eng.id}`, { role: "ADMIN" }); ok(r.status === 403, "engineer cannot promote self", r.status);
  r = await patch(e, "/api/layouts", { from: "a", to: "b" }); ok(r.status === 403, "engineer cannot rename layouts", r.status);
  r = await del(e, "/api/layouts?name=a"); ok(r.status === 403, "engineer cannot delete layouts", r.status);
  r = await e.req("/admin"); ok(r.status === 307 && !r.headers.get("location")?.includes("/login"), "engineer /admin redirected home", `${r.status} ${r.headers.get("location")}`);
  r = await e.req("/admin/users"); ok(r.status === 307, "engineer /admin/users redirected", r.status);
  r = await e.req("/"); ok(r.status === 307 && r.headers.get("location")?.endsWith("/account"), "must-change user is sent from / to /account", `${r.status} ${r.headers.get("location")}`);
  r = await e.req("/locate/demo"); ok(r.status === 307 && r.headers.get("location")?.endsWith("/account"), "must-change user is sent from /locate to /account", r.status);
  r = await e.req("/login"); ok(r.status === 307 && r.headers.get("location")?.endsWith("/account"), "signed-in must-change user skips /login", r.status);
  r = await e.req("/account"); ok(r.status === 200, "must-change user can open /account", r.status);
  const mcBody = JSON.parse(Buffer.from(e.cookie.split("=")[1].split(".")[0], "base64url").toString());
  ok(mcBody.mc === true && mcBody.fileNumber === "ENG-3003" && mcBody.name === "Eng One" && mcBody.role === "engineer" && !/hash|password/i.test(JSON.stringify(mcBody)), "cookie carries name, file number, role, must-change and no secrets", JSON.stringify(mcBody));

  // password change
  r = await post(e, "/api/auth/password", { current: "wrong", next: "newpass123" }); ok(r.status === 400, "password change: wrong current 400", r.status);
  r = await post(e, "/api/auth/password", { current: "temp12345", next: "short" }); ok(r.status === 400, "password change: short new 400", r.status);
  r = await post(new Client(), "/api/auth/password", { current: "a", next: "newpass123" }); ok(r.status === 401, "password change needs sign-in", r.status);
  r = await post(e, "/api/auth/password", { current: "temp12345", next: "newpass123" }); ok(r.status === 200, "password change ok", r.status);
  ok(/cl_session=/.test(r.setCookie[0] ?? ""), "password change issues a fresh cookie", r.setCookie[0] ?? "none");
  r = await e.req("/"); ok(r.status === 200, "after changing password the whole app opens", r.status);
  r = await e.req("/login"); ok(r.status === 307 && r.headers.get("location")?.endsWith("/") && !r.headers.get("location")?.endsWith("/account"), "signed-in user skips /login", r.headers.get("location"));
  r = await post(new Client(), "/api/auth/login", { fileNumber: "ENG-3003", password: "temp12345" }); ok(r.status === 401, "old password no longer works", r.status);
  const e2 = new Client(); r = await post(e2, "/api/auth/login", { fileNumber: "ENG-3003", password: "newpass123" }); ok(r.status === 200 && r.json.mustChangePassword === false, "new password works, no more must-change", JSON.stringify(r.json));

  // admin rules
  const me = (await admin.req("/api/auth/me")).json.user;
  r = await patch(admin, `/api/users/${me.id}`, { active: false }); ok(r.status === 400, "admin cannot disable self", r.status);
  r = await patch(admin, `/api/users/${me.id}`, { role: "ENGINEER" }); ok(r.status === 400, "admin cannot demote self", r.status);
  r = await patch(admin, `/api/users/${eng.id}`, { password: "abc" }); ok(r.status === 400, "reset with short password 400", r.status);
  r = await patch(admin, `/api/users/${eng.id}`, { password: "reset12345" }); ok(r.status === 200, "admin resets password", r.status);
  r = await post(new Client(), "/api/auth/login", { fileNumber: "ENG-3003", password: "reset12345" }); ok(r.status === 200 && r.json.mustChangePassword === true, "reset password forces change", JSON.stringify(r.json));
  r = await patch(admin, `/api/users/${eng.id}`, { active: false }); ok(r.status === 200, "admin disables engineer", r.status);
  r = await e2.req("/api/cables"); ok(r.status === 401, "disabled user's existing session stops working at once", r.status);
  r = await post(new Client(), "/api/auth/login", { fileNumber: "ENG-3003", password: "reset12345" }); ok(r.status === 403, "disabled user cannot sign in", r.status);
  r = await e2.req("/api/auth/me"); ok(r.json.user === null, "me is null for disabled user", JSON.stringify(r.json));
  r = await patch(admin, `/api/users/${eng.id}`, { active: true }); ok(r.status === 200, "admin re-enables", r.status);
  r = await patch(admin, `/api/users/nonexistent`, { active: false }); ok(r.status === 404, "patch unknown user is a clear 404", r.status);

  // role changes: the API follows the database at once; page access uses the cookie, so it needs a fresh sign-in
  r = await patch(admin, `/api/users/${eng.id}`, { role: "ADMIN" }); ok(r.status === 200, "promote engineer", r.status);
  r = await e2.req("/api/users"); ok(r.status === 200, "promoted user gets admin API access at once", r.status);
  r = await e2.req("/admin"); ok(r.status === 307, "promoted user needs a fresh sign-in for admin pages", r.status);
  r = await patch(admin, `/api/users/${eng.id}`, { role: "ENGINEER" }); ok(r.status === 200, "demote again", r.status);
  r = await e2.req("/api/users"); ok(r.status === 403, "demoted user loses admin API access at once", r.status);

  // file number rules and admin edits
  for (const bad of ["A", "has space", "bad!", "x".repeat(25), "-start", "a@b.co", ""]) { r = await post(admin, "/api/users", { name: "T", fileNumber: bad, role: "ENGINEER", password: "temp12345" }); ok(r.status === 400, `file number "${bad}" rejected`, r.status); }
  r = await post(admin, "/api/users", { name: "Slash", fileNumber: "cgc/55.a_b-c", role: "ENGINEER", password: "temp12345" }); ok(r.status === 200, "file number with / . _ - accepted", r.status);
  r = await admin.req("/api/users"); ok(r.json.users.some((u) => u.fileNumber === "CGC/55.A_B-C"), "stored in capitals", JSON.stringify(r.json.users.map((u) => u.fileNumber)));
  const slash = r.json.users.find((u) => u.fileNumber === "CGC/55.A_B-C");
  r = await patch(admin, `/api/users/${slash.id}`, { fileNumber: "vic-2002" }); ok(r.status === 409, "edit onto an existing file number 409", r.status);
  r = await patch(admin, `/api/users/${slash.id}`, { fileNumber: "bad!" }); ok(r.status === 400, "edit to an invalid file number 400", r.status);
  r = await patch(admin, `/api/users/${slash.id}`, { name: "   " }); ok(r.status === 400, "edit to a blank name 400", r.status);
  r = await patch(admin, `/api/users/${slash.id}`, { name: "سامي المهندس", fileNumber: "cgc-9090" }); ok(r.status === 200, "admin edits name (Arabic) and file number", r.status);
  r = await patch(admin, `/api/users/${slash.id}`, { fileNumber: "CGC-9090" }); ok(r.status === 200, "saving the same file number again is fine", r.status);
  const sl = new Client(); r = await post(sl, "/api/auth/login", { fileNumber: "cgc/55.a_b-c", password: "temp12345" }); ok(r.status === 401, "old file number no longer signs in", r.status);
  r = await post(sl, "/api/auth/login", { fileNumber: " cgc-9090", password: "temp12345" }); ok(r.status === 200, "new file number signs in", r.status);
  const slBody = JSON.parse(Buffer.from(sl.cookie.split("=")[1].split(".")[0], "base64url").toString()); ok(slBody.name === "سامي المهندس" && slBody.fileNumber === "CGC-9090", "cookie keeps the Arabic name", JSON.stringify(slBody));
  r = await patch(admin, `/api/users/${me.id}`, { fileNumber: "ceo-1" }); ok(r.status === 200, "admin can change their own file number", r.status);
  r = await post(new Client(), "/api/auth/login", { fileNumber: "CEO-1", password: "longenough1" }); ok(r.status === 200, "admin signs in with the new number", r.status);
  r = await patch(admin, `/api/users/${me.id}`, { fileNumber: "CGC-1001" }); ok(r.status === 200, "...and back again", r.status);

  // ---------- tampered / forged cookies ----------
  const forged = new Client(); const [pl, sg] = admin.cookie.split("=")[1].split(".");
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const body = JSON.parse(Buffer.from(pl, "base64url").toString());
  const tries = { "bad signature": `${pl}.AAAA`, "changed name": `${enc({ ...body, name: "Mallory" })}.${sg}`, "extended expiry": `${enc({ ...body, exp: Date.now() + 1e10 })}.${sg}`,
    "made someone else": `${enc({ ...body, id: "x" })}.${sg}`, "garbage": "garbage", "no signature": pl, "empty": "." };
  for (const [label, val] of Object.entries(tries)) {
    forged.cookie = `cl_session=${val}`;
    r = await forged.req("/api/cables"); ok(r.status === 401, `forged cookie (${label}) rejected by the API`, r.status);
    r = await forged.req("/admin"); ok(r.status === 307 && r.headers.get("location")?.endsWith("/login"), `forged cookie (${label}) cannot open /admin`, r.status);
    r = await forged.req("/login"); ok(r.status === 200, `forged cookie (${label}) still sees the login page`, r.status);
  }

  // ---------- layouts and lines ----------
  const L1 = [line("ETC 1", "ETC", "#8e44ad", P), line("ETC 2", "ETC", "#8e44ad", P.map(([e, n]) => [e, n + 5])), line("IRR 1", "IRR", "not-a-colour", P.map(([e, n]) => [e, n - 20]))];
  r = await post(admin, "/api/cables", { project: "Road A", zone: 40, cables: L1 }); ok(r.status === 200 && r.json.saved === 3, "admin saves a 3-line layout", JSON.stringify(r.json));
  r = await admin.req("/api/cables"); const list = r.json.cables;
  ok(list.length === 3 && list.every((c) => !("points" in c)) && list.every((c) => c.project === "Road A"), "list: 3 lines, no points", list.length);
  const irr = list.find((c) => c.name === "IRR 1"); ok(irr.color === "" && irr.layer === "IRR", "bad colour stored as empty, layer kept", JSON.stringify(irr));
  const etc1 = list.find((c) => c.name === "ETC 1"); ok(Math.abs(etc1.lengthM - (50.99 + 58.31)) < 0.1 && etc1.minE === 358000 && etc1.maxN === 2799040, "length and bounding box computed", JSON.stringify(etc1));
  r = await admin.req("/api/cables?project=Road%20A"); ok(r.json.cables.length === 3 && r.json.cables[0].points.length === 3 && Array.isArray(r.json.cables[0].points[0]), "layout fetch returns points", JSON.stringify(r.json).slice(0, 80));
  r = await admin.req("/api/cables?project=Nope"); ok(r.status === 200 && r.json.cables.length === 0, "unknown layout is empty, not an error", r.status);
  r = await admin.req("/api/cables?project="); ok(r.status === 200 && r.json.cables.length === 0, "empty project name works", r.status);
  r = await e2.req("/api/cables"); // engineer was disabled then re-enabled; old cookie valid again
  ok(r.status === 200, "re-enabled engineer's old session works again", r.status);
  r = await e2.req("/api/cables?project=Road%20A"); ok(r.status === 200 && r.json.cables.length === 3, "engineer can fetch a layout", r.status);

  // validation
  const v = (body) => post(admin, "/api/cables", body);
  r = await v({ project: "", zone: 40, cables: [line("A", "X", "", P)] }); ok(r.status === 400, "no layout name 400", r.status);
  r = await v({ project: "  ", zone: 40, cables: [line("A", "X", "", P)] }); ok(r.status === 400, "blank layout name 400", r.status);
  r = await v({ project: "x".repeat(81), zone: 40, cables: [line("A", "X", "", P)] }); ok(r.status === 400, "81-char layout name 400", r.status);
  r = await v({ project: "T", zone: 40, cables: [] }); ok(r.status === 400, "no lines 400", r.status);
  r = await v({ project: "T", zone: 0, cables: [line("A", "X", "", P)] }); ok(r.status === 400, "zone 0 400", r.status);
  r = await v({ project: "T", zone: 61, cables: [line("A", "X", "", P)] }); ok(r.status === 400, "zone 61 400", r.status);
  r = await v({ project: "T", zone: 40.5, cables: [line("A", "X", "", P)] }); ok(r.status === 400, "fractional zone 400", r.status);
  r = await v({ project: "T", zone: 40, cables: [line("", "X", "", P)] }); ok(r.status === 400, "empty line name 400", r.status);
  r = await v({ project: "T", zone: 40, cables: [line("a".repeat(121), "X", "", P)] }); ok(r.status === 400, "121-char line name 400", r.status);
  r = await v({ project: "T", zone: 40, cables: [line("A", "X", "", P), line("a", "X", "", P)] }); ok(r.status === 400, "duplicate names in one upload (case-insensitive) 400", r.status);
  r = await v({ project: "T", zone: 40, cables: [line("A", "X", "", [[1, 2]])] }); ok(r.status === 400, "single point 400", r.status);
  r = await v({ project: "T", zone: 40, cables: [line("A", "X", "", [[1, 2], ["a", 3]])] }); ok(r.status === 400, "non-numeric point 400", r.status);
  r = await v({ project: "T", zone: 40, cables: [line("A", "X", "", [[1, 2], [null, 3]])] }); ok(r.status === 400, "null point 400", r.status);
  r = await v({ project: "T", zone: 40, cables: [line("A", "X", "", "oops")] }); ok(r.status === 400, "points not an array 400", r.status);
  r = await v({ project: "T", zone: 40, cables: [line("A", "X", "", Array.from({ length: 20001 }, (_, i) => [i, i]))] }); ok(r.status === 400, "20001 points 400", r.status);
  r = await v({ project: "T", zone: 40, cables: [line("A", "X", "", Array.from({ length: 20000 }, (_, i) => [358000 + i, 2799000 + i]))] }); ok(r.status === 200, "20000 points accepted", r.status);
  r = await admin.req("/api/cables", { method: "POST", body: undefined }); ok(r.status === 400, "no body 400", r.status);
  r = await v({ project: "Road A", zone: 40, cables: [line("ETC 1", "ETC", "", P), line("NEW", "ETC", "", P)] }); ok(r.status === 409 && /ETC 1/.test(r.json.error), "name clash inside the same layout 409", JSON.stringify(r.json));
  r = await admin.req("/api/cables"); ok(r.json.cables.filter((c) => c.project === "Road A").length === 3 && !r.json.cables.some((c) => c.name === "NEW"), "409 saved nothing (no partial save)");
  r = await v({ project: "Road B", zone: 40, cables: [line("ETC 1", "ETC", "#abcdef", P)] }); ok(r.status === 200, "same line name in another layout is fine", r.status);
  r = await v({ project: "Road A", zone: 40, cables: [line("PW 1", "PW", "", P)] }); ok(r.status === 200, "adding to an existing layout works", r.status);
  r = await admin.req("/api/cables?project=Road%20A"); ok(r.json.cables.length === 4, "layout now has 4 lines", r.json.cables.length);
  r = await v({ project: "Odd <b>&\"'", zone: 40, cables: [line("<script>x</script>", "A&B", "", P)] }); ok(r.status === 200, "special characters stored", r.status);
  r = await admin.req("/api/cables?project=" + encodeURIComponent("Odd <b>&\"'")); ok(r.json.cables[0]?.name === "<script>x</script>", "special characters round-trip unchanged", JSON.stringify(r.json.cables?.[0]?.name));

  // patch/delete a line
  const all = (await admin.req("/api/cables")).json.cables; const a = all.find((c) => c.project === "Road A" && c.name === "ETC 2");
  r = await patch(admin, `/api/cables/${a.id}`, { name: "ETC 1" }); ok(r.status === 409, "rename onto an existing name 409", r.status);
  r = await patch(admin, `/api/cables/${a.id}`, { name: "   " }); ok(r.status === 400, "blank rename 400", r.status);
  r = await patch(admin, `/api/cables/${a.id}`, { name: "ETC 9", color: "#112233", layer: "TEL" }); ok(r.status === 200, "rename + recolour + relayer ok", r.status);
  r = await admin.req(`/api/cables/${a.id}`); ok(r.json.cable.name === "ETC 9" && r.json.cable.color === "#112233" && r.json.cable.layer === "TEL" && r.json.cable.points.length === 3, "single line fetch shows changes", JSON.stringify(r.json.cable).slice(0, 100));
  r = await patch(admin, `/api/cables/${a.id}`, { color: "red" }); ok(r.status === 200, "bad colour ignored, not an error", r.status);
  r = await admin.req(`/api/cables/${a.id}`); ok(r.json.cable.color === "#112233", "bad colour did not overwrite", r.json.cable.color);
  r = await patch(admin, `/api/cables/doesnotexist`, { name: "Z" }); ok(r.status === 404, "patch unknown line is a clear 404", r.status);
  r = await admin.req(`/api/cables/doesnotexist`); ok(r.status === 404, "get unknown line 404", r.status);
  r = await del(admin, `/api/cables/${a.id}`); ok(r.status === 200, "delete line ok", r.status);
  r = await del(admin, `/api/cables/${a.id}`); ok(r.status === 200, "delete again does not crash", r.status);
  r = await e2.req(`/api/cables/${etc1.id}`, { method: "PATCH", body: { name: "Hack" } }); ok(r.status === 403, "engineer cannot rename a line", r.status);
  r = await e2.req(`/api/cables/${etc1.id}`, { method: "DELETE" }); ok(r.status === 403, "engineer cannot delete a line", r.status);

  // layouts: rename, colour, delete
  r = await patch(admin, "/api/layouts", { from: "Road B", to: "Road A" }); ok(r.status === 409, "merging layouts with a clashing line name 409", r.status);
  r = await patch(admin, "/api/layouts", { from: "Road B", to: "Road C" }); ok(r.status === 200, "rename layout", r.status);
  r = await admin.req("/api/cables?project=Road%20C"); ok(r.json.cables.length === 1, "renamed layout has its line", r.json.cables.length);
  r = await patch(admin, "/api/layouts", { from: "Road C", to: "" }); ok(r.status === 400, "rename to empty 400", r.status);
  r = await patch(admin, "/api/layouts", { from: "Road C", to: "y".repeat(81) }); ok(r.status === 400, "rename to 81 chars 400", r.status);
  r = await patch(admin, "/api/layouts", { project: "Road A", layer: "ETC", color: "#00ff00" }); ok(r.status === 200, "recolour a kind of line", r.status);
  r = await admin.req("/api/cables?project=Road%20A"); ok(r.json.cables.filter((c) => c.layer === "ETC").every((c) => c.color === "#00ff00") && r.json.cables.filter((c) => c.layer !== "ETC").every((c) => c.color !== "#00ff00"), "only that kind was recoloured");
  r = await patch(admin, "/api/layouts", { project: "Road A", layer: "ETC", color: "green" }); ok(r.status === 400, "bad colour 400", r.status);
  r = await patch(admin, "/api/layouts", {}); ok(r.status === 400, "empty patch 400", r.status);
  r = await del(admin, "/api/layouts"); ok(r.status === 400, "delete without name 400", r.status);
  r = await del(admin, "/api/layouts?name=Road%20C"); ok(r.status === 200, "delete layout", r.status);
  r = await admin.req("/api/cables?project=Road%20C"); ok(r.json.cables.length === 0, "deleted layout is gone", r.json.cables.length);
  r = await del(admin, "/api/layouts?name=NeverExisted"); ok(r.status === 200, "delete unknown layout does not crash", r.status);

  // ---------- pages while signed in ----------
  const first = (await admin.req("/api/cables")).json.cables.find((c) => c.project === "Road A");
  for (const p of ["/", "/admin", "/admin/users", "/account", "/locate/demo", "/locate/Road%20A", "/locate/__ungrouped", "/locate/" + encodeURIComponent("Odd <b>&\"'")]) {
    r = await admin.req(p); ok(r.status === 200, `admin can open ${p}`, r.status);
  }
  r = await admin.req("/api/auth/me"); ok(r.json.user?.role === "admin", "admin session still fine at the end");
  r = await admin.req("/nonexistent-page"); ok(r.status === 404, "unknown page is 404 for signed-in user", r.status);
  r = await admin.req("/api/nonexistent"); ok(r.status === 404, "unknown API is 404", r.status);
  r = await admin.req("/api/auth/login"); ok(r.status === 405, "GET on login is 405", r.status);

  console.log(`\nPASSED ${pass}   FAILED ${fail}`);
  for (const f of failures) console.log("  FAIL:", f);
})().catch((e) => { console.error("TEST CRASH", e); process.exit(1); });
