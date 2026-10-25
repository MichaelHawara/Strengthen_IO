import React, { useState, useRef, useEffect } from "react";
import { Course, ChatMessage, Assignment, Lesson } from "../types";
import { CourseCoverPicture, InteractiveDiagramCanvas } from "./CategoryVisual";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Volume2,
  Pause,
  Play,
  RefreshCw,
  PlusCircle,
  Send,
  BookOpen,
  MessageSquare,
  FileText,
  ExternalLink,
  HelpCircle,
  Check,
  Award,
} from "lucide-react";

interface ActiveCourseViewProps {
  course: Course;
  onUpdateCourse: (updated: Course) => Promise<void>;
  onBackToDashboard: () => void;
}

export const ActiveCourseView: React.FC<ActiveCourseViewProps> = ({
  course,
  onUpdateCourse,
  onBackToDashboard,
}) => {
  const [selectedModuleIdx, setSelectedModuleIdx] = useState(0);
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0);
  const [rightTab, setRightTab] = useState<"billy" | "notebook">("billy");

  // Billy Chat state
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Notebook state
  const [notebookText, setNotebookText] = useState(course.notebook || "");
  const [isSavingNotebook, setIsSavingNotebook] = useState(false);
  const [notebookSavedToast, setNotebookSavedToast] = useState(false);

  // Audio TTS state
  const [isSynthesizingAudio, setIsSynthesizingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCache, setAudioCache] = useState<Record<string, string>>({});
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Lesson Regeneration & Assignment state
  const [showRegenBox, setShowRegenBox] = useState(false);
  const [regenFeedback, setRegenFeedback] = useState("");
  const [isRegeneratingLesson, setIsRegeneratingLesson] = useState(false);
  const [billyToast, setBillyToast] = useState<string | null>(null);

  const [loadingAssignmentId, setLoadingAssignmentId] = useState<string | null>(null);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [visibleHints, setVisibleHints] = useState<Record<string, boolean>>({});
  const [visibleSolutions, setVisibleSolutions] = useState<Record<string, boolean>>({});
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    setNotebookText(course.notebook || "");
  }, [course.id]);

  // Stop audio when switching lessons
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
    setAudioError(null);
  }, [selectedModuleIdx, selectedLessonIdx]);

  const activeModule = course.modules[selectedModuleIdx] || course.modules[0];
  const activeLesson: Lesson | undefined =
    activeModule?.lessons?.[selectedLessonIdx] || activeModule?.lessons?.[0];

  const calculateCourseProgress = (modules: Course["modules"]) => {
    let total = 0;
    let completed = 0;
    modules.forEach((m) => {
      m.lessons.forEach((l) => {
        total += 1;
        if (l.completed) completed += 1;
      });
    });
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const handleToggleLessonComplete = async () => {
    if (!activeLesson) return;
    const nextModules = course.modules.map((m, mIdx) => {
      if (mIdx !== selectedModuleIdx) return m;
      return {
        ...m,
        lessons: m.lessons.map((l, lIdx) => {
          if (lIdx !== selectedLessonIdx) return l;
          return { ...l, completed: !l.completed };
        }),
      };
    });

    const nextProgress = calculateCourseProgress(nextModules);
    const updated: Course = {
      ...course,
      modules: nextModules,
      progress: nextProgress,
      isCompleted: nextProgress === 100,
    };
    await onUpdateCourse(updated);
  };

  // Real Gemini TTS Playback
  const handlePlayLessonAudio = async () => {
    if (!activeLesson) return;
    const cacheKey = `${course.id}_${selectedModuleIdx}_${selectedLessonIdx}`;

    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }

    if (audioCache[cacheKey]) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioCache[cacheKey]);
        audioRef.current.onended = () => setIsPlayingAudio(false);
      } else {
        audioRef.current.src = audioCache[cacheKey];
      }
      await audioRef.current.play();
      setIsPlayingAudio(true);
      return;
    }

    setIsSynthesizingAudio(true);
    setAudioError(null);
    try {
      const response = await fetch("/api/billy/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptText: activeLesson.audioScript || activeLesson.summary,
          tone: course.config.tone,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error || !data.audioBase64) {
        throw new Error(data.error || "Could not synthesize audio.");
      }

      const dataUrl = `data:${data.mimeType || "audio/wav"};base64,${data.audioBase64}`;
      setAudioCache((prev) => ({ ...prev, [cacheKey]: dataUrl }));

      const audioEl = new Audio(dataUrl);
      audioEl.onended = () => setIsPlayingAudio(false);
      audioRef.current = audioEl;
      await audioEl.play();
      setIsPlayingAudio(true);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : "Failed to play audio.");
    } finally {
      setIsSynthesizingAudio(false);
    }
  };

  // Regenerate Lesson if not understood
  const handleRegenerateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLesson || !activeModule || isRegeneratingLesson) return;

    setIsRegeneratingLesson(true);
    setBillyToast(null);
    try {
      const response = await fetch("/api/billy/regenerate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseTitle: course.title,
          moduleTitle: activeModule.title,
          currentLesson: activeLesson,
          learnerFeedback: regenFeedback.trim(),
          config: course.config,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error || !data.lesson) {
        throw new Error(data.error || "Failed to regenerate lesson.");
      }

      const nextModules = course.modules.map((m, mIdx) => {
        if (mIdx !== selectedModuleIdx) return m;
        return {
          ...m,
          lessons: m.lessons.map((l, lIdx) => {
            if (lIdx !== selectedLessonIdx) return l;
            return {
              ...data.lesson,
              id: l.id,
              completed: l.completed,
            };
          }),
        };
      });

      const billyLog: ChatMessage = {
        id: `msg_${Date.now()}_regen`,
        role: "billy",
        text: data.billyNote || `I've regenerated "${activeLesson.title}" with fresh explanations and examples!`,
        timestamp: new Date().toISOString(),
      };

      await onUpdateCourse({
        ...course,
        modules: nextModules,
        chatHistory: [...(course.chatHistory || []), billyLog],
      });

      setBillyToast(data.billyNote || "Lesson regenerated with clearer examples.");
      setShowRegenBox(false);
      setRegenFeedback("");
    } catch (err) {
      setBillyToast(err instanceof Error ? err.message : "Failed to regenerate lesson.");
    } finally {
      setIsRegeneratingLesson(false);
    }
  };

  // Modify Assignment Difficulty
  const handleChangeAssignmentDifficulty = async (
    assignment: Assignment,
    assignmentIdx: number,
    targetDifficulty: "Relaxing" | "Standard" | "Challenging"
  ) => {
    if (!activeLesson || loadingAssignmentId) return;
    setLoadingAssignmentId(assignment.id || String(assignmentIdx));
    try {
      const response = await fetch("/api/billy/assignment-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change-difficulty",
          courseTitle: course.title,
          lessonTitle: activeLesson.title,
          lessonSummary: activeLesson.summary,
          assignment,
          targetDifficulty,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error || !data.assignment) {
        throw new Error(data.error || "Failed to adjust assignment difficulty.");
      }

      const nextModules = course.modules.map((m, mIdx) => {
        if (mIdx !== selectedModuleIdx) return m;
        return {
          ...m,
          lessons: m.lessons.map((l, lIdx) => {
            if (lIdx !== selectedLessonIdx) return l;
            return {
              ...l,
              assignments: l.assignments.map((a, aIdx) =>
                aIdx === assignmentIdx ? { ...data.assignment, id: a.id } : a
              ),
            };
          }),
        };
      });

      await onUpdateCourse({ ...course, modules: nextModules });
      setBillyToast(`Assignment updated to ${targetDifficulty} difficulty.`);
    } catch (err) {
      setBillyToast(err instanceof Error ? err.message : "Could not change difficulty.");
    } finally {
      setLoadingAssignmentId(null);
    }
  };

  // Create More Assignments for Current Lesson
  const handleCreateMoreAssignments = async () => {
    if (!activeLesson || isCreatingAssignment) return;
    setIsCreatingAssignment(true);
    try {
      const response = await fetch("/api/billy/assignment-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-more",
          courseTitle: course.title,
          lessonTitle: activeLesson.title,
          lessonSummary: activeLesson.summary,
          targetDifficulty: course.config.assignmentDifficulty || "Standard",
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error || !data.assignment) {
        throw new Error(data.error || "Failed to create extra assignment.");
      }

      const newAssignment: Assignment = {
        ...data.assignment,
        id: `asgn_${Date.now()}`,
      };

      const nextModules = course.modules.map((m, mIdx) => {
        if (mIdx !== selectedModuleIdx) return m;
        return {
          ...m,
          lessons: m.lessons.map((l, lIdx) => {
            if (lIdx !== selectedLessonIdx) return l;
            return {
              ...l,
              assignments: [...(l.assignments || []), newAssignment],
            };
          }),
        };
      });

      await onUpdateCourse({ ...course, modules: nextModules });
      setBillyToast("Billy added a new practice assignment to this lesson.");
    } catch (err) {
      setBillyToast(err instanceof Error ? err.message : "Could not create assignment.");
    } finally {
      setIsCreatingAssignment(false);
    }
  };

  // Submit Assignment Answers for Billy Evaluation
  const handleEvaluateAssignment = async (assignment: Assignment, assignmentIdx: number) => {
    if (!activeLesson || loadingAssignmentId) return;
    setLoadingAssignmentId(assignment.id || String(assignmentIdx));

    const compiledAnswers = assignment.questions.map((q, qIdx) => {
      const key = `${assignment.id || assignmentIdx}_${q.id || qIdx}`;
      return {
        questionId: q.id || String(qIdx),
        question: q.question,
        learnerAnswer: draftAnswers[key] || assignment.userAnswers?.[q.id || String(qIdx)] || "(No answer provided)",
      };
    });

    try {
      const response = await fetch("/api/billy/assignment-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate",
          courseTitle: course.title,
          lessonTitle: activeLesson.title,
          assignment,
          userAnswers: compiledAnswers,
        }),
      });
      const evaluation = await response.json();
      if (!response.ok || evaluation.error) {
        throw new Error(evaluation.error || "Failed to evaluate assignment.");
      }

      const savedAnswersMap: Record<string, string> = {};
      compiledAnswers.forEach((item) => {
        savedAnswersMap[item.questionId] = item.learnerAnswer;
      });

      const nextModules = course.modules.map((m, mIdx) => {
        if (mIdx !== selectedModuleIdx) return m;
        return {
          ...m,
          lessons: m.lessons.map((l, lIdx) => {
            if (lIdx !== selectedLessonIdx) return l;
            return {
              ...l,
              assignments: l.assignments.map((a, aIdx) =>
                aIdx === assignmentIdx
                  ? { ...a, userAnswers: savedAnswersMap, evaluation }
                  : a
              ),
            };
          }),
        };
      });

      await onUpdateCourse({ ...course, modules: nextModules });
    } catch (err) {
      setBillyToast(err instanceof Error ? err.message : "Failed to grade assignment.");
    } finally {
      setLoadingAssignmentId(null);
    }
  };

  // Billy Course Chat Assistant (Saved to Course)
  const handleSendBillyChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;

    const text = chatInput.trim();
    setChatInput("");
    setIsSendingChat(true);

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: "user",
      text,
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [...(course.chatHistory || []), userMsg];

    try {
      const response = await fetch("/api/billy/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseTitle: course.title,
          activeModuleTitle: activeModule?.title,
          activeLesson,
          chatHistory: updatedHistory,
          userMessage: text,
          notebook: notebookText,
        }),
      });
      const data = await response.json();
      const billyMsg: ChatMessage = {
        id: `msg_${Date.now()}_b`,
        role: "billy",
        text: data.reply || "I'm here to help clarify any concept in this lesson!",
        timestamp: new Date().toISOString(),
      };

      await onUpdateCourse({
        ...course,
        chatHistory: [...updatedHistory, billyMsg],
      });
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: "billy",
        text: "Sorry, I hit a snag connecting right now. Please try asking again in a moment.",
        timestamp: new Date().toISOString(),
      };
      await onUpdateCourse({
        ...course,
        chatHistory: [...updatedHistory, fallbackMsg],
      });
    } finally {
      setIsSendingChat(false);
    }
  };

  // Save Course Notebook
  const handleSaveNotebook = async (customContent?: string) => {
    const contentToSave = customContent !== undefined ? customContent : notebookText;
    setIsSavingNotebook(true);
    try {
      await onUpdateCourse({
        ...course,
        notebook: contentToSave,
      });
      setNotebookSavedToast(true);
      setTimeout(() => setNotebookSavedToast(false), 2000);
    } finally {
      setIsSavingNotebook(false);
    }
  };

  const handleInsertLessonSummaryIntoNotebook = async () => {
    if (!activeLesson) return;
    const snippet = `\n\n## ${activeLesson.title}\n- Summary: ${activeLesson.summary}\n${(
      activeLesson.readingSections || []
    )
      .map((s) => `- **${s.heading}**: ${s.keyTakeaway}`)
      .join("\n")}\n`;
    const nextText = notebookText + snippet;
    setNotebookText(nextText);
    await handleSaveNotebook(nextText);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6">
      {/* Top Course Workspace Header */}
      <div className="bg-[#16243e] border border-[#2c4470] rounded-lg p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#b0b8c4]">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="hover:text-[#f3f5f7] flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <span>·</span>
            <span className="text-[#84ab35]">{course.config.courseFormat.toUpperCase()}</span>
            <span>·</span>
            <span>TONE: {course.config.tone.toUpperCase()}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#f3f5f7] mt-1">{course.title}</h1>
        </div>

        {/* Progress Readout */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-mono-tabular text-[#b0b8c4]">
              COURSE PROGRESS · <span className="text-[#84ab35] font-semibold">{course.progress}%</span>
            </div>
            <div className="w-40 h-2 bg-[#181b20] rounded-full overflow-hidden border border-[#2c4470] mt-1">
              <div
                className="h-full bg-[#6b8e23] transition-all duration-300"
                style={{ width: `${course.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {billyToast && (
        <div className="mb-5 p-3.5 bg-[#1e3154] border border-[#84ab35] rounded-lg flex items-center justify-between text-xs text-[#f3f5f7]">
          <span>
            <strong className="text-[#84ab35] font-mono-tabular mr-2">BILLY:</strong>
            {billyToast}
          </span>
          <button
            type="button"
            onClick={() => setBillyToast(null)}
            className="text-[#b0b8c4] hover:text-[#f3f5f7] ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main 12-Column Course Layout:
          Left 3 cols: Module & Lesson Syllabus Tree
          Center 5 cols: Multi-Modal Lesson Stage & Adaptive Assignments
          Right 4 cols: Billy Clarification Chat + Course Notebook */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 3 Cols: Syllabus Navigation */}
        <div className="lg:col-span-3 bg-[#21262d] border border-[#2c4470] rounded-lg p-4 space-y-4">
          <div className="border-b border-[#282e37] pb-3">
            <span className="text-xs font-mono-tabular text-[#84ab35]">COURSE MODULES</span>
            <p className="text-xs text-[#b0b8c4] mt-0.5">Select any lesson to study or practice.</p>
          </div>

          <div className="space-y-4">
            {course.modules.map((mod, mIdx) => (
              <div key={mod.id || mIdx} className="space-y-1.5">
                <div className="text-xs font-mono-tabular text-[#7d8796] px-2">
                  MODULE 0{mIdx + 1}
                </div>
                <p className="text-xs font-semibold text-[#f3f5f7] px-2 mb-1">{mod.title}</p>
                <div className="space-y-1">
                  {mod.lessons.map((les, lIdx) => {
                    const isCurrent = mIdx === selectedModuleIdx && lIdx === selectedLessonIdx;
                    return (
                      <button
                        key={les.id || lIdx}
                        type="button"
                        onClick={() => {
                          setSelectedModuleIdx(mIdx);
                          setSelectedLessonIdx(lIdx);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded text-left text-xs transition-colors cursor-pointer ${
                          isCurrent
                            ? "bg-[#1e3154] border border-[#84ab35] text-[#f3f5f7] font-medium"
                            : "text-[#b0b8c4] hover:bg-[#181b20] hover:text-[#f3f5f7]"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {les.completed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#84ab35] shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-[#7d8796] shrink-0" />
                          )}
                          <span className="truncate">
                            {lIdx + 1}. {les.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono-tabular text-[#7d8796] shrink-0">
                          {les.estimatedMinutes || 15}m
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center 5 Cols: Active Lesson Stage */}
        <div className="lg:col-span-5 space-y-6">
          {activeLesson && (
            <div className="bg-[#21262d] border border-[#2c4470] rounded-lg overflow-hidden">
              <CourseCoverPicture
                category={course.category}
                title={`Module 0${selectedModuleIdx + 1} · Lesson 0${selectedLessonIdx + 1}`}
                className="h-40 w-full"
              />

              <div className="p-6 space-y-6">
                {/* Lesson Title & Completion Button */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#282e37] pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#84ab35]">
                      <span>LESSON 0{selectedLessonIdx + 1}</span>
                      <span>·</span>
                      <span>{activeLesson.estimatedMinutes || 15} MIN</span>
                    </div>
                    <h2 className="text-xl font-bold text-[#f3f5f7] mt-1">{activeLesson.title}</h2>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleLessonComplete}
                    className={`px-3.5 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                      activeLesson.completed
                        ? "bg-[#6b8e23] text-[#f3f5f7]"
                        : "bg-[#181b20] border border-[#2c4470] text-[#b0b8c4] hover:text-[#f3f5f7]"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{activeLesson.completed ? "Lesson Completed" : "Mark as Completed"}</span>
                  </button>
                </div>

                {/* Billy's Real Gemini TTS Audio Recording Player */}
                <div className="bg-[#16243e] border border-[#2c4470] rounded-lg p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handlePlayLessonAudio}
                        disabled={isSynthesizingAudio}
                        className="w-10 h-10 rounded-full bg-[#6b8e23] hover:bg-[#84ab35] disabled:opacity-50 flex items-center justify-center text-[#f3f5f7] transition-colors cursor-pointer shrink-0"
                        title="Play Billy's Spoken Audio Walkthrough"
                      >
                        {isPlayingAudio ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#84ab35]">
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>BILLY AUDIO RECORDING ({course.config.audioPct}% EMPHASIS)</span>
                        </div>
                        <p className="text-xs text-[#f3f5f7] font-medium mt-0.5">
                          {isSynthesizingAudio
                            ? "Billy is recording your audio walkthrough..."
                            : isPlayingAudio
                            ? "Playing Billy's spoken lesson walkthrough"
                            : "Listen to Billy walk through this lesson aloud"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {audioError && (
                    <p className="text-xs text-red-300 mt-2">{audioError}</p>
                  )}

                  {activeLesson.audioScript && (
                    <p className="mt-3 pt-3 border-t border-[#2c4470]/60 text-xs text-[#b0b8c4] italic leading-relaxed">
                      "{activeLesson.audioScript}"
                    </p>
                  )}
                </div>

                {/* Historical Context */}
                {activeLesson.historicalContext && (
                  <div className="bg-[#181b20] border border-[#2c4470]/60 rounded-lg p-4">
                    <div className="text-xs font-mono-tabular text-[#84ab35] mb-1">
                      BACKGROUND & HISTORY ({course.config.historyDepth.toUpperCase()})
                    </div>
                    <p className="text-sm text-[#b0b8c4] leading-relaxed">
                      {activeLesson.historicalContext}
                    </p>
                  </div>
                )}

                {/* Interactive Visual Diagram */}
                {activeLesson.visualDiagram && (
                  <InteractiveDiagramCanvas diagram={activeLesson.visualDiagram} />
                )}

                {/* Reading Sections */}
                <div className="space-y-4">
                  <div className="text-xs font-mono-tabular text-[#84ab35]">
                    LESSON READING ({course.config.readingPct}% EMPHASIS)
                  </div>
                  {activeLesson.readingSections?.map((sec, idx) => (
                    <div
                      key={idx}
                      className="bg-[#181b20] border border-[#282e37] rounded-lg p-5 space-y-2.5"
                    >
                      <h3 className="text-base font-semibold text-[#f3f5f7]">{sec.heading}</h3>
                      <p className="text-sm text-[#b0b8c4] leading-relaxed whitespace-pre-line">
                        {sec.content}
                      </p>
                      <div className="pt-2 border-t border-[#282e37] text-xs font-mono-tabular text-[#84ab35]">
                        Key Takeaway: {sec.keyTakeaway}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Curated Videos & Source Materials */}
                {activeLesson.videoAndSources?.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-mono-tabular text-[#84ab35]">
                      VIDEOS & SOURCE MATERIALS ({course.config.videoPct}% EMPHASIS)
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {activeLesson.videoAndSources.map((vs, idx) => {
                        const href = vs.searchQueryOrUrl?.startsWith("http")
                          ? vs.searchQueryOrUrl
                          : `https://www.youtube.com/results?search_query=${encodeURIComponent(
                              vs.searchQueryOrUrl || vs.title
                            )}`;
                        return (
                          <a
                            key={idx}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-[#181b20] hover:bg-[#16243e] border border-[#2c4470]/70 rounded-lg p-4 transition-colors"
                          >
                            <div className="flex items-center justify-between text-xs font-mono-tabular text-[#84ab35]">
                              <span>{vs.format}</span>
                              <span>{vs.durationOrLength}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-1">
                              <p className="text-sm font-semibold text-[#f3f5f7]">{vs.title}</p>
                              <ExternalLink className="w-3.5 h-3.5 text-[#b0b8c4] shrink-0" />
                            </div>
                            <p className="text-xs text-[#b0b8c4] mt-1">{vs.keyFocus}</p>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Understanding Check Bar: Regenerate Lesson or Create More Assignments */}
                <div className="bg-[#16243e] border border-[#2c4470] rounded-lg p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono-tabular text-[#84ab35]">
                        NEED MORE CLARITY OR PRACTICE?
                      </p>
                      <h4 className="text-sm font-semibold text-[#f3f5f7] mt-0.5">
                        Didn't fully understand this lesson, or want extra practice?
                      </h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRegenBox((prev) => !prev)}
                        className="px-3.5 py-2 text-xs font-semibold text-[#f3f5f7] bg-[#181b20] hover:bg-[#21262d] border border-[#84ab35] rounded flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[#84ab35]" />
                        <span>Regenerate Lesson</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateMoreAssignments}
                        disabled={isCreatingAssignment}
                        className="px-3.5 py-2 text-xs font-semibold text-[#f3f5f7] bg-[#6b8e23] hover:bg-[#84ab35] disabled:opacity-50 rounded flex items-center gap-1.5 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>
                          {isCreatingAssignment ? "Creating..." : "Create More Assignments"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {showRegenBox && (
                    <form onSubmit={handleRegenerateLesson} className="pt-3 border-t border-[#2c4470] space-y-3">
                      <label className="block text-xs text-[#b0b8c4]">
                        Tell Billy what felt unclear or how you'd like this lesson reshaped (optional):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={regenFeedback}
                          onChange={(e) => setRegenFeedback(e.target.value)}
                          placeholder="e.g., Explain it with a simpler real-world analogy..."
                          className="flex-1 px-3 py-2 bg-[#181b20] border border-[#2c4470] rounded text-xs text-[#f3f5f7] focus:outline-none focus:border-[#84ab35]"
                        />
                        <button
                          type="submit"
                          disabled={isRegeneratingLesson}
                          className="px-4 py-2 text-xs font-semibold text-[#f3f5f7] bg-[#6b8e23] hover:bg-[#84ab35] disabled:opacity-50 rounded cursor-pointer whitespace-nowrap"
                        >
                          {isRegeneratingLesson ? "Regenerating..." : "Regenerate Now"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Adaptive Assignments Section */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono-tabular text-[#84ab35]">
                      HANDS-ON ASSIGNMENTS ({activeLesson.assignments?.length || 0})
                    </span>
                    <span className="text-xs text-[#b0b8c4]">
                      Modify difficulty anytime for more relaxing or challenging questions
                    </span>
                  </div>

                  {activeLesson.assignments?.map((asgn, aIdx) => {
                    const isUpdatingThis =
                      loadingAssignmentId === (asgn.id || String(aIdx));
                    return (
                      <div
                        key={asgn.id || aIdx}
                        className="bg-[#181b20] border border-[#2c4470] rounded-lg p-5 space-y-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#282e37] pb-3">
                          <div>
                            <span className="text-xs font-mono-tabular text-[#84ab35]">
                              ASSIGNMENT 0{aIdx + 1} · {asgn.difficulty.toUpperCase()}
                            </span>
                            <h4 className="text-base font-bold text-[#f3f5f7] mt-0.5">{asgn.title}</h4>
                          </div>

                          {/* Difficulty Switcher */}
                          <div className="flex items-center gap-1 bg-[#21262d] p-1 rounded border border-[#2c4470]/70">
                            {(["Relaxing", "Standard", "Challenging"] as const).map((level) => {
                              const active =
                                asgn.difficulty?.toLowerCase() === level.toLowerCase();
                              return (
                                <button
                                  key={level}
                                  type="button"
                                  disabled={isUpdatingThis}
                                  onClick={() =>
                                    handleChangeAssignmentDifficulty(asgn, aIdx, level)
                                  }
                                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                                    active
                                      ? "bg-[#6b8e23] text-[#f3f5f7]"
                                      : "text-[#b0b8c4] hover:text-[#f3f5f7]"
                                  }`}
                                >
                                  {level}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <p className="text-xs text-[#b0b8c4] leading-relaxed">
                          {asgn.scenarioPrompt}
                        </p>

                        {isUpdatingThis ? (
                          <div className="p-4 bg-[#21262d] rounded text-xs font-mono-tabular text-[#84ab35]">
                            Billy is calibrating assignment questions...
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {asgn.questions?.map((q, qIdx) => {
                              const qKey = `${asgn.id || aIdx}_${q.id || qIdx}`;
                              const answerVal =
                                draftAnswers[qKey] ??
                                asgn.userAnswers?.[q.id || String(qIdx)] ??
                                "";
                              const qFeedback = asgn.evaluation?.questionFeedback?.find(
                                (fb) => fb.questionId === (q.id || String(qIdx))
                              );

                              return (
                                <div
                                  key={q.id || qIdx}
                                  className="bg-[#21262d] border border-[#282e37] rounded-md p-4 space-y-2.5"
                                >
                                  <p className="text-xs font-semibold text-[#f3f5f7]">
                                    Q{qIdx + 1}. {q.question}
                                  </p>

                                  <textarea
                                    rows={2}
                                    value={answerVal}
                                    onChange={(e) =>
                                      setDraftAnswers((prev) => ({
                                        ...prev,
                                        [qKey]: e.target.value,
                                      }))
                                    }
                                    placeholder="Write your solution or response..."
                                    className="w-full px-3 py-2 bg-[#181b20] border border-[#2c4470]/70 rounded text-xs text-[#f3f5f7] focus:outline-none focus:border-[#84ab35]"
                                  />

                                  <div className="flex flex-wrap items-center gap-3 text-xs">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setVisibleHints((prev) => ({
                                          ...prev,
                                          [qKey]: !prev[qKey],
                                        }))
                                      }
                                      className="text-[#84ab35] hover:underline cursor-pointer"
                                    >
                                      {visibleHints[qKey] ? "Hide Hint" : "Show Hint"}
                                    </button>
                                    <span>·</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setVisibleSolutions((prev) => ({
                                          ...prev,
                                          [qKey]: !prev[qKey],
                                        }))
                                      }
                                      className="text-[#b0b8c4] hover:text-[#f3f5f7] hover:underline cursor-pointer"
                                    >
                                      {visibleSolutions[qKey]
                                        ? "Hide Reference Answer"
                                        : "Show Reference Answer"}
                                    </button>
                                  </div>

                                  {visibleHints[qKey] && (
                                    <div className="p-2.5 bg-[#181b20] border border-[#2c4470]/60 rounded text-xs text-[#b0b8c4]">
                                      <strong className="text-[#84ab35]">Hint:</strong> {q.hint}
                                    </div>
                                  )}

                                  {visibleSolutions[qKey] && (
                                    <div className="p-2.5 bg-[#181b20] border border-[#6b8e23]/60 rounded text-xs text-[#b0b8c4]">
                                      <strong className="text-[#84ab35]">Reference Solution:</strong>{" "}
                                      {q.sampleSolution}
                                    </div>
                                  )}

                                  {qFeedback && (
                                    <div className="p-2.5 bg-[#16243e] border border-[#84ab35]/60 rounded text-xs text-[#f3f5f7]">
                                      <span className="font-mono-tabular text-[#84ab35]">
                                        [{qFeedback.status}]
                                      </span>{" "}
                                      {qFeedback.comment}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            <div className="flex items-center justify-between pt-2">
                              <button
                                type="button"
                                onClick={() => handleEvaluateAssignment(asgn, aIdx)}
                                className="px-4 py-2 text-xs font-semibold text-[#f3f5f7] bg-[#6b8e23] hover:bg-[#84ab35] rounded transition-colors cursor-pointer"
                              >
                                Submit Assignment to Billy
                              </button>

                              {asgn.evaluation && (
                                <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#84ab35]">
                                  <Award className="w-4 h-4" />
                                  <span>SCORE: {asgn.evaluation.score}/100</span>
                                </div>
                              )}
                            </div>

                            {asgn.evaluation?.overallFeedback && (
                              <div className="p-3.5 bg-[#16243e] border border-[#84ab35] rounded text-xs text-[#f3f5f7] leading-relaxed">
                                <div className="font-mono-tabular text-[#84ab35] mb-1">
                                  BILLY'S FEEDBACK
                                </div>
                                {asgn.evaluation.overallFeedback}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 4 Cols: Built-in AI Assistant ("Billy") & Built-in Course Notebook */}
        <div className="lg:col-span-4 bg-[#21262d] border border-[#2c4470] rounded-lg flex flex-col h-[720px] sticky top-6">
          {/* Segmented Toggle: Ask Billy vs Course Notebook */}
          <div className="p-3 bg-[#16243e] border-b border-[#2c4470] flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRightTab("billy")}
              className={`flex-1 py-2 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                rightTab === "billy"
                  ? "bg-[#6b8e23] text-[#f3f5f7]"
                  : "bg-[#181b20] text-[#b0b8c4] hover:text-[#f3f5f7]"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask Billy (Saved Chat)</span>
            </button>
            <button
              type="button"
              onClick={() => setRightTab("notebook")}
              className={`flex-1 py-2 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                rightTab === "notebook"
                  ? "bg-[#6b8e23] text-[#f3f5f7]"
                  : "bg-[#181b20] text-[#b0b8c4] hover:text-[#f3f5f7]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Course Notebook</span>
            </button>
          </div>

          {rightTab === "billy" ? (
            <>
              <div className="px-4 py-2.5 bg-[#181b20] border-b border-[#282e37]">
                <p className="text-xs text-[#b0b8c4]">
                  Ask Billy for clarification at any point. All chats are saved to this course for reference.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(course.chatHistory || []).map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-lg text-xs leading-relaxed ${
                      msg.role === "billy"
                        ? "bg-[#181b20] border border-[#2c4470]/80 text-[#f3f5f7]"
                        : "bg-[#1e3154] border border-[#84ab35]/60 text-[#f3f5f7] ml-6"
                    }`}
                  >
                    <div className="text-[10px] font-mono-tabular text-[#84ab35] mb-1">
                      {msg.role === "billy" ? "BILLY" : "YOU"}
                    </div>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                ))}

                {isSendingChat && (
                  <div className="p-3 bg-[#181b20] border border-[#2c4470] rounded text-xs font-mono-tabular text-[#84ab35]">
                    Billy is thinking...
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSendBillyChat}
                className="p-3.5 border-t border-[#282e37] bg-[#181b20] flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Billy a question about this lesson..."
                  disabled={isSendingChat}
                  className="flex-1 px-3.5 py-2.5 bg-[#21262d] border border-[#2c4470] rounded text-xs text-[#f3f5f7] focus:outline-none focus:border-[#84ab35]"
                />
                <button
                  type="submit"
                  disabled={isSendingChat || !chatInput.trim()}
                  className="px-3.5 py-2.5 bg-[#6b8e23] hover:bg-[#84ab35] disabled:opacity-50 text-[#f3f5f7] rounded transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono-tabular text-[#84ab35]">
                  BUILT-IN COURSE NOTEBOOK
                </span>
                <button
                  type="button"
                  onClick={handleInsertLessonSummaryIntoNotebook}
                  className="px-2.5 py-1 text-xs bg-[#181b20] hover:bg-[#1e3154] text-[#b0b8c4] hover:text-[#f3f5f7] border border-[#2c4470] rounded transition-colors cursor-pointer"
                >
                  + Insert Lesson Key Takeaways
                </button>
              </div>

              <textarea
                value={notebookText}
                onChange={(e) => setNotebookText(e.target.value)}
                placeholder="Jot down notes, formulas, code snippets, or reminders for this course..."
                className="flex-1 w-full p-3.5 bg-[#181b20] border border-[#2c4470] rounded-md text-xs text-[#f3f5f7] font-mono-tabular leading-relaxed resize-none focus:outline-none focus:border-[#84ab35]"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[#84ab35]">
                  {notebookSavedToast ? "Saved to course!" : "Saved per course in cloud"}
                </span>
                <button
                  type="button"
                  onClick={() => handleSaveNotebook()}
                  disabled={isSavingNotebook}
                  className="px-4 py-2 text-xs font-semibold text-[#f3f5f7] bg-[#6b8e23] hover:bg-[#84ab35] disabled:opacity-50 rounded transition-colors cursor-pointer"
                >
                  {isSavingNotebook ? "Saving..." : "Save Notebook"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
