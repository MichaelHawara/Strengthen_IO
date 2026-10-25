import React, { useState, useEffect } from "react";
import { Course, CourseConfig, UserProfile } from "../types";
import { CourseCoverPicture } from "./CategoryVisual";
import {
  ArrowLeft,
  BookOpen,
  Volume2,
  Eye,
  Video,
  Lock,
  Unlock,
  Minus,
  Plus,
  CheckCircle2,
} from "lucide-react";

interface CourseCreationStudioProps {
  uid: string;
  learnerProfile: UserProfile | null;
  onCancel: () => void;
  onCourseGenerated: (course: Course) => Promise<void>;
}

type ModalityKey = "reading" | "visual" | "audio" | "video";

const EXAMPLE_PROMPTS = [
  {
    label: "Create a Website",
    prompt:
      "I want to learn how to create a website from scratch with clean HTML, CSS, responsive layout, and interactive JavaScript.",
    format: "Project Walkthrough" as const,
  },
  {
    label: "Do My Own Taxes",
    prompt:
      "Teach me to do my own taxes confidently, including W-2s, 1099 freelance income, standard vs. itemized deductions, and filing step by step.",
    format: "Standard Course" as const,
  },
  {
    label: "Build a Project for RAG",
    prompt:
      "Walk me through building a project for RAG (Retrieval-Augmented Generation) with document chunking, embeddings, vector search, and grounded synthesis.",
    format: "Project Walkthrough" as const,
  },
  {
    label: "Career / Job Description Skills",
    prompt:
      "Prepare me for a Product & Systems Engineer role by teaching system architecture, API design, and technical trade-off analysis through a realistic scenario.",
    format: "Career & Job Track" as const,
  },
];

const SHUFFLING_PHRASES = [
  "Give me a minute...",
  "Adding some touch-ups...",
  "Gathering materials and references for your topic...",
  "Structuring modules around your preferred pace...",
  "Balancing reading, visuals, audio scripts, and video guides...",
  "Designing assignments calibrated to your difficulty level...",
  "Polishing your interactive course preview...",
];

export const CourseCreationStudio: React.FC<CourseCreationStudioProps> = ({
  uid,
  learnerProfile,
  onCancel,
  onCourseGenerated,
}) => {
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS[0].prompt);
  const [courseFormat, setCourseFormat] = useState<CourseConfig["courseFormat"]>("Project Walkthrough");

  // Modality percentages totaling 100% with smart recency + lock support
  const [mix, setMix] = useState<Record<ModalityKey, number>>({
    reading: 30,
    visual: 30,
    audio: 20,
    video: 20,
  });
  const [lockedKeys, setLockedKeys] = useState<Record<ModalityKey, boolean>>({
    reading: false,
    visual: false,
    audio: false,
    video: false,
  });
  // Tracks order from least-recently edited to most-recently edited so adjusting one slider
  // absorbs changes from the untouched/oldest sliders first instead of overwriting what the user just set!
  const [touchOrder, setTouchOrder] = useState<ModalityKey[]>([
    "video",
    "audio",
    "visual",
    "reading",
  ]);

  const [historyDepth, setHistoryDepth] = useState<CourseConfig["historyDepth"]>("Balanced");
  const [tone, setTone] = useState<CourseConfig["tone"]>("Conversational & Warm");
  const [pace, setPace] = useState<CourseConfig["pace"]>(
    learnerProfile?.learnerType === "Fast-learner" ? "Fast-Track" : "Moderate"
  );
  const [length, setLength] = useState<CourseConfig["length"]>("Standard Multi-Module");
  const [assignmentAmount, setAssignmentAmount] = useState<CourseConfig["assignmentAmount"]>(
    "2 per lesson (Balanced practice)"
  );
  const [assignmentDifficulty, setAssignmentDifficulty] =
    useState<CourseConfig["assignmentDifficulty"]>("Standard");
  const [priorExperience, setPriorExperience] =
    useState<CourseConfig["priorExperience"]>("Some Familiarity");
  const [sourceMode, setSourceMode] = useState<CourseConfig["sourceMode"]>("both");
  const [customSources, setCustomSources] = useState("");

  // Generation state with monotonic 1/3 -> 2/3 -> 3/3 progress
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState(1);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % SHUFFLING_PHRASES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const applyLearningStylePreset = (preset: "balanced" | "visual" | "auditory" | "text") => {
    setLockedKeys({ reading: false, visual: false, audio: false, video: false });
    if (preset === "balanced") {
      setMix({ reading: 25, visual: 25, audio: 25, video: 25 });
    } else if (preset === "visual") {
      setMix({ visual: 45, video: 25, reading: 20, audio: 10 });
    } else if (preset === "auditory") {
      setMix({ audio: 45, video: 25, reading: 15, visual: 15 });
    } else {
      setMix({ reading: 50, visual: 25, audio: 15, video: 10 });
    }
  };

  const toggleLock = (key: ModalityKey) => {
    setLockedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /**
   * Smart percentage adjuster:
   * - Respects locked modalities.
   * - Absorbs delta from the LEAST-recently touched unlocked modalities first,
   *   so the slider you just set previously stays put whenever possible!
   */
  const updateModalityPercentage = (target: ModalityKey, rawTargetValue: number) => {
    if (lockedKeys[target]) return;

    const allKeys: ModalityKey[] = ["reading", "visual", "audio", "video"];
    const adjustableOthers = touchOrder.filter((k) => k !== target && !lockedKeys[k]);
    if (adjustableOthers.length === 0) return;

    const lockedSum = allKeys
      .filter((k) => k !== target && lockedKeys[k])
      .reduce((sum, k) => sum + mix[k], 0);

    const maxAllowed = 100 - lockedSum;
    const clampedTarget = Math.max(0, Math.min(maxAllowed, Math.round(rawTargetValue / 5) * 5));
    let delta = clampedTarget - mix[target];
    if (delta === 0) return;

    const nextMix = { ...mix, [target]: clampedTarget };

    // Absorb delta from least-recently touched unlocked sliders first
    for (const otherKey of adjustableOthers) {
      if (delta === 0) break;
      const currentVal = nextMix[otherKey];
      if (delta > 0) {
        // Target increased -> reduce otherKey
        const reduction = Math.min(currentVal, delta);
        nextMix[otherKey] = currentVal - reduction;
        delta -= reduction;
      } else {
        // Target decreased -> increase otherKey
        const addition = -delta;
        nextMix[otherKey] = currentVal + addition;
        delta = 0;
      }
    }

    setMix(nextMix);
    setTouchOrder((prev) => [...prev.filter((k) => k !== target), target]);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setGenerationProgress(10); // Initial connection state before 1/3 milestone arrives
    setGenerationStep(1);
    setError(null);
    setPhraseIndex(0);

    const config: CourseConfig = {
      courseFormat,
      videoPct: mix.video,
      readingPct: mix.reading,
      audioPct: mix.audio,
      visualPct: mix.visual,
      historyDepth,
      tone,
      pace,
      length,
      assignmentAmount,
      assignmentDifficulty,
      priorExperience,
      sourceMode,
      customSources: customSources.trim(),
    };

    try {
      const response = await fetch("/api/billy/generate-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          courseFormat,
          config,
          learnerProfile,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to connect to Billy's course builder.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalCourseData: Record<string, unknown> | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const event = JSON.parse(trimmed);

          if (event.type === "progress") {
            setGenerationProgress((prev) => Math.max(prev, Number(event.progress)));
            if (event.step) setGenerationStep(Number(event.step));
          } else if (event.type === "complete") {
            setGenerationProgress(100);
            setGenerationStep(3);
            finalCourseData = event.course;
          } else if (event.type === "error") {
            throw new Error(event.error || "Failed to generate course.");
          }
        }
      }

      if (!finalCourseData) {
        throw new Error("Course generation ended before completion. Please try again.");
      }

      // Brief pause at 100% so the user clearly sees the completed full green bar
      await new Promise((r) => setTimeout(r, 450));

      const courseId = `course_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newCourse: Course = {
        id: courseId,
        ownerId: uid,
        title: String(finalCourseData.title || "Custom Skill Course"),
        subtitle: String(finalCourseData.subtitle || prompt.trim()),
        topicPrompt: prompt.trim(),
        category: String(finalCourseData.category || "tech"),
        status: "preview",
        isCompleted: false,
        progress: 0,
        config,
        modules: Array.isArray(finalCourseData.modules) ? finalCourseData.modules : [],
        notebook: `# ${String(finalCourseData.title || "Course")} — Personal Study Notes\n\n- Goal: ${prompt.trim()}\n`,
        chatHistory: [
          {
            id: `msg_${Date.now()}`,
            role: "billy",
            text: String(
              finalCourseData.billyWelcome ||
                `Hi! I'm Billy. I've put together a preview of "${finalCourseData.title || "your course"}". Feel free to click through the modules and lessons, or ask me right here if you'd like to tweak anything before we solidify it!`
            ),
            timestamp: new Date().toISOString(),
          },
        ],
      };

      await onCourseGenerated(newCourse);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while Billy was creating your course."
      );
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-[#181b20] flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-[#21262d] border border-[#2c4470] rounded-lg overflow-hidden">
          <CourseCoverPicture category="ai" title="Billy Course Studio" className="h-48 w-full" />
          <div className="p-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-mono-tabular text-[#84ab35]">
              <span>BILLY IS CRAFTING YOUR COURSE</span>
              <span>·</span>
              <span>STAGE {generationStep} OF 3</span>
            </div>

            <h2 className="text-2xl font-bold text-[#f3f5f7] transition-all duration-300 min-h-[2.25rem]">
              {SHUFFLING_PHRASES[phraseIndex]}
            </h2>

            <p className="text-sm text-[#b0b8c4] max-w-md mx-auto leading-relaxed">
              Building modules, visual diagrams, spoken audio walkthroughs, and adaptive assignments for:{" "}
              <span className="text-[#f3f5f7] font-medium">
                "{prompt.slice(0, 110)}
                {prompt.length > 110 ? "..." : ""}"
              </span>
            </p>

            {/* Monotonic 3-Stage Progress Bar (1/3 -> 2/3 -> 3/3) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono-tabular text-[#b0b8c4]">
                <span>PROGRESS</span>
                <span className="text-[#84ab35] font-semibold">{generationProgress}%</span>
              </div>
              <div className="relative w-full bg-[#181b20] h-3 rounded-full overflow-hidden border border-[#2c4470]">
                {/* 1/3 and 2/3 Milestone Dividers */}
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-[#2c4470]/80 z-10" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-[#2c4470]/80 z-10" />
                <div
                  className="bg-[#6b8e23] h-full transition-all duration-700 ease-out"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
              <div className="grid grid-cols-3 text-[11px] font-mono-tabular pt-1">
                <div
                  className={`text-left ${
                    generationProgress >= 33 ? "text-[#84ab35] font-medium" : "text-[#7d8796]"
                  }`}
                >
                  1/3 · Researching
                </div>
                <div
                  className={`text-center ${
                    generationProgress >= 67 ? "text-[#84ab35] font-medium" : "text-[#7d8796]"
                  }`}
                >
                  2/3 · Verified & Approved
                </div>
                <div
                  className={`text-right ${
                    generationProgress >= 100 ? "text-[#84ab35] font-medium" : "text-[#7d8796]"
                  }`}
                >
                  3/3 · Course Built
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3 text-xs font-mono-tabular text-[#7d8796]">
              <span>Reading {mix.reading}%</span>
              <span>·</span>
              <span>Visuals {mix.visual}%</span>
              <span>·</span>
              <span>Audio {mix.audio}%</span>
              <span>·</span>
              <span>Videos {mix.video}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const modalityCards: {
    key: ModalityKey;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    barColor: string;
  }[] = [
    {
      key: "reading",
      title: "Reading & Written Guides",
      subtitle: "Structured text explanations & key takeaways",
      icon: <BookOpen className="w-4 h-4 text-[#84ab35]" />,
      barColor: "bg-[#6b8e23]",
    },
    {
      key: "visual",
      title: "Interactive Visuals & Diagrams",
      subtitle: "Clickable flowcharts, architecture maps & models",
      icon: <Eye className="w-4 h-4 text-[#84ab35]" />,
      barColor: "bg-[#84ab35]",
    },
    {
      key: "audio",
      title: "Audio Recordings (Billy Voice)",
      subtitle: "Spoken walkthroughs synthesized with Gemini TTS",
      icon: <Volume2 className="w-4 h-4 text-[#84ab35]" />,
      barColor: "bg-[#3b66a8]",
    },
    {
      key: "video",
      title: "Videos & Curated Sources",
      subtitle: "Video study guides & primary documentation",
      icon: <Video className="w-4 h-4 text-[#84ab35]" />,
      barColor: "bg-[#2c4470]",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#b0b8c4] hover:text-[#f3f5f7] mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-[#f3f5f7]">Create a New Course with Billy</h1>
          <p className="text-sm text-[#b0b8c4] mt-1">
            Specify what you want to learn or build, and calibrate how Billy structures your lessons, media, and assignments.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950/60 border border-red-700 rounded-lg text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleCreateCourse} className="space-y-8">
        {/* Section 1: Course Prompt & Format */}
        <div className="bg-[#21262d] border border-[#2c4470] rounded-lg p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#282e37] pb-4">
            <div>
              <span className="text-xs font-mono-tabular text-[#84ab35]">01 · TOPIC, PROJECT OR CAREER GOAL</span>
              <h2 className="text-lg font-semibold text-[#f3f5f7] mt-0.5">What should Billy teach you?</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {EXAMPLE_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setPrompt(item.prompt);
                    setCourseFormat(item.format);
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-[#181b20] hover:bg-[#16243e] text-[#b0b8c4] hover:text-[#f3f5f7] border border-[#2c4470]/70 rounded transition-colors cursor-pointer whitespace-nowrap"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#b0b8c4] mb-2">
              Your Prompt for the Course (Skill, Project Walkthrough, Fictitious Scenario, or Job Description)
            </label>
            <textarea
              rows={3}
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., I want to learn how to create a website, Teach me to do my own taxes, or Walk me through building a project for RAG..."
              className="w-full px-4 py-3 bg-[#181b20] border border-[#2c4470] rounded-md text-sm text-[#f3f5f7] focus:outline-none focus:border-[#84ab35]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#b0b8c4] mb-2">Course Structure Format</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(
                [
                  { id: "Standard Course", desc: "Structured online course with progressive lessons" },
                  { id: "Project Walkthrough", desc: "Build a complete hands-on project while learning" },
                  { id: "Fictitious Scenario", desc: "Roleplay a realistic scenario to apply skills" },
                  { id: "Career & Job Track", desc: "Targeted skill building for a job description" },
                ] as const
              ).map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setCourseFormat(fmt.id)}
                  className={`p-3.5 rounded-md border text-left transition-colors cursor-pointer ${
                    courseFormat === fmt.id
                      ? "bg-[#1e3154] border-[#84ab35] text-[#f3f5f7]"
                      : "bg-[#181b20] border-[#282e37] text-[#b0b8c4] hover:border-[#2c4470]"
                  }`}
                >
                  <p className="text-xs font-semibold text-[#f3f5f7]">{fmt.id}</p>
                  <p className="text-xs text-[#7d8796] mt-1 leading-snug">{fmt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Intuitive Learning Style & Media Mix */}
        <div className="bg-[#21262d] border border-[#2c4470] rounded-lg p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#282e37] pb-4">
            <div>
              <span className="text-xs font-mono-tabular text-[#84ab35]">
                02 · LEARNING STYLE & MEDIA MIX (TOTAL 100%)
              </span>
              <h2 className="text-lg font-semibold text-[#f3f5f7] mt-0.5">
                Choose your balance of Reading, Visuals, Audio, and Videos
              </h2>
              <p className="text-xs text-[#b0b8c4] mt-0.5">
                Pick a 1-click learning style preset below, or fine-tune any format (lock any format to keep its exact percentage fixed).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => applyLearningStylePreset("balanced")}
                className="px-3 py-1.5 text-xs font-medium bg-[#181b20] hover:bg-[#16243e] text-[#b0b8c4] hover:text-[#f3f5f7] border border-[#2c4470]/70 rounded cursor-pointer"
              >
                Even Split (25% each)
              </button>
              <button
                type="button"
                onClick={() => applyLearningStylePreset("visual")}
                className="px-3 py-1.5 text-xs font-medium bg-[#181b20] hover:bg-[#16243e] text-[#b0b8c4] hover:text-[#f3f5f7] border border-[#2c4470]/70 rounded cursor-pointer"
              >
                Visual Learner
              </button>
              <button
                type="button"
                onClick={() => applyLearningStylePreset("auditory")}
                className="px-3 py-1.5 text-xs font-medium bg-[#181b20] hover:bg-[#16243e] text-[#b0b8c4] hover:text-[#f3f5f7] border border-[#2c4470]/70 rounded cursor-pointer"
              >
                Auditory Learner
              </button>
              <button
                type="button"
                onClick={() => applyLearningStylePreset("text")}
                className="px-3 py-1.5 text-xs font-medium bg-[#181b20] hover:bg-[#16243e] text-[#b0b8c4] hover:text-[#f3f5f7] border border-[#2c4470]/70 rounded cursor-pointer"
              >
                Reading-Focused
              </button>
            </div>
          </div>

          {/* Live Stacked Distribution Bar */}
          <div className="bg-[#181b20] border border-[#282e37] rounded-lg p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono-tabular">
              <span className="text-[#b0b8c4]">OVERALL COURSE BREAKDOWN</span>
              <span className="text-[#84ab35] font-semibold">
                Reading {mix.reading}% · Visuals {mix.visual}% · Audio {mix.audio}% · Videos {mix.video}%
              </span>
            </div>
            <div className="w-full h-3.5 bg-[#21262d] rounded-full overflow-hidden flex border border-[#2c4470]/60">
              <div
                style={{ width: `${mix.reading}%` }}
                className="bg-[#6b8e23] h-full transition-all duration-200"
                title={`Reading: ${mix.reading}%`}
              />
              <div
                style={{ width: `${mix.visual}%` }}
                className="bg-[#84ab35] h-full transition-all duration-200"
                title={`Visuals: ${mix.visual}%`}
              />
              <div
                style={{ width: `${mix.audio}%` }}
                className="bg-[#3b66a8] h-full transition-all duration-200"
                title={`Audio: ${mix.audio}%`}
              />
              <div
                style={{ width: `${mix.video}%` }}
                className="bg-[#2c4470] h-full transition-all duration-200"
                title={`Videos: ${mix.video}%`}
              />
            </div>
          </div>

          {/* 4 Intuitive Modality Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {modalityCards.map((card) => {
              const val = mix[card.key];
              const isLocked = lockedKeys[card.key];
              return (
                <div
                  key={card.key}
                  className={`p-4 rounded-lg border transition-colors ${
                    isLocked
                      ? "bg-[#16243e]/50 border-[#84ab35]"
                      : "bg-[#181b20] border-[#282e37]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#f3f5f7]">
                        {card.icon}
                        <span>{card.title}</span>
                      </div>
                      <p className="text-[11px] text-[#7d8796] mt-0.5">{card.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleLock(card.key)}
                        className={`px-2 py-1 rounded text-[11px] font-mono-tabular flex items-center gap-1 border cursor-pointer ${
                          isLocked
                            ? "bg-[#6b8e23] border-[#84ab35] text-[#f3f5f7]"
                            : "bg-[#21262d] border-[#2c4470]/60 text-[#b0b8c4] hover:text-[#f3f5f7]"
                        }`}
                        title={
                          isLocked
                            ? "Unlock this percentage"
                            : "Lock this percentage so adjusting other sliders won't change it"
                        }
                      >
                        {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        <span>{isLocked ? "Locked" : "Lock"}</span>
                      </button>
                      <span className="font-mono-tabular text-base font-bold text-[#84ab35] w-12 text-right">
                        {val}%
                      </span>
                    </div>
                  </div>

                  {/* Slider + -5% / +5% Stepper Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isLocked || val <= 0}
                      onClick={() => updateModalityPercentage(card.key, val - 5)}
                      className="p-1.5 rounded bg-[#21262d] hover:bg-[#1e3154] disabled:opacity-40 border border-[#2c4470]/60 text-[#f3f5f7] cursor-pointer"
                      title="Decrease by 5%"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      disabled={isLocked}
                      value={val}
                      onChange={(e) => updateModalityPercentage(card.key, Number(e.target.value))}
                      className="flex-1 accent-[#6b8e23] cursor-pointer disabled:opacity-50"
                    />

                    <button
                      type="button"
                      disabled={isLocked || val >= 100}
                      onClick={() => updateModalityPercentage(card.key, val + 5)}
                      className="p-1.5 rounded bg-[#21262d] hover:bg-[#1e3154] disabled:opacity-40 border border-[#2c4470]/60 text-[#f3f5f7] cursor-pointer"
                      title="Increase by 5%"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick Share Buttons */}
                  <div className="flex items-center justify-between gap-1.5 mt-3 pt-2.5 border-t border-[#282e37]">
                    <span className="text-[11px] text-[#7d8796]">Quick set:</span>
                    <div className="flex items-center gap-1">
                      {[
                        { label: "Low (10%)", pct: 10 },
                        { label: "Med (25%)", pct: 25 },
                        { label: "High (40%)", pct: 40 },
                        { label: "Max (60%)", pct: 60 },
                      ].map((preset) => (
                        <button
                          key={preset.pct}
                          type="button"
                          disabled={isLocked}
                          onClick={() => updateModalityPercentage(card.key, preset.pct)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono-tabular transition-colors cursor-pointer disabled:opacity-40 ${
                            val === preset.pct
                              ? "bg-[#6b8e23] text-[#f3f5f7]"
                              : "bg-[#21262d] text-[#b0b8c4] hover:text-[#f3f5f7]"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Tone, Pace, Length, History, Experience & Assignments */}
        <div className="bg-[#21262d] border border-[#2c4470] rounded-lg p-6 space-y-6">
          <div className="border-b border-[#282e37] pb-4">
            <span className="text-xs font-mono-tabular text-[#84ab35]">03 · COURSE PARAMETERS & ASSIGNMENTS</span>
            <h2 className="text-lg font-semibold text-[#f3f5f7] mt-0.5">
              Calibrate History Depth, Tone, Pace, Length, and Practice Assignments
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Prior Experience */}
            <div>
              <label className="block text-xs font-medium text-[#b0b8c4] mb-1.5">
                Your Previous Experience on This Topic
              </label>
              <select
                value={priorExperience}
                onChange={(e) => setPriorExperience(e.target.value as CourseConfig["priorExperience"])}
                className="w-full px-3.5 py-2.5 bg-[#181b20] border border-[#2c4470] rounded text-sm text-[#f3f5f7] focus:outline-none focus:border-[#84ab35]"
              >
                <option value="Complete Beginner">Complete Beginner</option>
                <option value="Some Familiarity">Some Familiarity</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            {/* History & Background Depth */}
            <div>
              <label className="block text-xs font-medium text-[#b0b8c4] mb-1.5">
                How Much History & Background Material?
              </label>
              <select
                value={historyDepth}
                onChange={(e) => setHistoryDepth(e.target.value as CourseConfig["historyDepth"])}
                className="w-full px-3.5 py-2.5 bg-[#181b20] border border-[#2c4470] rounded text-sm text-[#f3f5f7] focus:outline-none focus:border-[#84ab35]"
              >
                <option value="Minimal">Minimal — Jump straight to practical skills</option>
                <option value="Balanced">Balanced — Helpful origin and context</option>
                <option value="Deep Historical">Deep Historical — Thorough background & evolution</option>
              </select>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-xs font-medium text-[#b0b8c4] mb-1.5">Course Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as CourseConfig["tone"])}
                className="w-full px-3.5 py-2.5 bg-[#181b20] border border-[#2c4470] rounded text-sm text-[#f3f5f7] focus:outline-none focus:border-[#84ab35]"
              >
                <option value="Conversational & Warm">Conversational & Warm</option>
                <option value="Direct & Technical">Direct & Technical</option>
                <option value="Academic & Rigorous">Academic & Rigorous</option>
                <option value="Hands-on Coach">Hands-on Coach</option>
              </select>
            </div>

            {/* Pace */}
            <div>
              <label className="block text-xs font-medium text-[#b0b8c4] mb-1.5">Course Pace</label>
              <select
                value={pace}
                onChange={(e) => setPace(e.target.value as CourseConfig["pace"])}
                className="w-full px-3.5 py-2.5 bg-[#181b20] border border-[#2c4470] rounded text-sm text-[#f3f5f7] focus:outline-none focus:border-[#84ab35]"
              >
                <option value="Slow & Steady">Slow & Steady</option>
                <option value="Moderate">Moderate</option>
                <option value="Fast-Track">Fast-Track</option>
              </select>
            </div>

            {/* Length */}
            <div>
              <label className="block text-xs font-medium text-[#b0b8c4] mb-1.5">Course Length</label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value as CourseConfig["length"])}
                className="w-full px-3.5 py-2.5 bg-[#181b20] border border-[#2c4470] rounded text-sm text-[#f3f5f7] focus:outline-none focus:border-[#84ab35]"
              >
                <option value="Crash Course">Crash Course (2 Core Modules)</option>
                <option value="Standard Multi-Module">Standard Multi-Module (3 Modules)</option>
                <option value="Comprehensive">Comprehensive Deep-Dive (4 Modules)</option>
              </select>
            </div>

            {/* Clear Assignment Frequency & Initial Difficulty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#b0b8c4] mb-1.5">
                  Assignments per Lesson
                </label>
                <select
                  value={assignmentAmount}
                  onChange={(e) => setAssignmentAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#181b20] border border-[#2c4470] rounded text-sm text-[#f3f5f7] focus:outline-none focus:border-[#84ab35]"
                >
                  <option value="1 per lesson (Light practice)">1 per lesson (Light)</option>
                  <option value="2 per lesson (Balanced practice)">2 per lesson (Balanced)</option>
                  <option value="3+ per lesson (Intensive practice)">3+ per lesson (Intensive)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#b0b8c4] mb-1.5">Initial Difficulty</label>
                <select
                  value={assignmentDifficulty}
                  onChange={(e) =>
                    setAssignmentDifficulty(e.target.value as CourseConfig["assignmentDifficulty"])
                  }
                  className="w-full px-3 py-2.5 bg-[#181b20] border border-[#2c4470] rounded text-sm text-[#f3f5f7] focus:outline-none focus:border-[#84ab35]"
                >
                  <option value="Relaxing">Relaxing</option>
                  <option value="Standard">Standard</option>
                  <option value="Challenging">Challenging</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Source Strategy */}
        <div className="bg-[#21262d] border border-[#2c4470] rounded-lg p-6 space-y-5">
          <div className="border-b border-[#282e37] pb-4">
            <span className="text-xs font-mono-tabular text-[#84ab35]">04 · SOURCE MATERIALS</span>
            <h2 className="text-lg font-semibold text-[#f3f5f7] mt-0.5">
              How should Billy gather materials for your course?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                {
                  id: "ai",
                  title: "Have Billy Decide",
                  desc: "Billy researches documentation, sites, and materials for you.",
                },
                {
                  id: "sources",
                  title: "Base on My Specific Sources",
                  desc: "Build the course strictly around the sources or notes I paste below.",
                },
                {
                  id: "both",
                  title: "Both (Sources + Billy's Research)",
                  desc: "Combine my provided sources with Billy's broader documentation research.",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSourceMode(opt.id)}
                className={`p-4 rounded-md border text-left transition-colors cursor-pointer ${
                  sourceMode === opt.id
                    ? "bg-[#1e3154] border-[#84ab35] text-[#f3f5f7]"
                    : "bg-[#181b20] border-[#282e37] text-[#b0b8c4] hover:border-[#2c4470]"
                }`}
              >
                <p className="text-xs font-semibold text-[#f3f5f7]">{opt.title}</p>
                <p className="text-xs text-[#7d8796] mt-1 leading-snug">{opt.desc}</p>
              </button>
            ))}
          </div>

          {(sourceMode === "sources" || sourceMode === "both") && (
            <div>
              <label className="block text-xs font-medium text-[#b0b8c4] mb-2">
                Paste Your Sources, Documentation URLs, Syllabus Notes, or Job Description
              </label>
              <textarea
                rows={4}
                value={customSources}
                onChange={(e) => setCustomSources(e.target.value)}
                placeholder="Paste URLs, article excerpts, documentation snippets, or a target job description here..."
                className="w-full px-4 py-3 bg-[#181b20] border border-[#2c4470] rounded-md text-sm text-[#f3f5f7] focus:outline-none focus:border-[#84ab35]"
              />
            </div>
          )}
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-xs font-medium text-[#b0b8c4] hover:text-[#f3f5f7] bg-[#21262d] border border-[#2c4470] rounded-md cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-3 text-sm font-semibold text-[#f3f5f7] bg-[#6b8e23] hover:bg-[#84ab35] rounded-md transition-colors cursor-pointer"
          >
            Create Course Preview
          </button>
        </div>
      </form>
    </div>
  );
};
