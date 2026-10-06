// In-memory stand-in for Prisma, loaded before Next starts. Mimics the parts of the API the app uses,
// including unique constraints (P2002), missing rows (P2025) and transaction rollback.
const crypto = require("crypto");
const newId = () => "c" + crypto.randomBytes(10).toString("hex");
const err = (code, msg) => Object.assign(new Error(msg), { code });
const store = { user: [], cable: [] };
const cfg = {
  user: { defaults: () => ({ role: "ENGINEER", active: true, mustChangePassword: false, failedLogins: 0, lockedUntil: null, lastLoginAt: null }), unique: [["email"]] },
  cable: { defaults: () => ({ project: "", layer: "", color: "", zone: 40 }), unique: [["project", "name"]] },
};
const matches = (row, where) => !where || Object.entries(where).every(([k, v]) =>
  v && typeof v === "object" && !(v instanceof Date) ? ("in" in v ? v.in.includes(row[k]) : false) : row[k] === v);
const clash = (name, rows, row, ignore) => cfg[name].unique.some((cols) => rows.some((r) => r !== ignore && cols.every((c) => r[c] === row[c])));
const sorter = (orderBy) => { const list = [].concat(orderBy || []); return (a, b) => { for (const o of list) { const [k, d] = Object.entries(o)[0]; if (a[k] < b[k]) return d === "asc" ? -1 : 1; if (a[k] > b[k]) return d === "asc" ? 1 : -1; } return 0; }; };
const pick = (row, select) => { if (!select) return { ...row }; const o = {}; for (const k of Object.keys(select)) if (select[k]) o[k] = row[k]; return o; };
const lazy = (fn) => ({ then: (res, rej) => { try { Promise.resolve(fn()).then(res, rej); } catch (e) { rej(e); } }, catch(rej) { return this.then(undefined, rej); } });

const model = (name) => ({
  findMany: (a = {}) => lazy(() => store[name].filter((r) => matches(r, a.where)).sort(sorter(a.orderBy)).map((r) => pick(r, a.select))),
  findUnique: (a) => lazy(() => { const r = store[name].find((x) => matches(x, a.where)); return r ? { ...r } : null; }),
  count: () => lazy(() => store[name].length),
  create: (a) => lazy(() => {
    const row = { id: newId(), ...cfg[name].defaults(), ...a.data, createdAt: new Date(), updatedAt: new Date() };
    if (name === "user") { row.lockedUntil = row.lockedUntil ?? null; row.lastLoginAt = row.lastLoginAt ?? null; }
    if (clash(name, store[name], row)) throw err("P2002", "Unique constraint failed");
    store[name].push(row); return { ...row };
  }),
  update: (a) => lazy(() => {
    const r = store[name].find((x) => matches(x, a.where)); if (!r) throw err("P2025", "Record not found");
    const next = { ...r, ...a.data, updatedAt: new Date() };
    if (clash(name, store[name], next, r)) throw err("P2002", "Unique constraint failed");
    Object.assign(r, next); return { ...r };
  }),
  updateMany: (a) => lazy(() => {
    const rows = store[name].filter((r) => matches(r, a.where));
    const nexts = rows.map((r) => ({ ...r, ...a.data, updatedAt: new Date() }));
    const others = store[name].filter((r) => !rows.includes(r));
    for (const n of nexts) if (clash(name, [...others, ...nexts.filter((x) => x !== n)], n)) throw err("P2002", "Unique constraint failed");
    rows.forEach((r, i) => Object.assign(r, nexts[i])); return { count: rows.length };
  }),
  delete: (a) => lazy(() => { const i = store[name].findIndex((x) => matches(x, a.where)); if (i < 0) throw err("P2025", "Record not found"); return store[name].splice(i, 1)[0]; }),
  deleteMany: (a = {}) => lazy(() => { const keep = store[name].filter((r) => !matches(r, a.where)); const count = store[name].length - keep.length; store[name] = keep; return { count }; }),
});
globalThis.prisma = {
  user: model("user"), cable: model("cable"),
  $transaction: async (ops) => { const snap = { user: [...store.user], cable: [...store.cable] }; try { const out = []; for (const op of ops) out.push(await op); return out; } catch (e) { store.user = snap.user; store.cable = snap.cable; throw e; } },
  __dump: () => store,
};
// test hook: read or edit rows from the test script through a tiny endpoint is not needed; tests use the HTTP API only
