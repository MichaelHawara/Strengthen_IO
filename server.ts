import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse, Type } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

/**
 * Resilient multi-model helper that prefers low-contention models ('gemini-3.1-flash-lite')
 * and automatically retries/falls back across ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash']
 * if a model experiences high demand (503 / 429 / overloaded).
 */
const TEXT_MODEL_CANDIDATES = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash",
];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateContentWithFallback(
  params: Omit<GenerateContentParameters, "model"> & { preferredModel?: string }
): Promise<GenerateContentResponse> {
  const { preferredModel, ...rest } = params;
  const modelsToTry = preferredModel
    ? [preferredModel, ...TEXT_MODEL_CANDIDATES.filter((m) => m !== preferredModel)]
    : TEXT_MODEL_CANDIDATES;

  let lastError: unknown = null;

  for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
    const modelName = modelsToTry[attempt];
    try {
      const response = await ai.models.generateContent({
        ...rest,
        model: modelName,
      });
      return response;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Model ${modelName} failed (attempt ${attempt + 1}/${modelsToTry.length}): ${msg}`);
      // Brief pause before trying the next fallback model
      await sleep(500 * (attempt + 1));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All available Gemini models are currently busy. Please try again in a moment.");
}

const COURSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Compelling title for the course." },
    subtitle: { type: Type.STRING, description: "Clear 1-2 sentence overview of what the learner will achieve." },
    category: {
      type: Type.STRING,
      description: "Visual theme category: 'tech', 'finance', 'ai', 'design', 'history', or 'career'.",
    },
    billyWelcome: {
      type: Type.STRING,
      description: "Warm, encouraging welcome message from Billy introducing the course preview.",
    },
    modules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          objective: { type: Type.STRING },
          lessons: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                estimatedMinutes: { type: Type.NUMBER },
                summary: { type: Type.STRING },
                historicalContext: {
                  type: Type.STRING,
                  description: "Background and historical evolution of this concept tailored to requested history depth.",
                },
                readingSections: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      heading: { type: Type.STRING },
                      content: { type: Type.STRING },
                      keyTakeaway: { type: Type.STRING },
                    },
                    required: ["heading", "content", "keyTakeaway"],
                  },
                },
                audioScript: {
                  type: Type.STRING,
                  description: "Spoken walkthrough script by Billy (90-140 words) explaining the core intuition of this lesson.",
                },
                visualDiagram: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    diagramType: {
                      type: Type.STRING,
                      description: "One of: 'flow', 'layers', 'comparison', 'cycle'",
                    },
                    interactivePrompt: {
                      type: Type.STRING,
                      description: "Instruction inviting the learner to click nodes and inspect relationships.",
                    },
                    nodes: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          label: { type: Type.STRING },
                          detail: { type: Type.STRING },
                          metricOrRule: { type: Type.STRING },
                        },
                        required: ["id", "label", "detail", "metricOrRule"],
                      },
                    },
                  },
                  required: ["title", "diagramType", "interactivePrompt", "nodes"],
                },
                videoAndSources: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      format: { type: Type.STRING, description: "Video Walkthrough, Primary Source, or Documentation" },
                      durationOrLength: { type: Type.STRING },
                      keyFocus: { type: Type.STRING },
                      searchQueryOrUrl: { type: Type.STRING },
                    },
                    required: ["title", "format", "durationOrLength", "keyFocus", "searchQueryOrUrl"],
                  },
                },
                assignments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      difficulty: {
                        type: Type.STRING,
                        description: "One of: 'Relaxing', 'Standard', 'Challenging'",
                      },
                      scenarioPrompt: { type: Type.STRING },
                      questions: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.STRING },
                            question: { type: Type.STRING },
                            hint: { type: Type.STRING },
                            sampleSolution: { type: Type.STRING },
                          },
                          required: ["id", "question", "hint", "sampleSolution"],
                        },
                      },
                    },
                    required: ["id", "title", "difficulty", "scenarioPrompt", "questions"],
                  },
                },
              },
              required: [
                "id",
                "title",
                "estimatedMinutes",
                "summary",
                "historicalContext",
                "readingSections",
                "audioScript",
                "visualDiagram",
                "videoAndSources",
                "assignments",
              ],
            },
          },
        },
        required: ["id", "title", "objective", "lessons"],
      },
    },
  },
  required: ["title", "subtitle", "category", "billyWelcome", "modules"],
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  /**
   * Endpoint 1: Streamed Course Generation Pipeline
   * Emits NDJSON progress events at:
   * - 1/3 (33%) when Orchestrator sends information to the Researcher
   * - 2/3 (67%) when Judge approves the research
   * - 3/3 (100%) when Builder finishes and Orchestrator returns the completed course
   */
  app.post("/api/billy/generate-course", async (req, res) => {
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (eventObj: Record<string, unknown>) => {
      res.write(JSON.stringify(eventObj) + "\n");
    };

    try {
      const { prompt, courseFormat, config, learnerProfile } = req.body;

      // STAGE 1 (1/3 = 33%): Orchestrator sends user options & prompt to Researcher
      sendEvent({
        type: "progress",
        progress: 33,
        step: 1,
        totalSteps: 3,
      });

      const runResearcher = async (judgeCritique?: string) => {
        const researcherPrompt = `You are the Researcher Agent in the Strengthen IO course architecture system.
Learner Goal / Topic Prompt: "${prompt}"
Course Structure Style: "${courseFormat}"
Learner Prior Experience: "${config.priorExperience}"
Learner Type: "${learnerProfile?.learnerType || "Adaptive"}"
Career Goal: "${learnerProfile?.careerGoal || "General mastery"}"
Requested History & Background Depth: "${config.historyDepth}"
Source Mode: "${config.sourceMode}"
User-Provided Sources / Notes: "${config.customSources || "None provided"}"
${judgeCritique ? `\nIMPORTANT CRITIQUE FROM JUDGE TO RESOLVE:\n${judgeCritique}` : ""}

Compile a concise, high-signal research dossier to build this course:
1. Core domain concepts, step-by-step progression, and practical project/scenario milestones.
2. Historical context and background proportional to "${config.historyDepth}".
3. Real-world documentation topics, visual mental models, and hands-on assignment scenarios matching "${config.assignmentDifficulty}" difficulty.`;

        const researchResp = await generateContentWithFallback({
          contents: researcherPrompt,
        });
        return researchResp.text || "";
      };

      let researchDossier = await runResearcher();

      // 2. JUDGE AGENT reviews Researcher's output
      const judgeResp = await generateContentWithFallback({
        contents: `You are the Judge Agent. Review this research dossier against the user's course prompt and learning specifications.
User Prompt: "${prompt}"
Course Format: "${courseFormat}"
Tone: "${config.tone}", Pace: "${config.pace}", Length: "${config.length}"
Prior Experience: "${config.priorExperience}"
History Depth: "${config.historyDepth}"
Modality Split: Reading ${config.readingPct}%, Visuals ${config.visualPct}%, Audio ${config.audioPct}%, Video ${config.videoPct}%
Assignment Settings: Amount=${config.assignmentAmount}, Difficulty=${config.assignmentDifficulty}

Research Dossier:
${researchDossier}

Evaluate whether the research matches the prompt and is adequate to construct a high-caliber course.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              approved: { type: Type.BOOLEAN },
              critiqueForResearcher: { type: Type.STRING },
              builderDirectives: { type: Type.STRING },
            },
            required: ["approved", "critiqueForResearcher", "builderDirectives"],
          },
        },
      });

      let builderDirectives = "Ensure clear progressive structure, rich visual diagrams, and practical assignments.";
      try {
        const judgeResult = JSON.parse(judgeResp.text || "{}");
        builderDirectives = judgeResult.builderDirectives || builderDirectives;
        if (!judgeResult.approved && judgeResult.critiqueForResearcher) {
          researchDossier = await runResearcher(judgeResult.critiqueForResearcher);
        }
      } catch {
        // Proceed if Judge JSON parsing fails
      }

      // STAGE 2 (2/3 = 67%): Judge approves and Orchestrator sends information to Builder
      sendEvent({
        type: "progress",
        progress: 67,
        step: 2,
        totalSteps: 3,
      });

      const moduleCountHint =
        config.length === "Crash Course"
          ? "2 modules with 2 lessons each"
          : config.length === "Comprehensive"
          ? "4 modules with 2 lessons each"
          : "3 modules with 2 lessons each";

      const assignmentCountHint =
        String(config.assignmentAmount).includes("1") || String(config.assignmentAmount).includes("Light")
          ? "1 assignment per lesson"
          : String(config.assignmentAmount).includes("3") || String(config.assignmentAmount).includes("Intensive")
          ? "3 assignments per lesson"
          : "2 assignments per lesson";

      // 3. BUILDER AGENT constructs the course
      const builderResp = await generateContentWithFallback({
        contents: `You are the Builder Agent working under the Orchestrator. Turn the approved research dossier into a complete, interactive course authored in the persona of "Billy" (the learner's AI mentor).
IMPORTANT: Never mention Researcher, Judge, Builder, or Orchestrator in any user-facing text. The learner only interacts with Billy.

User Prompt: "${prompt}"
Course Structure Type: "${courseFormat}"
Target Scope: ${moduleCountHint}
Tone: ${config.tone} | Pace: ${config.pace} | Prior Experience: ${config.priorExperience}
History & Background Depth: ${config.historyDepth}
Modality Emphasis:
- Reading: ${config.readingPct}% (adjust depth and number of readingSections accordingly)
- Visuals: ${config.visualPct}% (create 4 interactive nodes per visualDiagram)
- Audio Recordings: ${config.audioPct}% (write an engaging spoken walkthrough script by Billy in audioScript)
- Videos & Sources: ${config.videoPct}% (provide curated video walkthrough topics & source materials)
Assignments: Include ${assignmentCountHint} at "${config.assignmentDifficulty}" default difficulty.

Judge Directives:
${builderDirectives}

Approved Research Dossier:
${researchDossier}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: COURSE_SCHEMA,
        },
      });

      const courseData = JSON.parse(builderResp.text || "{}");

      // STAGE 3 (3/3 = 100%): Builder finished, Orchestrator sends completed course
      sendEvent({
        type: "complete",
        progress: 100,
        step: 3,
        totalSteps: 3,
        course: courseData,
      });
      res.end();
    } catch (error) {
      console.error("Course generation error:", error);
      sendEvent({
        type: "error",
        error: error instanceof Error ? error.message : "Failed to generate course with Billy.",
      });
      res.end();
    }
  });

  // Endpoint 2: Tweak course during Preview with Billy
  app.post("/api/billy/tweak-course", async (req, res) => {
    try {
      const { currentCourse, userRequest, config } = req.body;
      const response = await generateContentWithFallback({
        contents: `You are Billy, the friendly AI course creator on Strengthen IO.
The learner is previewing their course before solidifying it and asked for the following tweak:
"${userRequest}"

Current Course JSON:
${JSON.stringify(currentCourse)}

Course Config:
${JSON.stringify(config)}

Apply the learner's requested modifications directly to the course structure and return both your conversational reply as Billy and the updated course object.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              billyReply: {
                type: Type.STRING,
                description: "Billy's friendly confirmation explaining what he tweaked in the course preview.",
              },
              updatedCourse: COURSE_SCHEMA,
            },
            required: ["billyReply", "updatedCourse"],
          },
        },
      });

      const data = JSON.parse(response.text || "{}");
      res.json(data);
    } catch (error) {
      console.error("Tweak course error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to tweak course.",
      });
    }
  });

  // Endpoint 3: Regenerate a specific lesson if the learner didn't understand it
  app.post("/api/billy/regenerate-lesson", async (req, res) => {
    try {
      const { courseTitle, moduleTitle, currentLesson, learnerFeedback, config } = req.body;
      const response = await generateContentWithFallback({
        contents: `You are Billy, the learner's AI mentor on Strengthen IO.
The learner did not fully understand the lesson "${currentLesson.title}" in module "${moduleTitle}" of the course "${courseTitle}".
Learner's note / confusion point: "${learnerFeedback || "Please explain this topic more clearly with fresh analogies and step-by-step examples."}"
Tone: ${config?.tone || "Supportive and clear"} | Experience level: ${config?.priorExperience || "Beginner"}

Regenerate this lesson with clearer mental models, concrete step-by-step examples, a refreshed interactive visual diagram, and a clear audio script by Billy.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              billyNote: {
                type: Type.STRING,
                description: "Short encouraging message from Billy explaining how he reshaped the lesson.",
              },
              lesson: COURSE_SCHEMA.properties.modules.items.properties.lessons.items,
            },
            required: ["billyNote", "lesson"],
          },
        },
      });

      const data = JSON.parse(response.text || "{}");
      res.json(data);
    } catch (error) {
      console.error("Regenerate lesson error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to regenerate lesson.",
      });
    }
  });

  // Endpoint 4: Assignment actions (change difficulty, create more assignments, or evaluate submission)
  app.post("/api/billy/assignment-action", async (req, res) => {
    try {
      const { action, courseTitle, lessonTitle, lessonSummary, assignment, targetDifficulty, userAnswers } = req.body;

      if (action === "evaluate") {
        const evalResp = await generateContentWithFallback({
          contents: `You are Billy, the AI mentor on Strengthen IO.
Review the learner's submitted answers for the assignment "${assignment.title}" (${assignment.difficulty} difficulty) in lesson "${lessonTitle}".

Assignment Questions & Answers:
${JSON.stringify(userAnswers)}

Provide encouraging, specific feedback for the learner, highlight what they got right, clarify any misconceptions, and give a mastery score from 0 to 100.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                overallFeedback: { type: Type.STRING },
                questionFeedback: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      questionId: { type: Type.STRING },
                      status: { type: Type.STRING, description: "'Mastered', 'Partial', or 'Needs Review'" },
                      comment: { type: Type.STRING },
                    },
                    required: ["questionId", "status", "comment"],
                  },
                },
              },
              required: ["score", "overallFeedback", "questionFeedback"],
            },
          },
        });
        res.json(JSON.parse(evalResp.text || "{}"));
        return;
      }

      const promptText =
        action === "change-difficulty"
          ? `Rewrite this assignment for lesson "${lessonTitle}" in course "${courseTitle}" to match a "${targetDifficulty}" difficulty level.
If "Relaxing": make questions approachable, confidence-building, and guided.
If "Standard": balanced practical application.
If "Challenging": deep scenario problem-solving and edge-case thinking.
Current Assignment: ${JSON.stringify(assignment)}`
          : `Create a brand-new hands-on assignment for lesson "${lessonTitle}" (${lessonSummary}) in course "${courseTitle}" at "${targetDifficulty || "Standard"}" difficulty.`;

      const assignResp = await generateContentWithFallback({
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              assignment:
                COURSE_SCHEMA.properties.modules.items.properties.lessons.items.properties.assignments.items,
            },
            required: ["assignment"],
          },
        },
      });

      res.json(JSON.parse(assignResp.text || "{}"));
    } catch (error) {
      console.error("Assignment action error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to update assignment.",
      });
    }
  });

  // Endpoint 5: Billy in-course clarification chat
  app.post("/api/billy/chat", async (req, res) => {
    try {
      const { courseTitle, activeModuleTitle, activeLesson, chatHistory, userMessage, notebook } = req.body;
      const historyText = (chatHistory || [])
        .slice(-8)
        .map((m: { role: string; text: string }) => `${m.role === "billy" ? "Billy" : "Learner"}: ${m.text}`)
        .join("\n");

      const response = await generateContentWithFallback({
        contents: `You are Billy, the built-in AI learning mentor inside Strengthen IO.
You are helping a learner inside the course "${courseTitle}".
Current Module: "${activeModuleTitle || "General"}"
Current Lesson: "${activeLesson?.title || "Overview"}"
Lesson Summary: "${activeLesson?.summary || ""}"
Learner's Course Notebook: "${notebook ? notebook.slice(0, 1000) : "Empty"}"

Recent Conversation:
${historyText}

Learner's Question: "${userMessage}"

Respond directly as Billy in a clear, helpful, encouraging tone. Use concrete examples and keep your answer focused and easy to read.`,
      });

      res.json({
        reply: response.text || "I'm here to help! Could you tell me a bit more about what part you'd like to explore?",
      });
    } catch (error) {
      console.error("Billy chat error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Billy encountered an error responding.",
      });
    }
  });

  // Endpoint 6: Real Gemini Text-to-Speech (TTS) for Billy's lesson audio walkthroughs
  app.post("/api/billy/tts", async (req, res) => {
    try {
      const { scriptText, tone } = req.body;
      if (!scriptText || typeof scriptText !== "string") {
        res.status(400).json({ error: "scriptText is required" });
        return;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-lite-tts",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: scriptText.slice(0, 1200),
                speechMetadata: {
                  style: `Warm, articulate learning mentor (${tone || "conversational"})`,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Puck" },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(500).json({ error: "No audio returned from Gemini TTS." });
        return;
      }

      res.json({
        audioBase64: base64Audio,
        mimeType: "audio/wav",
      });
    } catch (error) {
      console.error("Billy TTS error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to synthesize Billy audio.",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Strengthen IO server running on http://localhost:${PORT}`);
  });
}

startServer();
