import React, { useState } from "react";
import { Course, ChatMessage } from "../types";
import { CourseCoverPicture, InteractiveDiagramCanvas } from "./CategoryVisual";
import {
  CheckCircle2,
  Send,
  BookOpen,
  Clock,
  Sliders,
  ArrowLeft,
  Play,
  Layers,
  MessageSquare,
} from "lucide-react";

interface CoursePreviewViewProps {
  course: Course;
  onUpdateCourse: (updated: Course) => Promise<void>;
  onSolidifyCourse: (solidified: Course) => Promise<void>;
  onBackToDashboard: () => void;
}

export const CoursePreviewView: React.FC<CoursePreviewViewProps> = ({
  course,
  onUpdateCourse,
  onSolidifyCourse,
  onBackToDashboard,
}) => {
  const [selectedModuleIdx, setSelectedModuleIdx] = useState(0);
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0);
  const [tweakInput, setTweakInput] = useState("");
  const [isTweaking, setIsTweaking] = useState(false);
  const [isSolidifying, setIsSolidifying] = useState(false);
  const [tweakError, setTweakError] = useState<string | null>(null);

  const activeModule = course.modules[selectedModuleIdx] || course.modules[0];
  const activeLesson = activeModule?.lessons?.[selectedLessonIdx] || activeModule?.lessons?.[0];

  const handleSendTweak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tweakInput.trim() || isTweaking) return;

    const requestText = tweakInput.trim();
    setTweakInput("");
    setIsTweaking(true);
    setTweakError(null);

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: "user",
      text: requestText,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...(course.chatHistory || []), userMsg];

    try {
      const response = await fetch("/api/billy/tweak-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentCourse: {
            title: course.title,
            subtitle: course.subtitle,
            category: course.category,
            billyWelcome: "Updated preview",
            modules: course.modules,
          },
          userRequest: requestText,
          config: course.config,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to apply course tweak.");
      }

      const billyMsg: ChatMessage = {
        id: `msg_${Date.now()}_b`,
        role: "billy",
        text:
          data.billyReply ||
          "I've updated the course preview with your changes. Click through the modules to inspect the updates!",
        timestamp: new Date().toISOString(),
      };

      const updatedCourse: Course = {
        ...course,
        title: data.updatedCourse?.title || course.title,
        subtitle: data.updatedCourse?.subtitle || course.subtitle,
        category: data.updatedCourse?.category || course.category,
        modules: Array.isArray(data.updatedCourse?.modules)
          ? data.updatedCourse.modules
          : course.modules,
        chatHistory: [...nextHistory, billyMsg],
      };

      await onUpdateCourse(updatedCourse);
    } catch (err) {
      setTweakError(err instanceof Error ? err.message : "Failed to tweak course.");
    } finally {
      setIsTweaking(false);
    }
  };

  const handleSolidify = async () => {
    setIsSolidifying(true);
    try {
      const solidified: Course = {
        ...course,
        status: "active",
      };
      await onSolidifyCourse(solidified);
    } finally {
      setIsSolidifying(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6">
      {/* Top Preview Banner */}
      <div className="bg-[#16243e] border border-[#2c4470] rounded-lg p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#84ab35]">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="hover:underline flex items-center gap-1 text-[#b0b8c4] hover:text-[#f3f5f7] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <span>·</span>
            <span>COURSE PREVIEW & CUSTOMIZATION</span>
          </div>
          <h1 className="text-2xl font-bold text-[#f3f5f7] mt-1">{course.title}</h1>
          <p className="text-sm text-[#b0b8c4] mt-0.5 max-w-3xl">{course.subtitle}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSolidify}
            disabled={isSolidifying}
            className="px-5 py-2.5 text-sm font-semibold text-[#f3f5f7] bg-[#6b8e23] hover:bg-[#84ab35] rounded-md flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSolidifying ? "Solidifying..." : "Solidify & Start Course"}</span>
          </button>
        </div>
      </div>

      {/* Main 12-Column Split: Course Modules/Lesson Preview (8 cols) + Billy Tweak Assistant (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Module & Lesson Interactive Preview */}
        <div className="lg:col-span-8 space-y-6">
          {/* Module Selector Tabs */}
          <div className="bg-[#21262d] border border-[#2c4470] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono-tabular text-[#84ab35]">
                CLICK THROUGH MODULES & LESSONS TO PREVIEW
              </span>
              <span className="text-xs font-mono-tabular text-[#b0b8c4]">
                {course.modules.length} Modules ·{" "}
                {course.modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} Lessons
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {course.modules.map((mod, mIdx) => {
                const isSelected = mIdx === selectedModuleIdx;
                return (
                  <button
                    key={mod.id || mIdx}
                    type="button"
                    onClick={() => {
                      setSelectedModuleIdx(mIdx);
                      setSelectedLessonIdx(0);
                    }}
                    className={`p-3.5 rounded-md border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#1e3154] border-[#84ab35] text-[#f3f5f7]"
                        : "bg-[#181b20] border-[#282e37] text-[#b0b8c4] hover:border-[#2c4470]"
                    }`}
                  >
                    <p className="text-xs font-mono-tabular text-[#84ab35]">MODULE 0{mIdx + 1}</p>
                    <p className="text-sm font-semibold text-[#f3f5f7] mt-1 line-clamp-1">{mod.title}</p>
                    <p className="text-xs text-[#7d8796] mt-1 line-clamp-2">{mod.objective}</p>
                  </button>
                );
              })}
            </div>

            {/* Lessons inside Active Module */}
            {activeModule && (
              <div className="mt-4 pt-4 border-t border-[#282e37] flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono-tabular text-[#7d8796] mr-2">LESSONS:</span>
                {activeModule.lessons.map((les, lIdx) => {
                  const isLessonActive = lIdx === selectedLessonIdx;
                  return (
                    <button
                      key={les.id || lIdx}
                      type="button"
                      onClick={() => setSelectedLessonIdx(lIdx)}
                      className={`px-3.5 py-2 rounded text-xs font-medium transition-colors cursor-pointer ${
                        isLessonActive
                          ? "bg-[#6b8e23] text-[#f3f5f7]"
                          : "bg-[#181b20] text-[#b0b8c4] border border-[#2c4470]/60 hover:text-[#f3f5f7]"
                      }`}
                    >
                      0{lIdx + 1}. {les.title}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Lesson Preview Stage */}
          {activeLesson && (
            <div className="bg-[#21262d] border border-[#2c4470] rounded-lg overflow-hidden">
              <CourseCoverPicture
                category={course.category}
                title={`Module 0${selectedModuleIdx + 1} · ${activeLesson.title}`}
                className="h-36 w-full"
              />

              <div className="p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#282e37] pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#84ab35]">
                      <span>LESSON PREVIEW</span>
                      <span>·</span>
                      <span>{activeLesson.estimatedMinutes || 15} MIN</span>
                      <span>·</span>
                      <span>{activeLesson.assignments?.length || 1} ASSIGNMENTS</span>
                    </div>
                    <h2 className="text-xl font-bold text-[#f3f5f7] mt-1">{activeLesson.title}</h2>
                  </div>
                </div>

                <p className="text-sm text-[#b0b8c4] leading-relaxed">{activeLesson.summary}</p>

                {/* Historical Context Preview */}
                {activeLesson.historicalContext && (
                  <div className="bg-[#181b20] border border-[#2c4470]/60 rounded-md p-4">
                    <p className="text-xs font-mono-tabular text-[#84ab35] mb-1">
                      HISTORICAL CONTEXT & BACKGROUND ({course.config.historyDepth.toUpperCase()})
                    </p>
                    <p className="text-sm text-[#b0b8c4] leading-relaxed">{activeLesson.historicalContext}</p>
                  </div>
                )}

                {/* Visual Diagram Preview */}
                {activeLesson.visualDiagram && (
                  <InteractiveDiagramCanvas diagram={activeLesson.visualDiagram} />
                )}

                {/* Reading Sections Preview */}
                <div className="space-y-4">
                  <h3 className="text-sm font-mono-tabular text-[#84ab35]">
                    READING SECTIONS ({activeLesson.readingSections?.length || 0})
                  </h3>
                  {activeLesson.readingSections?.map((sec, idx) => (
                    <div key={idx} className="bg-[#181b20] border border-[#282e37] rounded-md p-4 space-y-2">
                      <h4 className="text-base font-semibold text-[#f3f5f7]">{sec.heading}</h4>
                      <p className="text-sm text-[#b0b8c4] leading-relaxed">{sec.content}</p>
                      <p className="text-xs font-mono-tabular text-[#84ab35] pt-1">
                        Key Takeaway: {sec.keyTakeaway}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Assignments Preview */}
                <div className="bg-[#16243e]/50 border border-[#2c4470] rounded-md p-4">
                  <div className="flex items-center justify-between text-xs font-mono-tabular text-[#84ab35] mb-2">
                    <span>INCLUDED ASSIGNMENTS PREVIEW</span>
                    <span>DEFAULT DIFFICULTY: {course.config.assignmentDifficulty.toUpperCase()}</span>
                  </div>
                  <div className="space-y-2">
                    {activeLesson.assignments?.map((asgn, aIdx) => (
                      <div key={asgn.id || aIdx} className="bg-[#181b20] p-3 rounded border border-[#282e37]">
                        <p className="text-sm font-semibold text-[#f3f5f7]">
                          {asgn.title} <span className="text-xs font-mono-tabular text-[#84ab35]">· {asgn.difficulty}</span>
                        </p>
                        <p className="text-xs text-[#b0b8c4] mt-1">{asgn.scenarioPrompt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 4 Columns: Billy AI Chatbot Agent for Tweaks */}
        <div className="lg:col-span-4 bg-[#21262d] border border-[#2c4470] rounded-lg flex flex-col h-[680px] sticky top-6">
          <div className="p-4 bg-[#16243e] border-b border-[#2c4470]">
            <div className="flex items-center justify-between text-xs font-mono-tabular text-[#84ab35]">
              <span>AI MENTOR · BILLY</span>
              <span>PREVIEW TWEAK STUDIO</span>
            </div>
            <h3 className="text-base font-bold text-[#f3f5f7] mt-1">Tweak Your Course with Billy</h3>
            <p className="text-xs text-[#b0b8c4] mt-0.5">
              Ask Billy to add modules, adjust tone, change examples, or reshape lessons before solidifying.
            </p>
          </div>

          {/* Quick Tweak Suggestions */}
          <div className="px-4 py-2.5 bg-[#181b20] border-b border-[#282e37] flex flex-wrap gap-1.5">
            {[
              "Add more practical project examples",
              "Make the tone more casual",
              "Add a lesson on common pitfalls",
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setTweakInput(suggestion)}
                className="px-2.5 py-1 text-[11px] bg-[#21262d] hover:bg-[#1e3154] text-[#b0b8c4] hover:text-[#f3f5f7] border border-[#2c4470]/60 rounded transition-colors cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
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

            {isTweaking && (
              <div className="p-3.5 rounded-lg bg-[#181b20] border border-[#2c4470] text-xs text-[#84ab35] font-mono-tabular">
                Billy is updating your course structure...
              </div>
            )}

            {tweakError && (
              <div className="p-3 rounded bg-red-950/60 border border-red-700 text-xs text-red-200">
                {tweakError}
              </div>
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendTweak} className="p-3.5 border-t border-[#282e37] bg-[#181b20]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tweakInput}
                onChange={(e) => setTweakInput(e.target.value)}
                placeholder="Ask Billy to tweak anything in this preview..."
                disabled={isTweaking}
                className="flex-1 px-3.5 py-2.5 bg-[#21262d] border border-[#2c4470] rounded text-xs text-[#f3f5f7] focus:outline-none focus:border-[#84ab35]"
              />
              <button
                type="submit"
                disabled={isTweaking || !tweakInput.trim()}
                className="px-3.5 py-2.5 bg-[#6b8e23] hover:bg-[#84ab35] disabled:opacity-50 text-[#f3f5f7] rounded transition-colors cursor-pointer"
                title="Send Tweak to Billy"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
