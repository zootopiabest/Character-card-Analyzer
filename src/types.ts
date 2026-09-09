export interface AnalysisResult {
  requestModel?: string;
  overallSlopScore: number; // 0 to 100
  slopLabel: string; // e.g., "Certified Human", "Suspiciously Clean", "Blandly Synthesized", "Full AI Slop"
  slopSummary: string; // Short witty summary of the slop analysis
  
  coreAnalysis: {
    originality: {
      score: number;
      level: string; // e.g., "Cliche Crutch", "Human-authored Feel", "Vibrant & Unique"
      notes: string;
    };
    negativeSpace: {
      score: number;
      level: string; // e.g., "Context Bloat", "Well Structured", "Ultra lean"
      notes: string;
    };
    cohesion: {
      score: number;
      level: string; // e.g., "Schizoid Prompt", "Balanced", "Core-Aligned"
      notes: string;
    };
    tropeUsage: {
      score: number;
      level: string; // e.g., "Tired Trope", "Done Wonderfully", "Novel Spin"
      notes: string;
    };
    creatorCraft: {
      score: number;
      level: string; // e.g., "Amateurishly Rushed", "Competent Craft", "Godtier Cardwrighting"
      notes: string;
    };
  };

  criticalAssessment: string; // Explaining the LLM promptability, runtime characteristics, and writing design
  quippySellSummary: string; // Sarcastic, fun, or punchy summary of who this is

  profileVoice: {
    format: string; // Clinical, In-Character, Dossier, W++ Dict, Narrative, etc.
    evaluation: string; // Harsh but fair breakdown of how it reads and whether it serves the character.
  };

  exampleDialogue?: {
    present: boolean;
    evaluation: string; // Evaluation of formatting accuracy, character voice, punctuation inside examples, etc.
  } | null;

  // Immersion & behavior fun dimensions
  doesBest: string;
  doesWorst: string;

  // Optional immersion modules — present only when the user enabled the
  // matching toggle for the run (see src/immersionModules.ts).
  datingProfile?: string | null;
  shoppingList?: {
    items: string[];
    notes: string;
  } | null;
  topSongs?: Array<{
    title: string;
    artist: string;
    vibe: string;
  }> | null;
  demise?: {
    howTheyDie: string;
    obituary: string;
  } | null;
  psychoanalysis?: string | null;
  emotionalRegisters?: {
    sad: string;
    angry: string;
    happy: string;
    grief: string;
    comedy: string;
  } | null;

  // New features
  firstMessageSynergy: string;
  hiddenDynamic: string;
  creatorNotesBlurb?: string | null;

  observations: Array<{
    emoji: string;
    text: string;
  }>;

  visualComparison?: {
    accuracyScore: number;
    mismatches: string[];
    matches: string[];
    gradeNotes: string;
  };
}

export interface GroupResult {
  requestModel?: string;
  groupSlopScore: number;
  slopLabel: string;
  slopSummary: string;
  
  synergyAnalysis: {
    overallCompatibility: string;
    redundancyWarnings: string[];
    roleplayPotential: string;
    tokenBloatWarning: string;
  };
  
  characterBreakdowns: Array<{
    name: string;
    archetype: string;
    groupRole: string; // The role they naturally fall into within this specific group
    potentialConflicts: string;
    // Optional immersion modules — compact per-character strings, present
    // only when the matching toggle was enabled for the run.
    datingProfile?: string | null;
    shoppingList?: string | null;
    topSongs?: string | null;
    demise?: string | null;
    psychoanalysis?: string | null;
    emotionalRegisters?: string | null;
  }>;
  
  groupScenarios: {
    roadTrip: string;
    bankHeist: string;
  };
  
  criticalAssessment: string;
}

export interface CharacterCardData {
  name: string;
  description: string;
  personality?: string;
  firstMes?: string;
  scenario?: string;
}

export interface MultiCharResult {
  requestModel?: string;
  overallSlopScore: number;
  slopLabel: string;
  slopSummary: string;
  
  worldAndSystemAnalysis: {
    worldBuilding: {
      score: number;
      notes: string;
    };
    systemRulesAdherence: {
      score: number;
      notes: string;
    };
    lorebookIntegration: string;
  };

  characterAssessments: Array<{
    name: string;
    archetype: string;
    depthScore: number;
    synergyWithWorld: string;
    criticalNotes: string;
    // Optional immersion modules — compact per-character strings, present
    // only when the matching toggle was enabled for the run.
    datingProfile?: string | null;
    shoppingList?: string | null;
    topSongs?: string | null;
    demise?: string | null;
    psychoanalysis?: string | null;
    emotionalRegisters?: string | null;
  }>;

  groupCohesion: string;
  criticalAssessment: string;
  
  playScenarios: {
    rpgEncounter: string;
    campFireChat: string;
  };
}

export interface ComparisonResult {
  requestModel?: string;
  original: AnalysisResult;
  remake: AnalysisResult;
  comparison: {
    overallVerdict: string; // "An outstanding evolution", "Two steps back", etc.
    summaryOfChanges: string; // Robust, brutally honest comparative overview of the rewrite
    whatImproved: string[]; // Specific engineering improvements (e.g. punctuation, negative space)
    whatRegressed: string[]; // Specific engineering regressions or what should have stayed
    verdictScorecard: {
      originalScore: number;
      remakeScore: number;
    };
  };
}

