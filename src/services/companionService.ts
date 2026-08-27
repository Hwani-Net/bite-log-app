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
  where,
  limit,
  Firestore,
} from "firebase/firestore";
import { localISODate } from "@/lib/localDate";
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

// 오늘 이후 글만 예정일 가까운 순 최대 50건. 범위 조건과 정렬이 같은
// 필드(date)라 복합 인덱스가 필요 없다. 서버에서 과거 글을 잘라내는 게
// 핵심 — asc+limit만 쓰면 지난 글 50건이 창을 점령해 미래 글이 영영 안
// 보이는 버그가 된다(교차검수에서 잡힘). status 필터는 클라이언트에서.
export async function listCompanionPosts(): Promise<CompanionPost[]> {
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(
    query(
      collection(db, COLLECTION),
      where("date", ">=", localISODate(new Date())),
      orderBy("date", "asc"),
      limit(50),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CompanionPost);
}

// 배 상세용 — uid 하나 보자고 전체 50건을 읽지 않는다. 단일 where라
// 인덱스 불필요, 날짜·open 필터는 글 수가 적으니 클라이언트에서.
export async function listCompanionPostsForBoat(
  boatUid: string,
): Promise<CompanionPost[]> {
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("boatUid", "==", boatUid), limit(20)),
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
