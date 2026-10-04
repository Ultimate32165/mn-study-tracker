// All Firebase logic lives here. The UI (app.js) never touches Firebase directly.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, collection, setDoc, updateDoc, onSnapshot, query, orderBy, limit,
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
export const startStudy = uid => updateDoc(userRef(uid), { status: "studying", startedAt: serverTimestamp(), runStart: Date.now(), accum: 0 });
export const cancelStudy = uid => updateDoc(userRef(uid), { status: "offline", startedAt: null, runStart: null, accum: 0 });
export const pauseStudy = (uid, accumMs) => updateDoc(userRef(uid), { status: "paused", accum: accumMs, runStart: null });
export const resumeStudy = uid => updateDoc(userRef(uid), { status: "studying", runStart: Date.now() });
export const updateProfile = (uid, d) => updateDoc(userRef(uid), d);

// Save a finished session (and optionally switch status back to offline).
export async function addSession(uid, start, days, seconds, stop) {
  const b = writeBatch(db);
  b.set(doc(collection(db, "users", uid, "sessions")), { start: Timestamp.fromMillis(start), seconds, days });
  bump(b, uid, days, 1);
  if (stop) b.update(userRef(uid), { status: "offline", startedAt: null, runStart: null, accum: 0 });
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
