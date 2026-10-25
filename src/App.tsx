import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  auth,
  signInWithGoogle,
  logOutUser,
  fetchUserProfile,
  saveUserProfile,
  subscribeToUserCourses,
  createCourseDocument,
  updateCourseDocument,
  deleteCourseDocument,
} from "./firebase";
import { Course, UserProfile } from "./types";
import { CourseCoverPicture, HeroArchitecturePicture } from "./components/CategoryVisual";
import { OnboardingModal } from "./components/OnboardingModal";
import { CourseCreationStudio } from "./components/CourseCreationStudio";
import { CoursePreviewView } from "./components/CoursePreviewView";
import { ActiveCourseView } from "./components/ActiveCourseView";
import {
  Plus,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  LogOut,
  User as UserIcon,
  Trash2,
  Eye,
  Volume2,
  Sliders,
  FileText,
  MessageSquare,
} from "lucide-react";

type ViewMode = "landing" | "dashboard" | "create" | "preview" | "course";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("landing");
  const [authError, setAuthError] = useState<string | null>(null);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await fetchUserProfile(user.uid);
          setUserProfile(profile);
          if (!profile || !profile.onboardingCompleted) {
            setShowOnboarding(true);
          }
          setViewMode((prev) => (prev === "landing" ? "dashboard" : prev));
        } catch (err) {
          console.error("Profile load error:", err);
        }
      } else {
        setUserProfile(null);
        setCourses([]);
        setActiveCourseId(null);
        setViewMode("landing");
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Subscribe to user's courses in Firestore once authenticated and profile exists
  useEffect(() => {
    if (!currentUser || !userProfile?.onboardingCompleted) return;
    const unsub = subscribeToUserCourses(currentUser.uid, (loadedCourses) => {
      setCourses(loadedCourses);
    });
    return () => unsub();
  }, [currentUser, userProfile?.onboardingCompleted]);

  const handleLoginOrCreateAccount = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Sign-in was cancelled or failed.");
    }
  };

  const handleOnboardingSave = async (profileData: Omit<UserProfile, "createdAt" | "updatedAt">) => {
    if (!currentUser) return;
    const isExisting = Boolean(userProfile);
    await saveUserProfile(currentUser.uid, profileData, isExisting);
    setUserProfile(profileData as UserProfile);
    setShowOnboarding(false);
    setViewMode("dashboard");
  };

  const handleCourseGenerated = async (newCourse: Course) => {
    await createCourseDocument(newCourse);
    setActiveCourseId(newCourse.id);
    setViewMode("preview");
  };

  const handleUpdateCourse = async (updated: Course) => {
    await updateCourseDocument(updated);
  };

  const handleSolidifyCourse = async (solidified: Course) => {
    await updateCourseDocument(solidified);
    setActiveCourseId(solidified.id);
    setViewMode("course");
  };

  const handleDeleteCourse = async (courseId: string) => {
    await deleteCourseDocument(courseId);
    if (activeCourseId === courseId) {
      setActiveCourseId(null);
      setViewMode("dashboard");
    }
  };

  const activeCourse = courses.find((c) => c.id === activeCourseId) || null;
  const currentCourses = courses.filter((c) => !c.isCompleted && c.status !== "archived");
  const completedCourses = courses.filter((c) => c.isCompleted);

  return (
    <div className="min-h-screen bg-[#181b20] text-[#f3f5f7] flex flex-col">
      {/* Top Bar Contract: 3 Zones (Brand Wordmark — 4 Single-Line Nav Links — 1 Primary Action) */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-[#16243e] border-b border-[#2c4470]">
        {/* Zone 1: Brand Title */}
        <button
          type="button"
          onClick={() => setViewMode(currentUser ? "dashboard" : "landing")}
          className="text-lg font-bold tracking-tight text-[#f3f5f7] whitespace-nowrap shrink-0 cursor-pointer"
        >
          Strengthen IO
        </button>

        {/* Zone 2: Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#b0b8c4]">
          {!currentUser ? (
            <>
              <a
                href="#how-it-works"
                className="hover:text-[#f3f5f7] transition-colors whitespace-nowrap shrink-0"
              >
                How It Works
              </a>
              <a
                href="#examples"
                className="hover:text-[#f3f5f7] transition-colors whitespace-nowrap shrink-0"
              >
                Examples
              </a>
              <a
                href="#features"
                className="hover:text-[#f3f5f7] transition-colors whitespace-nowrap shrink-0"
              >
                Features
              </a>
              <a
                href="#billy"
                className="hover:text-[#f3f5f7] transition-colors whitespace-nowrap shrink-0"
              >
                Meet Billy
              </a>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setViewMode("dashboard")}
                className={`hover:text-[#f3f5f7] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === "dashboard" ? "text-[#f3f5f7] underline underline-offset-4 decoration-[#84ab35]" : ""
                }`}
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => setViewMode("create")}
                className={`hover:text-[#f3f5f7] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === "create" ? "text-[#f3f5f7] underline underline-offset-4 decoration-[#84ab35]" : ""
                }`}
              >
                Create Course
              </button>
              <button
                type="button"
                onClick={() => setShowOnboarding(true)}
                className="hover:text-[#f3f5f7] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Learner Profile
              </button>
              <button
                type="button"
                onClick={() => logOutUser()}
                className="hover:text-[#f3f5f7] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign Out
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: 1 Primary Action in Top Right Corner */}
        <div className="flex items-center gap-3 shrink-0">
          {!currentUser ? (
            <button
              type="button"
              onClick={handleLoginOrCreateAccount}
              className="px-4 py-2 text-xs font-semibold text-[#f3f5f7] bg-[#6b8e23] hover:bg-[#84ab35] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Log In / Create Account
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setViewMode("create")}
              className="px-4 py-2 text-xs font-semibold text-[#f3f5f7] bg-[#6b8e23] hover:bg-[#84ab35] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Create a New Course
            </button>
          )}
        </div>
      </header>

      {authError && (
        <div className="max-w-7xl mx-auto w-full px-6 pt-4">
          <div className="p-3.5 bg-red-950/70 border border-red-700 rounded text-xs text-red-200 flex items-center justify-between">
            <span>{authError}</span>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              className="text-red-300 hover:text-white ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Onboarding Questionnaire Modal */}
      {currentUser && showOnboarding && (
        <OnboardingModal
          uid={currentUser.uid}
          email={currentUser.email || ""}
          initialDisplayName={currentUser.displayName || ""}
          existingProfile={userProfile}
          onComplete={handleOnboardingSave}
          onCancel={userProfile?.onboardingCompleted ? () => setShowOnboarding(false) : undefined}
        />
      )}

      {/* Main Content Router */}
      <main className="flex-1">
        {!authReady ? (
          <div className="min-h-[60vh] flex items-center justify-center text-sm font-mono-tabular text-[#b0b8c4]">
            Initializing Strengthen IO...
          </div>
        ) : viewMode === "landing" || !currentUser ? (
          /* LANDING PAGE */
          <div className="max-w-[1320px] mx-auto px-6 py-12 space-y-20">
            {/* Hero Section */}
            <section id="how-it-works" className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#84ab35]">
                  <span>STRENGTHEN IO</span>
                  <span>·</span>
                  <span>PERSONALIZED SKILL BUILDING</span>
                </div>

                <h1 className="text-4xl sm:text-5xl font-bold text-[#f3f5f7] leading-[1.12] tracking-tight">
                  Build new skills in any field with courses tailored around how you learn best.
                </h1>

                <p className="text-base text-[#b0b8c4] leading-relaxed max-w-xl">
                  Prompt <strong className="text-[#f3f5f7]">Billy</strong>, your AI learning mentor, to design a structured online course, a guided project walkthrough, or a career-specific curriculum—calibrated to your pace, sources, and preferred mix of visuals, audio recordings, reading, and videos.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={handleLoginOrCreateAccount}
                    className="px-6 py-3 text-sm font-semibold text-[#f3f5f7] bg-[#6b8e23] hover:bg-[#84ab35] rounded-md flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>Log In / Create Account to Start</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <a
                    href="#examples"
                    className="px-5 py-3 text-sm font-medium text-[#b0b8c4] hover:text-[#f3f5f7] bg-[#21262d] border border-[#2c4470] rounded-md transition-colors whitespace-nowrap"
                  >
                    Explore Course Examples
                  </a>
                </div>

                <div className="pt-6 border-t border-[#282e37] grid grid-cols-3 gap-6 text-xs">
                  <div>
                    <p className="font-mono-tabular text-[#84ab35] font-semibold">4 MODALITIES</p>
                    <p className="text-[#b0b8c4] mt-1">Custom % of Audio, Visuals, Reading & Video</p>
                  </div>
                  <div>
                    <p className="font-mono-tabular text-[#84ab35] font-semibold">LIVE PREVIEW</p>
                    <p className="text-[#b0b8c4] mt-1">Click through modules & tweak with Billy first</p>
                  </div>
                  <div>
                    <p className="font-mono-tabular text-[#84ab35] font-semibold">ADAPTIVE TASKS</p>
                    <p className="text-[#b0b8c4] mt-1">Switch between Relaxing & Challenging anytime</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <HeroArchitecturePicture />
              </div>
            </section>

            {/* Examples Section */}
            <section id="examples" className="space-y-8">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#282e37] pb-5">
                <div>
                  <span className="text-xs font-mono-tabular text-[#84ab35]">
                    01 · WHAT YOU CAN BUILD & LEARN
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#f3f5f7] mt-1">
                    Courses structured around your exact goal or scenario
                  </h2>
                </div>
                <p className="text-sm text-[#b0b8c4] max-w-md">
                  From web development and personal finance to AI engineering and job descriptions, Billy builds the exact course structure you need.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    category: "tech",
                    kicker: "WEB ENGINEERING · PROJECT COURSE",
                    title: "I want to learn how to create a website.",
                    desc: "Step-by-step modules covering semantic HTML, modern CSS grid layouts, responsive design, and interactive deployment—built while creating a live site.",
                  },
                  {
                    category: "finance",
                    kicker: "PERSONAL FINANCE · PRACTICAL GUIDE",
                    title: "Teach me to do my own taxes.",
                    desc: "Clear walkthroughs of income forms, standard vs. itemized deductions, tax brackets, and filing workflows with relaxing or challenging practice scenarios.",
                  },
                  {
                    category: "ai",
                    kicker: "AI ARCHITECTURE · HANDS-ON BUILD",
                    title: "Walk me through building a project for RAG.",
                    desc: "Master document ingestion, chunking strategies, vector embeddings, semantic retrieval, and grounded LLM generation with interactive architecture diagrams.",
                  },
                ].map((ex, idx) => (
                  <div
                    key={idx}
                    className="bg-[#21262d] border border-[#2c4470] rounded-lg overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <CourseCoverPicture category={ex.category} title={ex.kicker} className="h-44 w-full" />
                      <div className="p-6 space-y-3">
                        <div className="text-xs font-mono-tabular text-[#84ab35]">{ex.kicker}</div>
                        <h3 className="text-lg font-bold text-[#f3f5f7]">"{ex.title}"</h3>
                        <p className="text-sm text-[#b0b8c4] leading-relaxed">{ex.desc}</p>
                      </div>
                    </div>
                    <div className="px-6 pb-6 pt-2">
                      <button
                        type="button"
                        onClick={handleLoginOrCreateAccount}
                        className="text-xs font-semibold text-[#84ab35] hover:underline flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Build this course with Billy</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Features Matrix */}
            <section id="features" className="bg-[#21262d] border border-[#2c4470] rounded-lg p-8 sm:p-10 space-y-8">
              <div className="border-b border-[#282e37] pb-5">
                <span className="text-xs font-mono-tabular text-[#84ab35]">
                  02 · PLATFORM CAPABILITIES
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#f3f5f7] mt-1">
                  Designed around every learner's pace, sources, and curiosity
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    title: "01. Custom Modality Percentages",
                    body: "Set your exact percentage breakdown of videos, reading, spoken audio recordings, and interactive visuals—plus tone, pace, length, and historical depth.",
                  },
                  {
                    title: "02. Bring Your Own Sources or Job Specs",
                    body: "Provide specific documentation, articles, or a target job description and have Billy construct a tailored curriculum around those sources, his own research, or both.",
                  },
                  {
                    title: "03. Interactive Course Preview & Tweaks",
                    body: "Click through generated modules and lessons before solidifying your course. Chat directly with Billy on the preview screen to refine anything.",
                  },
                  {
                    title: "04. Relaxing to Challenging Assignments",
                    body: "Apply skills as you learn them. Modify the difficulty of any assignment on the fly for more relaxing confidence-builders or challenging deep-dives.",
                  },
                  {
                    title: "05. Lesson Regeneration on Demand",
                    body: "If a lesson or topic doesn't click the first time, regenerate that specific lesson with fresh analogies or generate extra practice assignments.",
                  },
                  {
                    title: "06. Built-in Notebook & Saved Billy Chat",
                    body: "Every course includes a persistent notebook and a built-in clarification chat with Billy—automatically saved to your course for future reference.",
                  },
                ].map((feat, idx) => (
                  <div
                    key={idx}
                    className="bg-[#181b20] border border-[#282e37] rounded-lg p-6 space-y-2.5"
                  >
                    <h3 className="text-base font-semibold text-[#f3f5f7]">{feat.title}</h3>
                    <p className="text-sm text-[#b0b8c4] leading-relaxed">{feat.body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Bottom Call to Action */}
            <section
              id="billy"
              className="bg-[#16243e] border border-[#2c4470] rounded-lg p-8 sm:p-10 flex flex-wrap items-center justify-between gap-6"
            >
              <div className="max-w-2xl space-y-2">
                <span className="text-xs font-mono-tabular text-[#84ab35]">READY TO LEARN WITH BILLY?</span>
                <h2 className="text-2xl font-bold text-[#f3f5f7]">
                  Create your learner profile and generate your first custom course in minutes.
                </h2>
                <p className="text-sm text-[#b0b8c4]">
                  Your courses, progress, notebooks, and Billy conversations are saved automatically to your account.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoginOrCreateAccount}
                className="px-6 py-3.5 text-sm font-semibold text-[#f3f5f7] bg-[#6b8e23] hover:bg-[#84ab35] rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                Log In / Create Account
              </button>
            </section>
          </div>
        ) : viewMode === "create" ? (
          <CourseCreationStudio
            uid={currentUser.uid}
            learnerProfile={userProfile}
            onCancel={() => setViewMode("dashboard")}
            onCourseGenerated={handleCourseGenerated}
          />
        ) : viewMode === "preview" && activeCourse ? (
          <CoursePreviewView
            course={activeCourse}
            onUpdateCourse={handleUpdateCourse}
            onSolidifyCourse={handleSolidifyCourse}
            onBackToDashboard={() => setViewMode("dashboard")}
          />
        ) : viewMode === "course" && activeCourse ? (
          <ActiveCourseView
            course={activeCourse}
            onUpdateCourse={handleUpdateCourse}
            onBackToDashboard={() => setViewMode("dashboard")}
          />
        ) : (
          /* LEARNER DASHBOARD */
          <div className="max-w-[1320px] mx-auto px-6 py-8 space-y-10">
            {/* Top Welcome & Learner Summary */}
            <div className="bg-[#16243e] border border-[#2c4470] rounded-lg p-6 flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-[#84ab35]">
                  <span>LEARNER DASHBOARD</span>
                  {userProfile?.learnerType && (
                    <>
                      <span>·</span>
                      <span>{userProfile.learnerType.toUpperCase()}</span>
                    </>
                  )}
                  {userProfile?.topicsOfInterest?.length ? (
                    <>
                      <span>·</span>
                      <span>{userProfile.topicsOfInterest.slice(0, 2).join(" / ").toUpperCase()}</span>
                    </>
                  ) : null}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#f3f5f7]">
                  Welcome back, {userProfile?.displayName || currentUser.displayName || "Learner"}
                </h1>
                <p className="text-sm text-[#b0b8c4]">
                  {userProfile?.careerGoal ||
                    "Continue your active courses, review completed modules, or prompt Billy to create a new course."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowOnboarding(true)}
                  className="px-4 py-2.5 text-xs font-medium text-[#b0b8c4] hover:text-[#f3f5f7] bg-[#181b20] border border-[#2c4470] rounded-md cursor-pointer whitespace-nowrap"
                >
                  Edit Learner Preferences
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("create")}
                  className="px-5 py-2.5 text-sm font-semibold text-[#f3f5f7] bg-[#6b8e23] hover:bg-[#84ab35] rounded-md flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create a New Course</span>
                </button>
              </div>
            </div>

            {/* Current Courses Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#282e37] pb-3">
                <div>
                  <span className="text-xs font-mono-tabular text-[#84ab35]">ACTIVE & PREVIEW COURSES</span>
                  <h2 className="text-xl font-bold text-[#f3f5f7] mt-0.5">
                    Current Courses ({currentCourses.length})
                  </h2>
                </div>
              </div>

              {currentCourses.length === 0 ? (
                <div className="bg-[#21262d] border border-[#2c4470] rounded-lg p-10 text-center space-y-4">
                  <h3 className="text-lg font-semibold text-[#f3f5f7]">
                    You don't have any active courses yet
                  </h3>
                  <p className="text-sm text-[#b0b8c4] max-w-md mx-auto">
                    Prompt Billy to build a custom course around any skill, project, or job description—tailored to your preferred mix of visuals, audio, reading, and videos.
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMode("create")}
                    className="px-5 py-2.5 text-xs font-semibold text-[#f3f5f7] bg-[#6b8e23] hover:bg-[#84ab35] rounded-md inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Your First Course</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentCourses.map((course) => (
                    <div
                      key={course.id}
                      className="bg-[#21262d] border border-[#2c4470] rounded-lg overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <CourseCoverPicture
                          category={course.category}
                          title={`${course.config?.courseFormat || "Course"} · ${
                            course.status === "preview" ? "Preview Mode" : `${course.progress}% Complete`
                          }`}
                          className="h-40 w-full"
                        />
                        <div className="p-5 space-y-3">
                          <div className="flex items-center justify-between text-xs font-mono-tabular text-[#84ab35]">
                            <span>{course.status === "preview" ? "PREVIEW DRAFT" : "IN PROGRESS"}</span>
                            <span>
                              {course.modules?.length || 0} Modules · {course.progress}%
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-[#f3f5f7] line-clamp-1">
                            {course.title}
                          </h3>
                          <p className="text-xs text-[#b0b8c4] line-clamp-2 leading-relaxed">
                            {course.subtitle}
                          </p>

                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-[#181b20] rounded-full overflow-hidden border border-[#2c4470]/50">
                            <div
                              className="h-full bg-[#6b8e23]"
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="px-5 pb-5 pt-2 flex items-center justify-between gap-2 border-t border-[#282e37]">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCourseId(course.id);
                            setViewMode(course.status === "preview" ? "preview" : "course");
                          }}
                          className="flex-1 py-2 px-3 bg-[#6b8e23] hover:bg-[#84ab35] text-xs font-semibold text-[#f3f5f7] rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>
                            {course.status === "preview"
                              ? "Open Preview & Tweak"
                              : "Continue Course"}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCourse(course.id)}
                          className="p-2 text-[#7d8796] hover:text-red-400 bg-[#181b20] border border-[#282e37] rounded transition-colors cursor-pointer"
                          title="Delete Course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Completed Courses Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#282e37] pb-3">
                <div>
                  <span className="text-xs font-mono-tabular text-[#84ab35]">MASTERED SKILLS</span>
                  <h2 className="text-xl font-bold text-[#f3f5f7] mt-0.5">
                    Completed Courses ({completedCourses.length})
                  </h2>
                </div>
              </div>

              {completedCourses.length === 0 ? (
                <div className="bg-[#21262d]/60 border border-[#282e37] rounded-lg p-6 text-xs text-[#b0b8c4]">
                  Courses you finish will appear here with full access to your saved notebook and Billy chat history.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedCourses.map((course) => (
                    <div
                      key={course.id}
                      className="bg-[#21262d] border border-[#6b8e23]/70 rounded-lg overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <CourseCoverPicture
                          category={course.category}
                          title="COMPLETED · 100%"
                          className="h-36 w-full"
                        />
                        <div className="p-5 space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono-tabular text-[#84ab35]">
                            <span>COMPLETED</span>
                            <span>100%</span>
                          </div>
                          <h3 className="text-base font-bold text-[#f3f5f7]">{course.title}</h3>
                          <p className="text-xs text-[#b0b8c4] line-clamp-2">{course.subtitle}</p>
                        </div>
                      </div>
                      <div className="px-5 pb-5 pt-2 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCourseId(course.id);
                            setViewMode("course");
                          }}
                          className="flex-1 py-2 px-3 bg-[#1e3154] hover:bg-[#2c4470] border border-[#84ab35]/60 text-xs font-semibold text-[#f3f5f7] rounded cursor-pointer"
                        >
                          Review Course & Notebook
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Minimalist Footer */}
      <footer className="border-t border-[#282e37] bg-[#181b20] px-6 py-6 mt-16">
        <div className="max-w-[1320px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-[#7d8796]">
          <div>
            <span className="text-[#f3f5f7] font-semibold">Strengthen IO</span> · Personalized Skill & Course Platform with Billy
          </div>
          <div>
            Charcoal · Navy · Olive Minimalist Studio
          </div>
        </div>
      </footer>
    </div>
  );
}
