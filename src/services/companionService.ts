// 동출 모집 v1 — Firestore `companionPosts` 컬렉션. 읽기는 모두, 쓰기는
// Firebase Auth 필수(이 프로젝트 rules의 기존 원칙). 로그인하지 않은
// 사용자는 익명 인증(signInAnonymously)으로 uid를 받아 글을 쓴다 —
// localStorage 키가 아니라 서버가 소유권을 강제하고, 같은 기기에선
// 세션이 유지돼 자기 글을 마감/삭제할 수 있다.
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  Firestore,
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import {
  getFirebaseDb,
  getFirebaseAuth,
  isFirebaseReady,
} from "@/lib/firebase";
import type { CompanionPost } from "@/lib/companionPosts";

const COLLECTION = "companionPosts";

function getDb(): Firestore | null {
  if (!isFirebaseReady()) return null;
  return getFirebaseDb();
}

/** 현재 uid — 없으면 익명 인증으로 만들어서라도 돌려준다(글쓰기 전용). */
export async function ensureAuthUid(): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch {
    return null;
  }
}

/** 로그인 여부와 무관한 현재 uid(익명 포함) — 소유권 표시용. */
export function currentAuthUid(): string | null {
  return getFirebaseAuth()?.currentUser?.uid ?? null;
}

// 예정일 가까운 순 최대 50건 — status/미래 필터는 클라이언트에서.
// (where+orderBy 복합 인덱스를 요구하지 않는 단일 orderBy 쿼리를 유지.)
export async function listCompanionPosts(): Promise<CompanionPost[]> {
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(
    query(collection(db, COLLECTION), orderBy("date", "asc"), limit(50)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CompanionPost);
}

export async function createCompanionPost(
  input: Omit<CompanionPost, "id" | "authorUid" | "status" | "createdAt">,
): Promise<CompanionPost | null> {
  const db = getDb();
  if (!db) return null;
  const uid = await ensureAuthUid();
  if (!uid) return null;
  const data = {
    ...input,
    boatUid: input.boatUid ?? "",
    port: input.port ?? "",
    authorUid: uid,
    status: "open" as const,
    createdAt: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, COLLECTION), data);
  return { id: ref.id, ...data };
}

export async function closeCompanionPost(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    await updateDoc(doc(db, COLLECTION, id), { status: "closed" });
    return true;
  } catch {
    return false;
  }
}

export async function deleteCompanionPost(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    return true;
  } catch {
    return false;
  }
}
