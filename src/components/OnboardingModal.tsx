import React, { useState } from "react";
import { UserProfile } from "../types";
import { Check, ArrowRight, ArrowLeft, UserCheck } from "lucide-react";

interface OnboardingModalProps {
  uid: string;
  email: string;
  initialDisplayName: string;
  existingProfile: UserProfile | null;
  onComplete: (profile: Omit<UserProfile, "createdAt" | "updatedAt">) => Promise<void>;
  onCancel?: () => void;
}

const INTEREST_OPTIONS = [
  "Technology & Web Engineering",
  "Personal Finances & Taxes",
  "Artificial Intelligence & RAG",
  "History & Civilizations",
  "Career & Job Preparation",
  "Data Science & Analytics",
  "Product Design & Architecture",
  "Business Operations & Strategy",
];

const LEARNER_TYPES = [
  {
    id: "Fast-learner",
    title: "Fast-Learner",
    description: "Give me high-density concepts, rapid pacing, and direct practical challenges.",
  },
  {
    id: "Slow and steady",
    title: "Slow and Steady",
    description: "Break complex ideas into calm, step-by-step progressions with thorough examples.",
  },
  {
    id: "Project-first builder",
    title: "Project-First Builder",
    description: "I learn best by building a real project or walking through a concrete scenario.",
  },
  {
    id: "Visual & Conceptual",
    title: "Visual & Conceptual Explorer",
    description: "Connect every topic with visual diagrams, historical context, and intuition first.",
  },
];

const LEARNING_TOOLS = [
  "AI assistance (Billy)",
  "Note-taking (Built-in Notebook)",
  "Videos & Walkthroughs",
  "In-depth Reading",
  "Audio recordings (Spoken lessons)",
  "Interactive Visual Diagrams",
  "Adaptive Practice Assignments",
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  uid,
  email,
  initialDisplayName,
  existingProfile,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [displayName, setDisplayName] = useState(existingProfile?.displayName || initialDisplayName || "");
  const [phoneNumber, setPhoneNumber] = useState(existingProfile?.phoneNumber || "");
  const [careerGoal, setCareerGoal] = useState(existingProfile?.careerGoal || "");
  const [topicsOfInterest, setTopicsOfInterest] = useState<string[]>(
    existingProfile?.topicsOfInterest?.length
      ? existingProfile.topicsOfInterest
      : ["Technology & Web Engineering", "Personal Finances & Taxes"]
  );
  const [learnerType, setLearnerType] = useState<string>(
    existingProfile?.learnerType || "Project-first builder"
  );
  const [preferredTools, setPreferredTools] = useState<string[]>(
    existingProfile?.preferredTools?.length
      ? existingProfile.preferredTools
      : ["AI assistance (Billy)", "Note-taking (Built-in Notebook)", "Interactive Visual Diagrams"]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (list.includes(item)) {
      if (list.length > 1) {
        setList(list.filter((i) => i !== item));
      }
    } else {
      setList([...list, item]);
    }
  };

  const handleSaveProfile = async () => {
    if (step !== 3 || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onComplete({
        uid,
        email,
        displayName: displayName.trim() || "Learner",
        phoneNumber: phoneNumber.trim(),
        careerGoal: careerGoal.trim() || "Build practical skills across new fields",
        topicsOfInterest,
        learnerType,
        preferredTools,
        onboardingCompleted: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save learner profile.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#181b20]/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#21262d] border border-[#2c4470] rounded-lg overflow-hidden my-8">
        {/* Header Bar */}
        <div className="bg-[#16243e] px-6 py-5 border-b border-[#2c4470] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#84ab35]">
              <span>LEARNER PROFILE SETUP</span>
              <span>·</span>
              <span>STEP 0{step} OF 03</span>
            </div>
            <h2 className="text-xl font-bold text-[#f3f5f7] mt-1">
              {existingProfile?.onboardingCompleted
                ? "Update Your Learning Preferences"
                : "Welcome to Strengthen IO"}
            </h2>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-[#b0b8c4] hover:text-[#f3f5f7] px-3 py-1.5 rounded border border-[#2c4470] cursor-pointer"
            >
              Close
            </button>
          )}
        </div>

        {/* Interactive Step Tabs */}
        <div className="grid grid-cols-3 bg-[#181b20] border-b border-[#282e37] text-xs font-medium">
          {[
            { num: 1 as const, label: "1. Interests & Info" },
            { num: 2 as const, label: "2. Learner Style" },
            { num: 3 as const, label: "3. Learning Tools" },
          ].map((tab) => (
            <button
              key={tab.num}
              type="button"
              onClick={() => setStep(tab.num)}
              className={`py-3 px-4 text-center border-b-2 transition-colors cursor-pointer ${
                step === tab.num
                  ? "border-[#84ab35] text-[#f3f5f7] bg-[#1e3154]/40 font-semibold"
                  : "border-transparent text-[#7d8796] hover:text-[#b0b8c4]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-700/70 rounded text-xs text-red-200">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <p className="text-sm text-[#b0b8c4]">
                Billy tailors every course around your background and goals. Let's start with your general information and topics that interest you most.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#b0b8c4] mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full px-3.5 py-2.5 bg-[#181b20] border border-[#2c4470] rounded text-sm text-[#f3f5f7] focus:outline-none focus:border-[#84ab35]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#b0b8c4] mb-1.5">
                    Phone Number <span className="text-[#7d8796]">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="(555) 234-5678"
                    className="w-full px-3.5 py-2.5 bg-[#181b20] border border-[#2c4470] rounded text-sm text-[#f3f5f7] focus:outline-none focus:border-[#84ab35]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#b0b8c4] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3.5 py-2 bg-[#181b20]/60 border border-[#282e37] rounded text-sm text-[#7d8796] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#b0b8c4] mb-1.5">
                  Primary Career or Skill Objective
                </label>
                <input
                  type="text"
                  value={careerGoal}
                  onChange={(e) => setCareerGoal(e.target.value)}
                  placeholder="e.g., Full-stack web development, filing independent taxes, or AI engineering"
                  className="w-full px-3.5 py-2.5 bg-[#181b20] border border-[#2c4470] rounded text-sm text-[#f3f5f7] focus:outline-none focus:border-[#84ab35]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#f3f5f7] mb-2">
                  What topics interest you the most?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {INTEREST_OPTIONS.map((topic) => {
                    const selected = topicsOfInterest.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleItem(topicsOfInterest, setTopicsOfInterest, topic)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded border text-left text-xs font-medium transition-colors cursor-pointer ${
                          selected
                            ? "bg-[#1e3154] border-[#84ab35] text-[#f3f5f7]"
                            : "bg-[#181b20] border-[#282e37] text-[#b0b8c4] hover:border-[#2c4470]"
                        }`}
                      >
                        <span className="truncate">{topic}</span>
                        {selected && <Check className="w-3.5 h-3.5 text-[#84ab35] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-[#f3f5f7]">What kind of a learner are you?</h3>
                <p className="text-xs text-[#b0b8c4] mt-1">
                  This sets Billy's default pacing and explanation structure across your courses.
                </p>
              </div>

              <div className="space-y-3">
                {LEARNER_TYPES.map((lt) => {
                  const selected = learnerType === lt.id;
                  return (
                    <button
                      key={lt.id}
                      type="button"
                      onClick={() => setLearnerType(lt.id)}
                      className={`w-full text-left p-4 rounded-lg border transition-colors cursor-pointer ${
                        selected
                          ? "bg-[#1e3154] border-[#84ab35]"
                          : "bg-[#181b20] border-[#282e37] hover:border-[#2c4470]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#f3f5f7]">{lt.title}</span>
                        {selected && <Check className="w-4 h-4 text-[#84ab35]" />}
                      </div>
                      <p className="text-xs text-[#b0b8c4] mt-1">{lt.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-[#f3f5f7]">What tools help you learn best?</h3>
                <p className="text-xs text-[#b0b8c4] mt-1">
                  Select all the tools and modalities you want Billy to prioritize when constructing your courses, then click Save below.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LEARNING_TOOLS.map((tool) => {
                  const selected = preferredTools.includes(tool);
                  return (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => toggleItem(preferredTools, setPreferredTools, tool)}
                      className={`flex items-center justify-between p-3.5 rounded-lg border text-left text-xs font-medium transition-colors cursor-pointer ${
                        selected
                          ? "bg-[#1e3154] border-[#84ab35] text-[#f3f5f7]"
                          : "bg-[#181b20] border-[#282e37] text-[#b0b8c4] hover:border-[#2c4470]"
                      }`}
                    >
                      <span>{tool}</span>
                      {selected && <Check className="w-4 h-4 text-[#84ab35] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Navigation — distinct buttons with type="button" to prevent accidental auto-submit */}
          <div className="pt-4 border-t border-[#282e37] flex items-center justify-between">
            {step > 1 ? (
              <button
                key="prev-step-btn"
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="px-4 py-2 text-xs font-medium text-[#b0b8c4] hover:text-[#f3f5f7] bg-[#181b20] border border-[#2c4470] rounded flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                key={`next-step-btn-${step}`}
                type="button"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                className="px-5 py-2.5 text-xs font-semibold text-[#f3f5f7] bg-[#6b8e23] hover:bg-[#84ab35] rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                key="save-profile-final-btn"
                type="button"
                disabled={saving}
                onClick={handleSaveProfile}
                className="px-5 py-2.5 text-xs font-semibold text-[#f3f5f7] bg-[#6b8e23] hover:bg-[#84ab35] disabled:opacity-50 rounded flex items-center gap-2 transition-colors cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>
                  {saving
                    ? "Saving Preferences..."
                    : existingProfile?.onboardingCompleted
                    ? "Save Preferences"
                    : "Complete Profile & Enter Dashboard"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
