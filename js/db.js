// All Firebase logic lives here. The UI (app.js) never touches Firebase directly.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, collection, setDoc, updateDoc, onSnapshot, query, orderBy, limit, addDoc, deleteDoc,
  serverTimestamp, Timestamp, increment, writeBatch } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app);
const fakeEmail = u => `${u.toLowerCase()}@mnstudy.app`; // username → pretend email (never emailed)
const userRef = uid => doc(db, "users", uid);
const sessRef = (uid, id) => doc(db, "users", uid, "sessions", id);
const bump = (b, uid, days, sign) => { const f = {}; for (const k in days) f[`daily.${k}`] = increment(sign * days[k]); b.update(userRef(uid), f); };

export const watchAuth = cb => onAuthStateChanged(auth, cb);
export const logIn = (u, p) => signInWithEmailAndPassword(auth, fakeEmail(u), p);
export const logOut = () => signOut(auth);
export async function signUp(u, p, emoji) {
  const c = await createUserWithEmailAndPassword(auth, fakeEmail(u), p);
  await setDoc(userRef(c.user.uid), { username: u.toLowerCase(), name: u, emoji, status: "offline", startedAt: null, daily: {} });
}
export const watchUsers = cb => onSnapshot(collection(db, "users"), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
export const watchSessions = (uid, cb) => onSnapshot(query(collection(db, "users", uid, "sessions"), orderBy("start", "desc"), limit(40)),
  s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
export const startStudy = (uid, pomo, focusMs) => updateDoc(userRef(uid), { status: "studying", startedAt: serverTimestamp(), runStart: Date.now(), accum: 0, checkedAt: null, breakAt: null, pomo: !!pomo, nextBreak: pomo ? focusMs : null });
export const cancelStudy = uid => updateDoc(userRef(uid), { status: "offline", startedAt: null, runStart: null, accum: 0, breakAt: null, pomo: false });
export const pauseStudy = (uid, accumMs) => updateDoc(userRef(uid), { status: "paused", accum: accumMs, runStart: null, breakAt: null });
export const resumeStudy = uid => updateDoc(userRef(uid), { status: "studying", runStart: Date.now(), breakAt: null });
export const updateProfile = (uid, d) => updateDoc(userRef(uid), d);
export const saveGarden = (uid, ids) => updateDoc(userRef(uid), { garden: ids }); // up to 3 extra pets that live in the shared garden
export const giveTreat = uid => updateDoc(userRef(uid), { treats: increment(1) });   // a treat for your pet costs 1 seed (seeds = study time + bonus - treats - decorations)
export const addBonus = (uid, n) => updateDoc(userRef(uid), { bonus: increment(n) }); // seeds from garden visitors
export const saveDecor = (uid, items) => updateDoc(userRef(uid), { decor: items }); // garden decorations: [{ i: "bench", k: "a1b2c3", x: .42, y: .71 }, ...] (x/y = fraction of the garden scene)

// Save a finished session (and optionally switch status back to offline).
export async function addSession(uid, start, days, seconds, stop) {
  const b = writeBatch(db);
  b.set(doc(collection(db, "users", uid, "sessions")), { start: Timestamp.fromMillis(start), seconds, days });
  bump(b, uid, days, 1);
  if (stop) b.update(userRef(uid), { status: "offline", startedAt: null, runStart: null, accum: 0, breakAt: null, pomo: false });
  await b.commit();
}
export async function editSession(uid, s, days, seconds) {
  const b = writeBatch(db), diff = {};
  b.update(sessRef(uid, s.id), { seconds, days });
  for (const k of new Set([...Object.keys(s.days), ...Object.keys(days)])) diff[k] = (days[k] || 0) - (s.days[k] || 0);
  bump(b, uid, diff, 1);
  await b.commit();
}
export async function deleteSession(uid, s) {
  const b = writeBatch(db);
  b.delete(sessRef(uid, s.id));
  bump(b, uid, s.days, -1);
  await b.commit();
}

// ---- pomodoro, still-studying check, cheers ----
export const pomoBreak = (uid, nb, focusMs) => updateDoc(userRef(uid), { status: "paused", accum: nb, runStart: null, breakAt: Date.now(), nextBreak: nb + focusMs });
export const checkIn = uid => updateDoc(userRef(uid), { checkedAt: Date.now() });
export const cheer = (to, from, name, emoji) => addDoc(collection(db, "users", to, "cheers"), { from, name, emoji, at: serverTimestamp() });
export const watchCheers = (uid, cb) => onSnapshot(collection(db, "users", uid, "cheers"), s => {
  const list = s.docChanges().filter(c => c.type === "added").map(c => c.doc);
  if (!list.length) return;
  cb(list.map(x => x.data()));
  list.forEach(x => deleteDoc(x.ref).catch(() => {}));
}, () => {});

// ---- badges ----
export const unlockBadge = (uid, id) => updateDoc(userRef(uid), { [`badges.${id}`]: Date.now() });
