export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  careerGoal: string;
  topicsOfInterest: string[];
  learnerType: string;
  preferredTools: string[];
  onboardingCompleted: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CourseConfig {
  courseFormat: "Standard Course" | "Project Walkthrough" | "Fictitious Scenario" | "Career & Job Track";
  videoPct: number;
  readingPct: number;
  audioPct: number;
  visualPct: number;
  historyDepth: "Minimal" | "Balanced" | "Deep Historical";
  tone: "Conversational & Warm" | "Direct & Technical" | "Academic & Rigorous" | "Hands-on Coach";
  pace: "Slow & Steady" | "Moderate" | "Fast-Track";
  length: "Crash Course" | "Standard Multi-Module" | "Comprehensive";
  assignmentAmount:
    | "1 per lesson (Light practice)"
    | "2 per lesson (Balanced practice)"
    | "3+ per lesson (Intensive practice)"
    | string;
  assignmentDifficulty: "Relaxing" | "Standard" | "Challenging";
  priorExperience: "Complete Beginner" | "Some Familiarity" | "Intermediate" | "Advanced";
  sourceMode: "ai" | "sources" | "both";
  customSources: string;
}

export interface ReadingSection {
  heading: string;
  content: string;
  keyTakeaway: string;
}

export interface DiagramNode {
  id: string;
  label: string;
  detail: string;
  metricOrRule: string;
}

export interface VisualDiagram {
  title: string;
  diagramType: "flow" | "layers" | "comparison" | "cycle" | string;
  interactivePrompt: string;
  nodes: DiagramNode[];
}

export interface VideoAndSourceItem {
  title: string;
  format: string;
  durationOrLength: string;
  keyFocus: string;
  searchQueryOrUrl: string;
}

export interface AssignmentQuestion {
  id: string;
  question: string;
  hint: string;
  sampleSolution: string;
}

export interface AssignmentEvaluation {
  score: number;
  overallFeedback: string;
  questionFeedback: {
    questionId: string;
    status: string;
    comment: string;
  }[];
}

export interface Assignment {
  id: string;
  title: string;
  difficulty: "Relaxing" | "Standard" | "Challenging" | string;
  scenarioPrompt: string;
  questions: AssignmentQuestion[];
  userAnswers?: Record<string, string>;
  evaluation?: AssignmentEvaluation;
}

export interface Lesson {
  id: string;
  title: string;
  estimatedMinutes: number;
  summary: string;
  completed?: boolean;
  historicalContext: string;
  readingSections: ReadingSection[];
  audioScript: string;
  visualDiagram: VisualDiagram;
  videoAndSources: VideoAndSourceItem[];
  assignments: Assignment[];
}

export interface CourseModule {
  id: string;
  title: string;
  objective: string;
  lessons: Lesson[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "billy";
  text: string;
  timestamp: string;
}

export interface Course {
  id: string;
  ownerId: string;
  title: string;
  subtitle: string;
  topicPrompt: string;
  category: "tech" | "finance" | "ai" | "design" | "history" | "career" | string;
  status: "preview" | "active" | "archived";
  isCompleted: boolean;
  progress: number;
  config: CourseConfig;
  modules: CourseModule[];
  notebook: string;
  chatHistory: ChatMessage[];
  createdAt?: unknown;
  updatedAt?: unknown;
}
