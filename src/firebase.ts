import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { Course, UserProfile } from "./types";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logOutUser() {
  await signOut(auth);
}

// Defensive truncation helpers matching firebase-blueprint.json & firestore.rules
function clampStr(val: string | undefined | null, max: number, fallback = ""): string {
  const str = (val ?? fallback).trim();
  return str.slice(0, max);
}

function sanitizeStringArray(arr: string[] | undefined, maxItems = 15, maxItemLen = 80): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .slice(0, maxItems)
    .map((item) => item.trim().slice(0, maxItemLen));
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserProfile(
  uid: string,
  profile: Omit<UserProfile, "createdAt" | "updatedAt">,
  isExisting: boolean
): Promise<void> {
  const path = `users/${uid}`;
  const cleanPayload = {
    uid: clampStr(uid, 128),
    email: clampStr(profile.email, 256),
    displayName: clampStr(profile.displayName, 120, "Learner"),
    phoneNumber: clampStr(profile.phoneNumber, 40, ""),
    careerGoal: clampStr(profile.careerGoal, 300, ""),
    topicsOfInterest: sanitizeStringArray(profile.topicsOfInterest, 15, 80),
    learnerType: clampStr(profile.learnerType, 80, "Balanced Learner"),
    preferredTools: sanitizeStringArray(profile.preferredTools, 15, 80),
    onboardingCompleted: Boolean(profile.onboardingCompleted),
  };

  try {
    if (isExisting) {
      await updateDoc(doc(db, "users", uid), {
        email: cleanPayload.email,
        displayName: cleanPayload.displayName,
        phoneNumber: cleanPayload.phoneNumber,
        careerGoal: cleanPayload.careerGoal,
        topicsOfInterest: cleanPayload.topicsOfInterest,
        learnerType: cleanPayload.learnerType,
        preferredTools: cleanPayload.preferredTools,
        onboardingCompleted: cleanPayload.onboardingCompleted,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, "users", uid), {
        ...cleanPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isExisting ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export function subscribeToUserCourses(
  uid: string,
  onCourses: (courses: Course[]) => void,
  onError?: (err: unknown) => void
) {
  const q = query(collection(db, "courses"), where("ownerId", "==", uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const parsed: Course[] = snapshot.docs.map((docSnap) => {
        const raw = docSnap.data();
        let config = {};
        let modules = [];
        let chatHistory = [];
        try {
          config = JSON.parse(raw.configJson || "{}");
        } catch {
          config = {};
        }
        try {
          modules = JSON.parse(raw.modulesJson || "[]");
        } catch {
          modules = [];
        }
        try {
          chatHistory = JSON.parse(raw.chatHistoryJson || "[]");
        } catch {
          chatHistory = [];
        }
        return {
          id: docSnap.id,
          ownerId: raw.ownerId,
          title: raw.title,
          subtitle: raw.subtitle,
          topicPrompt: raw.topicPrompt,
          category: raw.category || "tech",
          status: raw.status || "preview",
          isCompleted: Boolean(raw.isCompleted),
          progress: Number(raw.progress || 0),
          config: config as Course["config"],
          modules,
          notebook: raw.notebook || "",
          chatHistory,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
        };
      });
      onCourses(parsed);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, "courses");
    }
  );
}

export async function createCourseDocument(course: Course): Promise<void> {
  const path = `courses/${course.id}`;
  const payload = {
    ownerId: clampStr(course.ownerId, 128),
    title: clampStr(course.title, 200, "Untitled Course"),
    subtitle: clampStr(course.subtitle, 500, ""),
    topicPrompt: clampStr(course.topicPrompt, 2000, "Skill Course"),
    category: clampStr(course.category, 60, "tech"),
    status: course.status,
    isCompleted: Boolean(course.isCompleted),
    progress: Math.max(0, Math.min(100, Math.round(course.progress || 0))),
    configJson: JSON.stringify(course.config || {}).slice(0, 15000),
    modulesJson: JSON.stringify(course.modules || []).slice(0, 400000),
    notebook: (course.notebook || "").slice(0, 100000),
    chatHistoryJson: JSON.stringify(course.chatHistory || []).slice(0, 200000),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, "courses", course.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCourseDocument(course: Course): Promise<void> {
  const path = `courses/${course.id}`;
  const payload = {
    title: clampStr(course.title, 200, "Untitled Course"),
    subtitle: clampStr(course.subtitle, 500, ""),
    status: course.status,
    isCompleted: Boolean(course.isCompleted),
    progress: Math.max(0, Math.min(100, Math.round(course.progress || 0))),
    configJson: JSON.stringify(course.config || {}).slice(0, 15000),
    modulesJson: JSON.stringify(course.modules || []).slice(0, 400000),
    notebook: (course.notebook || "").slice(0, 100000),
    chatHistoryJson: JSON.stringify(course.chatHistory || []).slice(0, 200000),
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(doc(db, "courses", course.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCourseDocument(courseId: string): Promise<void> {
  const path = `courses/${courseId}`;
  try {
    await deleteDoc(doc(db, "courses", courseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
