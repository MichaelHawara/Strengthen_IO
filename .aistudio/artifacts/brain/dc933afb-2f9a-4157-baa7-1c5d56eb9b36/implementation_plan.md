# Strengthen IO — Personalized AI Skill & Course Platform

Strengthen IO is a minimalist, picture-driven web application where learners partner with **Billy**, an AI learning mentor, to build custom, multi-modal courses across any skill, project, or career path—backed by a hidden multi-agent Gemini pipeline, real text-to-speech audio lessons, interactive visual diagrams, adaptive assignments, and Firebase cloud persistence.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and product choices incorporate your requirements from the A3 Project specification and your Phase 1 answers:

- **Confirmed Decision 1 — Cloud Persistence & Authentication**: User accounts, onboarding learner profiles, generated courses, lesson progress, course notebooks, and Billy's per-course chat history will be persisted in **Firebase Authentication** and **Cloud Firestore**.
- **Confirmed Decision 2 — Unified "Billy" Persona (Hidden Multi-Agent Pipeline)**: The 4-agent system (**Orchestrator**, **Researcher**, **Judge**, and **Builder**) runs strictly behind the scenes on the backend server. Users only ever interact with **Billy**, and during course creation the screen displays minimalist shuffling conversational status phrases (e.g., *"Give me a minute..."*, *"Adding some touch-ups..."*) without exposing internal agent mechanics.
- **Confirmed Decision 3 — Real Gemini TTS Audio & Rich Visual Diagrams**: Lessons dynamically honor the user's modality percentages with real server-side **Gemini Text-to-Speech (`gemini-3.8-flash-lite-tts`)** audio recordings, interactive visual concept diagrams, structured readings, and curated video/reference resources.

---

### 1. Overview & Core Concept

- **What It Does**: Strengthen IO transforms any learning goal—such as *"I want to learn how to create a website"*, *"Teach me to do my own taxes"*, *"Walk me through building a project for RAG"*, or a target job description—into a tailored, interactive course structured into modules, multi-modal lessons, and adaptive assignments.
- **Target Audience / Persona**: Self-directed learners, career switchers, and builders who want courses adapted to their exact background experience, preferred pace, tone, source materials, and sensory learning style (visual, auditory, reading, or project-based).
- **Key Value**: Unlike static online courses, Strengthen IO lets learners preview and tweak the syllabus with Billy before solidifying it, regenerate any lesson they didn't fully grasp, adjust assignment difficulty on the fly (from relaxing to challenging), listen to generated audio walkthroughs, and take persistent notes alongside Billy's contextual chat assistant.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Minimalist Picture-Driven Landing Page**:
   - Features high-resolution editorial photography showcasing hands-on skill building (web engineering, financial planning, AI systems architecture) with clean typography and zero emoji clutter.
   - Top bar features the **Strengthen IO** wordmark on the left, clean navigation links in the center, and the **Log In / Create Account** action in the top-right corner.
2. **Account Creation & Learner Onboarding Questionnaire**:
   - After signing in with Firebase Auth, first-time users complete a guided onboarding profile capturing:
     - **General Info**: Name, phone number (optional), and primary career or learning goal.
     - **Topics of Interest**: Tech & Engineering, Personal Finance & Taxes, History & Humanities, Data & AI, Design, Business, etc.
     - **Learner Type**: Fast-learner, Slow and steady, Project-first builder, Conceptual deep-diver.
     - **Preferred Learning Tools**: AI assistance (Billy), Note-taking, Video walkthroughs, In-depth reading, Audio recordings, Interactive visuals.
3. **Learner Dashboard**:
   - Displays **Current Courses** (with progress bars and quick-resume actions), **Completed Courses**, learner profile preferences, and a primary **Create a New Course** button.
4. **Course Creation Studio ("Configure Your Course with Billy")**:
   - **Course Prompt & Mode**: Standard topic, hands-on project/fictitious scenario walkthrough, or specific career/job description skill builder.
   - **Modality Breakdown Sliders (Totaling 100%)**: Percentage of **Videos**, **Reading**, **Audio Recordings**, and **Visuals**.
   - **Course Depth & Style Controls**:
     - **Historical / Background Context**: Minimal, Balanced, or Deep historical background.
     - **Tone, Pace & Length**: Tone (Conversational, Academic, Coaching, Direct), Pace (Relaxed, Moderate, Intensive), and Length (Crash Course, Standard Multi-Module, Comprehensive).
     - **Assignments**: Amount (*A little*, *A bit*, *A lot*) and Initial Difficulty (*Relaxing*, *Balanced*, *Challenging*).
     - **Prior Experience**: Complete Beginner, Some Familiarity, Intermediate, Advanced.
     - **Source Strategy**: *Base strictly on my provided sources* (custom URLs/notes), *Let Billy decide how to teach me*, or *Both (combine my sources with Billy's research)*.
5. **Billy's Course Generation Screen**:
   - Displays a calm, minimalist visual focal anchor while shuffling natural phrases from Billy (*"Give me a minute..."*, *"Adding some touch-ups..."*, *"Tailoring exercises to your pace..."*, *"Organizing your modules..."*) while the backend executes the Researcher $\to$ Judge $\to$ Builder $\to$ Orchestrator workflow.
6. **Interactive Course Preview & Tweak Studio**:
   - Before solidifying the course, users can click through the generated **Modules** and **Lessons** to inspect how the content, visual diagrams, and assignments look.
   - **Billy Tweak Chat Panel**: Built right into the preview screen so the user can ask Billy for adjustments (e.g., *"Add a module on deployment"*, *"Make the tone more casual"*, *"Include more practical tax examples"*) and watch the preview update live before clicking **Solidify & Start Course**.
7. **Active Course Workspace**:
   - **Two-Zone Sandbox & Learning Layout**:
     - **Left / Main Learning Stage (65%)**: Displays the active Lesson with its configured mix of Reading, Interactive Visual Diagrams (architecture flows, step-by-step interactive SVG models), Real Gemini TTS Audio Player (voiced by Billy), Curated Video/Source Cards, and **Adaptive Assignments**.
     - **Lesson Understanding & Assignment Controls**:
       - *"Didn't fully understand this lesson?"* $\to$ **Regenerate Lesson** (rewrites with fresh analogies/clearer steps) or **Create More Assignments**.
       - **Assignment Difficulty Switcher**: Modify any assignment's difficulty between **Relaxing**, **Standard**, and **Challenging** with interactive grading and feedback from Billy.
     - **Right Contextual Deck (35%)**: Toggleable between **Ask Billy (Saved Course Chat)** for instant clarification and the **Built-in Course Notebook** (auto-saved to Firestore per course).

#### Visual Identity & Theme
- **Aesthetic Direction**: Minimalist, editorial, picture-based architectural clarity with zero emoji clutter and clean unboxed metadata (`Module 01 · 15 min · Project-Based`).
- **Color Palette & Mood (60-30-10 Discipline)**:
  - **60% Dominant Canvas**: Deep Charcoal Grey (`#1C1F24`) and Elevated Slate Charcoal (`#252A32`) for a focused, low-glare studio environment, paired with crisp off-white (`#F4F5F0`) reading surfaces where high contrast is needed.
  - **30% Structural Surfaces & Navigation**: Deep Navy Blue (`#1B2A4A` and `#243B67`) for primary structural headers, module sidebars, and interactive stage containers with subtle `1px solid` hairline borders (`rgba(255,255,255,0.08)`).
  - **10% Semantic Focal Accents**: Olive Green (`#6B8E23` / `#7A9A49`) for primary CTAs, active progress indicators, Billy's presence badge, and completed states.
- **Typography & Hierarchy**:
  - **Display / Headings**: `Plus Jakarta Sans` (SemiBold 600 / Bold 700, `text-wrap: balance`) for crisp architectural headings.
  - **Body Prose & Lesson Reading**: `DM Sans` (Regular 400 / Medium 500, 16px, `1.65` line-height, `68ch` measure) for effortless long-form reading.
  - **Metrics, Percentages & Code**: `JetBrains Mono` (`tabular-nums`) for modality percentage sliders, progress counters, and technical lessons.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Hidden Server-Side Multi-Agent Pipeline vs. Single-Prompt Generation**
  - *Chosen Approach*: Implement the 4 distinct agents (**Orchestrator**, **Researcher** with Google Search grounding + user sources, **Judge** with rubric validation and retry loop, and **Builder** with structured schema output) on the Express backend, while presenting a single unified persona (**Billy**) on the frontend.
  - *Why*: Fulfils the exact A3 technical specification (Researcher $\leftrightarrow$ Orchestrator $\leftrightarrow$ Judge $\to$ Builder $\to$ Orchestrator) and produces significantly higher-quality, verified course material without overwhelming the learner with multi-agent jargon.
- **Decision 2: Real-Time Gemini TTS Audio Generation (`gemini-3.8-flash-lite-tts`)**
  - *Chosen Approach*: Provide an `/api/billy/tts` endpoint that synthesizes Billy's spoken lesson walkthroughs into playable WAV audio on demand, paired with waveform/progress playback controls.
  - *Why*: Directly supports auditory learners and honors the user's configured percentage of audio recordings with authentic voice synthesis rather than static text placeholders.
- **Decision 3: Split Public/Private Firestore Schema with Hardened Security Rules**
  - *Chosen Approach*: Store user onboarding preferences and courses in user-scoped Firestore collections (`users/{userId}`, `courses/{courseId}`) protected by strict owner-only validation rules.
  - *Why*: Protects personal contact info (email/phone) and ensures each learner's courses, notebooks, and Billy chat logs persist reliably across sessions and devices.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

#### Architecture & Component Diagram
```
┌────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Tailwind)                      │
├──────────────────────┬──────────────────────────┬──────────────────────────┤
│  Landing & Auth Flow │   Dashboard & Studio     │  Course Learning View    │
│  ┌────────────────┐  │  ┌────────────────────┐  │  ┌────────────────────┐  │
│  │ LandingView    │  │  │ DashboardView      │  │  │ LessonStage        │  │
│  │ (Picture Hero) │  │  │ (Current/Completed)│  │  │ (Text/Visuals/TTS) │  │
│  └───────┬────────┘  │  └─────────┬──────────┘  │  ├────────────────────┤  │
│          ▼           │            ▼             │  │ AdaptiveAssignment │  │
│  ┌────────────────┐  │  ┌────────────────────┐  │  │ (Relax/Challenge)  │  │
│  │ OnboardingModal│  │  │ CourseConfigWizard │  │  ├────────────────────┤  │
│  │ (3-Step Survey)│  │  │ (% Sliders/Sources)│  │  │ BillyChatSidebar & │  │
│  └────────────────┘  │  └─────────┬──────────┘  │  │ CourseNotebook     │  │
│                      │            ▼             │  └────────────────────┘  │
│                      │  ┌────────────────────┐  │                          │
│                      │  │ ShufflingLoader &  │  │                          │
│                      │  │ CoursePreviewTweak │  │                          │
│                      │  └────────────────────┘  │                          │
└──────────┬───────────┴────────────┬─────────────┴────────────┬─────────────┘
           │                        │                          │
           ▼                        ▼                          ▼
┌──────────────────────┐  ┌──────────────────────────────────────────────────┐
│  Firebase Cloud      │  │         EXPRESS SERVER (/api/billy/*)            │
│  - Firebase Auth     │  │  ┌────────────────────────────────────────────┐  │
│  - Firestore DB      │  │  │            ORCHESTRATOR AGENT              │  │
│    ├─ /users/{uid}   │  │  └───┬─────────────────┬──────────────────┬───┘  │
│    └─ /courses/{id}  │  │      ▼                 ▼                  ▼      │
└──────────────────────┘  │  ┌────────────┐   ┌──────────┐    ┌───────────┐  │
                          │  │ RESEARCHER │   │  JUDGE   │    │  BUILDER  │  │
                          │  │ (Search &  │──►│ (Rubric  │───►│ (Modules, │  │
                          │  │  Sources)  │◄──│  Review) │    │  Visuals) │  │
                          │  └────────────┘   └──────────┘    └───────────┘  │
                          │  ┌────────────────────────────────────────────┐  │
                          │  │ Billy Chat, Lesson Regen & Gemini TTS API  │  │
                          │  └────────────────────────────────────────────┘  │
                          └──────────────────────────────────────────────────┘
```

#### Data Model & Firestore Collections
- **`users/{userId}`**:
  - `uid`, `email`, `displayName`, `phoneNumber`, `topicsOfInterest` (array), `learnerType` (string), `preferredTools` (array), `onboardingCompleted` (boolean), `createdAt`, `updatedAt`.
- **`courses/{courseId}`**:
  - `ownerId` (`uid`), `title`, `subtitle`, `topicPrompt`, `status` (`'preview' | 'active' | 'completed'`), `progress` (0–100), `coverImageCategory`.
  - `config`: `{ videoPct, readingPct, audioPct, visualPct, historyDepth, tone, pace, length, assignmentAmount, assignmentDifficulty, priorExperience, sourceMode, customSources }`.
  - `modules`: Array of structured modules, each containing `lessons` (reading markdown, interactive visual diagram spec, audio script, curated video/source references, and adaptive assignments with difficulty state).
  - `notebook`: String content saved by the learner for this course.
  - `chatHistory`: Array of `{ id, role: 'user' | 'billy', text, timestamp }` messages saved per course.

#### Interactive Component & State Mapping
- **Onboarding & Profile Flow**: Authenticates via Google Sign-In (`signInWithPopup`), checks if `users/{uid}` has `onboardingCompleted: true`, and if not, guides the user through the multi-question learner profile wizard before opening the Dashboard.
- **Course Creation & Hidden Multi-Agent Execution**: Submitting the course configuration triggers `POST /api/billy/generate-course`. While the client cycles Billy's friendly status phrases every 2.5 seconds, the server runs the Orchestrator:
  1. Calls **Researcher** (`gemini-3.8-flash` with `googleSearch` grounding and user sources) to gather domain facts, examples, and documentation.
  2. Calls **Judge** (`gemini-3.8-flash` with JSON evaluation schema) to verify accuracy, alignment with learner experience/tone, and sufficiency. If rejected, Orchestrator re-prompts Researcher with the Judge's critique.
  3. Calls **Builder** (`gemini-3.8-flash` with structured JSON course schema) to construct modules, lessons, interactive visual specs, audio scripts, and assignments.
  4. Orchestrator compiles the final course object and returns it to the **Preview & Tweak** screen.
- **Course Preview & Billy Tweak Loop**: In Preview mode, users click through modules and lessons or message Billy in the preview sidebar (`POST /api/billy/tweak-course`) to modify modules, tone, or assignments before clicking **Solidify Course** (which transitions `status` from `'preview'` to `'active'` in Firestore).
- **In-Course Adaptive Actions**:
  - **Regenerate Lesson** (`POST /api/billy/regenerate-lesson`): Rewrites the current lesson with fresh explanations and visual diagrams if the learner didn't understand it.
  - **Modify Assignment Difficulty / Generate More Assignments** (`POST /api/billy/assignment-action`): Dynamically adjusts any assignment to *Relaxing* or *Challenging*, grades learner submissions, and creates additional practice exercises on demand.
  - **Listen to Billy (TTS)** (`POST /api/billy/tts`): Uses `gemini-3.8-flash-lite-tts` to synthesize the lesson's audio recording script into WAV audio for immediate in-browser playback.
