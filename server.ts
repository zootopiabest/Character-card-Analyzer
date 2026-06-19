import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import OpenAI from "openai";
import { safeParseJSON } from "./src/utils";
import {
  analyzeSystemInstruction,
  compareSystemInstruction,
  groupSystemInstruction,
  multicharSystemInstruction,
  analyzeSchemaPrompt,
  compareSchemaPrompt,
  groupSchemaPrompt,
  multicharSchemaPrompt
} from "./src/systemInstructions";

dotenv.config();

function sanitizeModel(model: string | null | undefined, provider: string): string {
  const isOpenRouter = provider === "openrouter";
  const isOpenAI = provider === "openai";
  if (!model) {
    if (isOpenRouter) return "google/gemini-2.5-pro";
    if (isOpenAI) return "gpt-4o";
    return "gemini-2.5-flash";
  }

  let m = model.trim();

  if (isOpenRouter) {
    let lower = m.toLowerCase();
    if (lower.startsWith("gemini-")) {
      m = "google/" + m;
      lower = "google/" + lower;
    }
  } else if (!isOpenAI) {
    // Google Direct SDK
    let lower = m.toLowerCase();
    if (lower.startsWith("google/")) {
      m = m.replace(/^google\//i, "");
      lower = lower.replace("google/", "");
    }
  }
  return m;
}

// Spread-able Gemini thinking config. Returns {} when thinking is off so it
// can be inlined into the generateContent config object.
function geminiThinkingConfig(thinkingMode: boolean, reasoningEffort: string) {
  if (!thinkingMode) return {};
  const level =
    reasoningEffort === "low" ? ThinkingLevel.LOW :
    reasoningEffort === "medium" ? ThinkingLevel.MEDIUM :
    ThinkingLevel.HIGH;
  return { thinkingConfig: { thinkingLevel: level } };
}

function providerLabel(provider: string): string {
  if (provider === "openai") return "OpenAI";
  if (provider === "custom") return "Custom";
  return "OpenRouter";
}

function buildChatCompletionsUrl(provider: string, customBaseUrl?: string): string {
  if (provider === "custom" && customBaseUrl) {
    return customBaseUrl.endsWith("/chat/completions")
      ? customBaseUrl
      : customBaseUrl.replace(/\/$/, "") + "/chat/completions";
  }
  if (provider === "openai") return "https://api.openai.com/v1/chat/completions";
  return "https://openrouter.ai/api/v1/chat/completions";
}

// Shared call path for any OpenAI-compatible endpoint (OpenRouter, OpenAI, custom).
// Returns the raw assistant message string for the caller to JSON-parse.
async function callOpenAICompatible(opts: {
  req: express.Request;
  apiKey: string;
  provider: string;
  model: string;
  messages: any[];
  title: string;
  thinkingMode: boolean;
  reasoningEffort: string;
}): Promise<string> {
  const { req, apiKey, provider, model, messages, title, thinkingMode, reasoningEffort } = opts;
  const apiUrl = buildChatCompletionsUrl(provider, req.body.customBaseUrl);

  const orResponse = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": (req.headers.referer || req.headers.origin || "https://ai.studio") as string,
      "X-Title": title,
      "X-Forwarded-For": (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").toString()
    },
    body: JSON.stringify({
      model,
      messages,
      ...(provider === "openai" && { response_format: { type: "json_object" } }),
      ...(thinkingMode && { reasoning_effort: reasoningEffort }),
      max_tokens: 8192
    })
  });

  if (!orResponse.ok) {
    const errText = await orResponse.text().catch(() => orResponse.statusText);
    if (orResponse.status === 429) {
      throw new Error("Rate limit exceeded (429). The AI provider is overloaded or out of quota. Please try again later or switch models.");
    }
    throw new Error(`${providerLabel(provider)} API error: ${orResponse.status} - ${errText}`);
  }

  const orJson: any = await orResponse.json();
  return orJson.choices?.[0]?.message?.content || "{}";
}

const app = express();
const PORT = 3000;

// Set up larger limits to support base64 image uploads safely
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Initialization completed

// API endpoint to serve system instructions to the client
app.get("/api/system-instructions", (req, res) => {
  res.json({
    analyze: {
      systemInstruction: analyzeSystemInstruction,
      schemaPrompt: analyzeSchemaPrompt
    },
    compare: {
      systemInstruction: compareSystemInstruction,
      schemaPrompt: compareSchemaPrompt
    },
    group: {
      systemInstruction: groupSystemInstruction,
      schemaPrompt: groupSchemaPrompt
    },
    multichar: {
      systemInstruction: multicharSystemInstruction,
      schemaPrompt: multicharSchemaPrompt
    }
  });
});

// API endpoint for character analysis
app.post("/api/analyze", async (req, res) => {
  try {
    const { description, imageBase64, imageMimeType, analyzerNotes, customApiKey, selectedModel, provider, thinkingMode = false, reasoningEffort = "medium" } = req.body;

    const isOpenRouter = provider === "openrouter";
    const keyToUse = customApiKey && customApiKey.trim();

    if (!keyToUse) {
      if (isOpenRouter || provider === "openai" || provider === "custom") {
        return res.status(400).json({
          error: `No API Key provided. Please toggle on 'Custom Runner Override' in the bottom-left panel, set the Provider to ${provider === "openai" ? "OpenAI" : provider === "custom" ? "Custom" : "OpenRouter"}, and paste your API key.`
        });
      }
      return res.status(400).json({
        error: "No API Key provided. Please switch on the 'Custom Runner Override' panel and enter your own Gemini API Key."
      });
    }

    if (!description || typeof description !== "string") {
      return res.status(400).json({ error: "Missing or invalid description text." });
    }

    const modelToUse = sanitizeModel(selectedModel, provider);

    const systemInstruction = analyzeSystemInstruction;

    // OAI COMPATIBLE INTEGRATION CORRIDOR
    if (isOpenRouter || provider === "openai" || provider === "custom") {
      const messages: any[] = [
        {
          role: "system",
          content: systemInstruction + `\n\nYour entire output must be a single valid JSON object strictly matching the following schema. Keep it compact. Do NOT return any markdown wrapping around your JSON string other than direct text, or if you must wrap it in markdown codeblocks, make sure it is valid JSON.\n\nJSON SCHEMA:\n{
  "overallSlopScore": number (0 to 100),
  "slopLabel": "string",
  "slopSummary": "string",
  "coreAnalysis": {
    "originality": { "score": number, "level": "string", "notes": "string" },
    "negativeSpace": { "score": number, "level": "string", "notes": "string" },
    "cohesion": { "score": number, "level": "string", "notes": "string" },
    "tropeUsage": { "score": number, "level": "string", "notes": "string" },
    "creatorCraft": { "score": number, "level": "string", "notes": "string" }
  },
  "criticalAssessment": "string",
  "quippySellSummary": "string",
  "profileVoice": {
    "format": "string",
    "evaluation": "string"
  },
  "exampleDialogue": null or {
    "present": boolean,
    "evaluation": "string"
  },
  "doesBest": "string",
  "doesWorst": "string",
  "datingProfile": "string",
  "walmartRun": "string",
  "firstMessageSynergy": "string",
  "hiddenDynamic": "string",
  "creatorNotesBlurb": "string (If NO creator notes are provided, output 'None provided.')",
  "observations": [
    { "emoji": "string", "text": "string" }
  ],
  "visualComparison": null or {
    "accuracyScore": number,
    "matches": ["string"],
    "mismatches": ["string"],
    "gradeNotes": "string"
  }
}`
        },
        {
          role: "user",
          content: imageBase64 && imageMimeType
            ? [
                {
                  type: "text",
                  text: `Analyze the following character card/description instructions intended for an LLM runtime.

CHARACTER DESCRIPTION / INSTRUCTIONS:
"""
${description}
"""
${analyzerNotes ? `
[OOC/ANALYZER NOTES - EXTERNAL CONTEXT FOR YOU, THE AUDITOR]
CRITICAL INSTRUCTION: The user has provided the following external context. You MUST take this into account when evaluating the card and DO NOT penalize choices that are explicitly justified by these notes:
"""
${analyzerNotes}
"""` : ""}`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${imageMimeType};base64,${imageBase64}`
                  }
                }
              ]
            : `Analyze the following character card/description instructions intended for an LLM runtime.

CHARACTER DESCRIPTION / INSTRUCTIONS:
"""
${description}
"""
${analyzerNotes ? `
[OOC/ANALYZER NOTES - EXTERNAL CONTEXT FOR YOU, THE AUDITOR]
CRITICAL INSTRUCTION: The user has provided the following external context. You MUST take this into account when evaluating the card and DO NOT penalize choices that are explicitly justified by these notes:
"""
${analyzerNotes}
"""` : ""}`
        }
      ];

      const rawContent = await callOpenAICompatible({
        req, apiKey: keyToUse, provider, model: modelToUse, messages,
        title: "LoreSieve Character Audit", thinkingMode, reasoningEffort
      });
      return res.json(safeParseJSON(rawContent));
    }

    // DIRECT GEMINI INTEGRATION
    const ai = new GoogleGenAI({
      apiKey: keyToUse,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Prepare content parts
    const parts: any[] = [
      {
        text: `Analyze the following character card/description instructions intended for an LLM runtime.
        
CHARACTER DESCRIPTION / INSTRUCTIONS:
"""
${description}
"""
${analyzerNotes ? `
[OOC/ANALYZER NOTES - EXTERNAL CONTEXT FOR YOU, THE AUDITOR]
CRITICAL INSTRUCTION: The user has provided the following external context. You MUST take this into account when evaluating the card and DO NOT penalize choices that are explicitly justified by these notes:
"""
${analyzerNotes}
"""` : ""}`
      }
    ];

    if (imageBase64 && imageMimeType) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: { parts },
      config: {
        maxOutputTokens: 8192,
        ...geminiThinkingConfig(thinkingMode, reasoningEffort),
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallSlopScore: {
              type: Type.INTEGER,
              description: "A score from 0 (pristine human construction) to 100 (full of bland AI slop, copy-paste patterns, and narrative cliches)."
            },
            slopLabel: {
              type: Type.STRING,
              description: "A clever label corresponding to the score. E.g., 'Certified Human', 'Mildly Synthetic', 'Slop-Infested', or 'Full Automated Sluttery'."
            },
            slopSummary: {
              type: Type.STRING,
              description: "A witty, fast-paced explanation of the card's overall level of slop vs human authenticity."
            },
            coreAnalysis: {
              type: Type.OBJECT,
              properties: {
                originality: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER, description: "Score from 0 (cliché copy-paste) to 100 (highly unique premise)." },
                    level: { type: Type.STRING },
                    notes: { type: Type.STRING, description: "Sardonic but encouraging summary of the concept's novelty." }
                  },
                  required: ["score", "level", "notes"]
                },
                negativeSpace: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER, description: "Score from 0 (dense, repetitive keyword token-dump) to 100 (concise, high context-efficiency formatting)." },
                    level: { type: Type.STRING },
                    notes: { type: Type.STRING, description: "Notes on how efficient the prompt design is to keep token costs low." }
                  },
                  required: ["score", "level", "notes"]
                },
                cohesion: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER, description: "Score from 0 (schizoid conflicting logic that crashes prompt) to 100 (harmonious core characterization)." },
                    level: { type: Type.STRING },
                    notes: { type: Type.STRING, description: "Notes focusing on how solid the core logic remains despite harmless flavor details." }
                  },
                  required: ["score", "level", "notes"]
                },
                tropeUsage: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER, description: "Score from 0 (lazy crutch) to 100 (tropes executed brilliantly or given an amazing subversion)." },
                    level: { type: Type.STRING },
                    notes: { type: Type.STRING, description: "A witty evaluation of the character's tropes." }
                  },
                  required: ["score", "level", "notes"]
                },
                creatorCraft: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER, description: "Score from 0 (amateurish) to 100 (legendary) based on greeting design, alternate greetings, and optional example dialogue syntax." },
                    level: { type: Type.STRING, description: "Level string e.g., 'Amateurish', 'Competent', 'Slick Cardwright', 'Masterful'." },
                    notes: { type: Type.STRING, description: "Witty and extremely direct notes on how well-crafted the greetings/alternate greetings are and optional example dialogue formatting." }
                  },
                  required: ["score", "level", "notes"]
                }
              },
              required: ["originality", "negativeSpace", "cohesion", "tropeUsage", "creatorCraft"]
            },
            criticalAssessment: {
              type: Type.STRING,
              description: "Thorough gameplay runtime overview, describing how the instructions will actually affect the LLM roleplay. Be brutally honest and identify potential failure points."
            },
            quippySellSummary: {
              type: Type.STRING,
              description: "An italicized, highly dynamic summary of the character's core identity."
            },
            profileVoice: {
              type: Type.OBJECT,
              properties: {
                format: {
                  type: Type.STRING,
                  description: "Format category, e.g., Clinical Dossier, First-person monologue, Narrative Prose, W++ Dictionary."
                },
                evaluation: {
                  type: Type.STRING,
                  description: "Brutally honest, critical evaluation of how the profile's voice reads, who it serves, and whether it causes roleplay friction."
                }
              },
              required: ["format", "evaluation"]
            },
            exampleDialogue: {
              type: Type.OBJECT,
              description: "Details of any example dialogue/messages found in the card. If not present, set 'present' to false and add a minor placeholder note.",
              properties: {
                present: {
                  type: Type.BOOLEAN,
                  description: "True if the card contains example dialogue segments or mes_example patterns, false otherwise."
                },
                evaluation: {
                  type: Type.STRING,
                  description: "Critical evaluation of the example dialogue (voicing alignment, syntax formatting). If not present, state that it's absent and assess neutrally if the rest of the card makes up for it."
                }
              },
              required: ["present", "evaluation"]
            },
            doesBest: {
              type: Type.STRING,
              description: "The primary powerful capability this character's instructions allow an LLM runtime to execute best."
            },
            doesWorst: {
              type: Type.STRING,
              description: "The primary operational vulnerability or formatting failure point this character's setup has during simulation."
            },
            datingProfile: {
              type: Type.STRING,
              description: "A witty, character-authentic 1-2 sentence online dating bio from their perspective."
            },
            walmartRun: {
              type: Type.STRING,
              description: "A hilarious detailed chaotic paragraph describing their late-night trip to Walmart."
            },
            firstMessageSynergy: {
              type: Type.STRING,
              description: "How well the active greeting hooks the user and synthesizes the core character definitions instantly."
            },
            hiddenDynamic: {
              type: Type.STRING,
              description: "A quirky, unintended, or deeper psychological dynamic the LLM might exhibit based on the prompt structure."
            },
            creatorNotesBlurb: {
              type: Type.STRING,
              description: "Provide a short blurb about the creator notes or author commentary. If NONE are present, output 'None provided.' explicitly. DO NOT output null."
            },
            observations: {
              type: Type.ARRAY,
              description: "3 to 5 highly specific, funny, and profound diagnostic observations. Each must map to a single quirky thing in the character's file.",
              items: {
                type: Type.OBJECT,
                properties: {
                  emoji: { type: Type.STRING, description: "A single distinct emoji that matches the theme of this specific point (e.g., 🍉, ✨, 🔪, 🐱)." },
                  text: { type: Type.STRING, description: "A hilarious and sharp observation sentence." }
                },
                required: ["emoji", "text"]
              }
            },
            visualComparison: {
              type: Type.OBJECT,
              description: "Populate ONLY if an uploaded image was provided. Otherwise, return null or leave empty.",
              properties: {
                accuracyScore: { type: Type.INTEGER, description: "0 to 100 matching the card text attributes against the actual visual features present in the image." },
                matches: { type: Type.ARRAY, description: "List of precise visual details that are in perfect sync with the text.", items: { type: Type.STRING } },
                mismatches: { type: Type.ARRAY, description: "List of visual discrepancies between description and image.", items: { type: Type.STRING } },
                gradeNotes: { type: Type.STRING, description: "Witty summary of how the art matches or mismatches the prompt instructions." }
              },
              required: ["accuracyScore", "matches", "mismatches", "gradeNotes"]
            }
          },
          required: [
            "overallSlopScore",
            "slopLabel",
            "slopSummary",
            "coreAnalysis",
            "criticalAssessment",
            "quippySellSummary",
            "profileVoice",
            "exampleDialogue",
            "doesBest",
            "doesWorst",
            "datingProfile",
            "walmartRun",
            "firstMessageSynergy",
            "hiddenDynamic",
            "creatorNotesBlurb",
            "observations"
          ]
        }
      }
    });

    const textOutput = response.text?.trim() || "{}";
    const parsedData = safeParseJSON(textOutput);
    res.json(parsedData);
  } catch (err: any) {
    console.error("AI Analysis Error:", err);
    res.status(500).json({ error: err.message || "An error occurred during AI analysis." });
  }
});

// API endpoint for character comparison (Original vs. Remake)
app.post("/api/compare", async (req, res) => {
  try {
    const { originalDescription, remakeDescription, originalImageBase64, originalImageMimeType, remakeImageBase64, remakeImageMimeType, customApiKey, selectedModel, provider, thinkingMode = false, reasoningEffort = "medium" } = req.body;

    const isOpenRouter = provider === "openrouter";
    const keyToUse = customApiKey && customApiKey.trim();

    if (!keyToUse) {
      if (isOpenRouter || provider === "openai" || provider === "custom") {
        return res.status(400).json({
          error: `No ${provider === "openai" ? "OpenAI" : provider === "custom" ? "Custom" : "OpenRouter"} API Key provided. Please configure it in 'Custom Runner Override'.`
        });
      }
      return res.status(400).json({
        error: "No API Key provided. Please enter a custom Gemini API Key in 'Custom Runner Override'."
      });
    }

    if (!originalDescription || !remakeDescription) {
      return res.status(400).json({ error: "Both original and remake character descriptions must be provided." });
    }

    const modelToUse = sanitizeModel(selectedModel, provider);

    const systemInstruction = compareSystemInstruction;

    const analysisResultProperties = {
      overallSlopScore: {
        type: Type.INTEGER,
        description: "A score from 0 (pristine human construction) to 100 (full of bland AI slop, copy-paste patterns, and narrative cliches)."
      },
      slopLabel: { type: Type.STRING },
      slopSummary: { type: Type.STRING },
      coreAnalysis: {
        type: Type.OBJECT,
        properties: {
          originality: {
            type: Type.OBJECT,
            properties: { score: { type: Type.INTEGER }, level: { type: Type.STRING }, notes: { type: Type.STRING } },
            required: ["score", "level", "notes"]
          },
          negativeSpace: {
            type: Type.OBJECT,
            properties: { score: { type: Type.INTEGER }, level: { type: Type.STRING }, notes: { type: Type.STRING } },
            required: ["score", "level", "notes"]
          },
          cohesion: {
            type: Type.OBJECT,
            properties: { score: { type: Type.INTEGER }, level: { type: Type.STRING }, notes: { type: Type.STRING } },
            required: ["score", "level", "notes"]
          },
          tropeUsage: {
            type: Type.OBJECT,
            properties: { score: { type: Type.INTEGER }, level: { type: Type.STRING }, notes: { type: Type.STRING } },
            required: ["score", "level", "notes"]
          },
          creatorCraft: {
            type: Type.OBJECT,
            properties: { score: { type: Type.INTEGER }, level: { type: Type.STRING }, notes: { type: Type.STRING } },
            required: ["score", "level", "notes"]
          }
        },
        required: ["originality", "negativeSpace", "cohesion", "tropeUsage", "creatorCraft"]
      },
      criticalAssessment: { type: Type.STRING },
      quippySellSummary: { type: Type.STRING },
      profileVoice: {
        type: Type.OBJECT,
        properties: {
          format: { type: Type.STRING },
          evaluation: { type: Type.STRING }
        },
        required: ["format", "evaluation"]
      },
      exampleDialogue: {
        type: Type.OBJECT,
        properties: {
          present: { type: Type.BOOLEAN },
          evaluation: { type: Type.STRING }
        },
        required: ["present", "evaluation"]
      },
      doesBest: { type: Type.STRING },
      doesWorst: { type: Type.STRING },
      datingProfile: { type: Type.STRING },
      walmartRun: { type: Type.STRING },
      firstMessageSynergy: { type: Type.STRING },
      hiddenDynamic: { type: Type.STRING },
      creatorNotesBlurb: { type: Type.STRING, description: "Provide a short blurb about the creator notes or author commentary. If NONE are present, output 'None provided.' explicitly. DO NOT output null." },
      observations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { emoji: { type: Type.STRING }, text: { type: Type.STRING } },
          required: ["emoji", "text"]
        }
      }
    };

    const analysisResultRequiredFields = [
      "overallSlopScore",
      "slopLabel",
      "slopSummary",
      "coreAnalysis",
      "criticalAssessment",
      "quippySellSummary",
      "profileVoice",
      "exampleDialogue",
      "doesBest",
      "doesWorst",
      "datingProfile",
      "walmartRun",
      "firstMessageSynergy",
      "hiddenDynamic",
      "creatorNotesBlurb",
      "observations"
    ];

    // OAI COMPATIBLE INTEGRATION CORRIDOR
    if (isOpenRouter || provider === "openai" || provider === "custom") {
      const messages: any[] = [
        {
          role: "system",
          content: systemInstruction + `\n\nYour entire output must be a single valid JSON object strictly matching the following schema. Keep it compact. Do NOT return any markdown wrapping around your JSON string other than direct text, or if you must wrap it in markdown codeblocks, make sure it is valid JSON.\n\nJSON SCHEMA:\n{
  "original": {
    "overallSlopScore": 50,
    "slopLabel": "Certified Human",
    "slopSummary": "A concise diagnostic summary under 40 words",
    "coreAnalysis": {
      "originality": { "score": 80, "level": "HIGH", "notes": "Deep insight here" },
      "negativeSpace": { "score": 60, "level": "OPTIMAL", "notes": "Clutter rating" },
      "cohesion": { "score": 75, "level": "GOOD", "notes": "Concept fit" },
      "tropeUsage": { "score": 90, "level": "SUBTLE", "notes": "Trope description" },
      "creatorCraft": { "score": 70, "level": "EXPERT", "notes": "Refined structure notes" }
    },
    "criticalAssessment": "General structural playability audit details...",
    "quippySellSummary": "Funny tagline summarizing character essence...",
    "profileVoice": {
      "format": "Mixed W++ Dictionary",
      "evaluation": "Voice analysis details..."
    },
    "exampleDialogue": {
      "present": true,
      "evaluation": "Evaluation of example lines..."
    },
    "doesBest": "Where it excels in runtime play...",
    "doesWorst": "Where it fails or drops context...",
    "datingProfile": "1-2 sentence fun perspective profile bio...",
    "walmartRun": "Chaotic narrative paragraph describing midnight trip to walmart...",
    "firstMessageSynergy": "How well the greeting sets up the roleplay...",
    "hiddenDynamic": "Secret or implicit dynamic the bot might fall into...",
    "creatorNotesBlurb": "Blurb about creator notes metadata...",
    "observations": [
      { "emoji": "📌", "text": "Bullet point observation detail" }
    ]
  },
  "remake": {
    "overallSlopScore": 30,
    "slopLabel": "Highly Refined",
    "slopSummary": "A concise diagnostic summary under 40 words",
    "coreAnalysis": {
      "originality": { "score": 85, "level": "HIGH", "notes": "Deep insight here" },
      "negativeSpace": { "score": 80, "level": "OPTIMAL", "notes": "Clutter rating" },
      "cohesion": { "score": 85, "level": "EXCELLENT", "notes": "Concept fit" },
      "tropeUsage": { "score": 95, "level": "EXQUISITE", "notes": "Trope description" },
      "creatorCraft": { "score": 90, "level": "MASTERFUL", "notes": "Refined structure notes" }
    },
    "criticalAssessment": "General structural playability audit details...",
    "quippySellSummary": "Funny tagline summarizing character essence...",
    "profileVoice": {
      "format": "Plurality Format",
      "evaluation": "Voice analysis details..."
    },
    "exampleDialogue": {
      "present": true,
      "evaluation": "Evaluation of example lines..."
    },
    "doesBest": "Where it excels in runtime play...",
    "doesWorst": "Where it fails or drops context...",
    "datingProfile": "1-2 sentence fun perspective profile bio...",
    "walmartRun": "Chaotic narrative paragraph describing midnight trip to walmart...",
    "firstMessageSynergy": "How well the greeting sets up the roleplay...",
    "hiddenDynamic": "Secret or implicit dynamic the bot might fall into...",
    "creatorNotesBlurb": "Blurb about creator notes metadata...",
    "observations": [
      { "emoji": "📌", "text": "Bullet point observation detail" }
    ]
  },
  "comparison": {
    "overallVerdict": "Summary line designating main outcome of the rewrite",
    "summaryOfChanges": "Text detailing differences between original and remake versions",
    "whatImproved": ["Bullet detail of improvement 1", "Bullet detail of improvement 2"],
    "whatRegressed": ["Bullet detail of regression 1", "Bullet detail of regression 2"],
    "verdictScorecard": {
      "originalScore": 75,
      "remakeScore": 85
    }
  }
}`
        },
        {
          role: "user",
          content: `Compare original vs remake character designs.
          
ORIGINAL CHARACTER DESCRIPTION:
"""
${originalDescription}
"""

REMAKE CHARACTER DESCRIPTION:
"""
${remakeDescription}
"""`
        }
      ];

      const rawContent = await callOpenAICompatible({
        req, apiKey: keyToUse, provider, model: modelToUse, messages,
        title: "LoreSieve Character Combat Compare", thinkingMode, reasoningEffort
      });
      return res.json(safeParseJSON(rawContent));
    }

    // DIRECT GEMINI INTEGRATION
    const ai = new GoogleGenAI({
      apiKey: keyToUse,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const parts: any[] = [
      {
        text: `Analyze and compare the following two versions of a character card. Contrast original instructions vs remake instructions. Compare details like negative space mechanics, prose value, greeting design, voice format shifts, and example dialogue.

ORIGINAL CHARACTER PORTRAIT/PROMPT DESCRIPTION:
"""
${originalDescription}
"""

REMAKE CHARACTER PORTRAIT/PROMPT DESCRIPTION:
"""
${remakeDescription}
"""`
      }
    ];

    if (originalImageBase64 && originalImageMimeType) {
      parts.push({
        text: "Below is the original visual portrait associated with the original card."
      });
      parts.push({
        inlineData: {
          mimeType: originalImageMimeType,
          data: originalImageBase64,
        },
      });
    }

    if (remakeImageBase64 && remakeImageMimeType) {
      parts.push({
        text: "Below is the remake visual portrait associated with the remixed/remake card."
      });
      parts.push({
        inlineData: {
          mimeType: remakeImageMimeType,
          data: remakeImageBase64,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: { parts },
      config: {
        maxOutputTokens: 8192,
        ...geminiThinkingConfig(thinkingMode, reasoningEffort),
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            original: {
              type: Type.OBJECT,
              properties: analysisResultProperties,
              required: analysisResultRequiredFields
            },
            remake: {
              type: Type.OBJECT,
              properties: analysisResultProperties,
              required: analysisResultRequiredFields
            },
            comparison: {
              type: Type.OBJECT,
              properties: {
                overallVerdict: {
                  type: Type.STRING,
                  description: "A punchy summary label of the transition, e.g., 'An outstanding structural evolution' or 'A disastrous regress into AI slop'."
                },
                summaryOfChanges: {
                  type: Type.STRING,
                  description: "Brutally honest, cynical overview comparing original vs remake, identifying how promptability, token efficiency, voice format, and character depth changed."
                },
                whatImproved: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Bullet-by-bullet list of specific positive improvements (e.g. better greeting setups, sharper dialogue habits prose, better negative space)."
                },
                whatRegressed: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Bullet-by-bullet checklist of what was lost, what errors were committed during rewrite, or elements that should have stayed from the original."
                },
                verdictScorecard: {
                  type: Type.OBJECT,
                  properties: {
                    originalScore: { type: Type.INTEGER },
                    remakeScore: { type: Type.INTEGER }
                  },
                  required: ["originalScore", "remakeScore"]
                }
              },
              required: ["overallVerdict", "summaryOfChanges", "whatImproved", "whatRegressed", "verdictScorecard"]
            }
          },
          required: ["original", "remake", "comparison"]
        }
      }
    });

    const textOutput = response.text?.trim() || "{}";
    const parsedData = safeParseJSON(textOutput);
    res.json(parsedData);
  } catch (err: any) {
    console.error("AI Comparison Error:", err);
    res.status(500).json({ error: err.message || "An error occurred during AI comparison analysis." });
  }
});

app.post("/api/group", async (req, res) => {
  const {
    characters, // Array<{name, description}>
    customApiKey,
    selectedModel,
    provider,
    thinkingMode = false,
    reasoningEffort = "medium"
  } = req.body;

  if (!characters || characters.length < 2) {
    return res.status(400).json({ error: "At least two character cards are required for group synergy analysis." });
  }

  const isOpenRouter = provider === "openrouter";
  const modelToUse = sanitizeModel(selectedModel, provider);
  const apiKey = customApiKey?.trim();

  if (!apiKey) {
    return res.status(401).json({ error: "Missing API key. Please provide it via the 'Custom Runner Override' panel." });
  }

  try {
    let rawJsonResponse = "";

    const userInstructions = characters.map((char: any, i: number) => `CHAR_${i + 1} (${char.name}):
${char.description}`).join("\n\n------\n\n");

    const systemInstruction = groupSystemInstruction;

    if (isOpenRouter || provider === "openai" || provider === "custom") {
      const messages: any[] = [
        {
          role: "system",
          content: systemInstruction + `\n\nYour entire output must be a single valid JSON object strictly matching the following schema. Keep it compact. Do NOT return any markdown wrapping around your JSON string other than direct text, or if you must wrap it in markdown codeblocks, make sure it is valid JSON.\n\nJSON SCHEMA:\n{
  "groupSlopScore": number,
  "slopLabel": "string",
  "slopSummary": "string",
  "synergyAnalysis": {
    "overallCompatibility": "string",
    "redundancyWarnings": ["string"],
    "roleplayPotential": "string",
    "tokenBloatWarning": "string"
  },
  "characterBreakdowns": [
    {
      "name": "string",
      "archetype": "string",
      "groupRole": "string",
      "potentialConflicts": "string"
    }
  ],
  "groupScenarios": {
    "roadTrip": "string",
    "bankHeist": "string"
  },
  "criticalAssessment": "string"
}`
        },
        {
          role: "user",
          content: userInstructions
        }
      ];

      rawJsonResponse = await callOpenAICompatible({
        req, apiKey, provider, model: modelToUse, messages,
        title: "LoreSieve Group Audit", thinkingMode, reasoningEffort
      });
    } else {
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: userInstructions,
        config: {
          maxOutputTokens: 8192,
        ...geminiThinkingConfig(thinkingMode, reasoningEffort),
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              groupSlopScore: { type: Type.INTEGER },
              slopLabel: { type: Type.STRING },
              slopSummary: { type: Type.STRING },
              synergyAnalysis: {
                type: Type.OBJECT,
                properties: {
                  overallCompatibility: { type: Type.STRING },
                  redundancyWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
                  roleplayPotential: { type: Type.STRING },
                  tokenBloatWarning: { type: Type.STRING }
                },
                required: ["overallCompatibility", "redundancyWarnings", "roleplayPotential", "tokenBloatWarning"]
              },
              characterBreakdowns: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    archetype: { type: Type.STRING },
                    groupRole: { type: Type.STRING },
                    potentialConflicts: { type: Type.STRING }
                  },
                  required: ["name", "archetype", "groupRole", "potentialConflicts"]
                }
              },
              groupScenarios: {
                type: Type.OBJECT,
                properties: {
                  roadTrip: { type: Type.STRING },
                  bankHeist: { type: Type.STRING }
                },
                required: ["roadTrip", "bankHeist"]
              },
              criticalAssessment: { type: Type.STRING }
            },
            required: ["groupSlopScore", "slopLabel", "slopSummary", "synergyAnalysis", "characterBreakdowns", "groupScenarios", "criticalAssessment"]
          }
        }
      });

      rawJsonResponse = response.text?.trim() || "{}";
    }

    const parsedData = safeParseJSON(rawJsonResponse);
    res.json(parsedData);
  } catch (err: any) {
    console.error("Group Synergy AI Error:", err);
    res.status(500).json({ error: err.message || "An error occurred during group synergy analysis." });
  }
});

app.post("/api/multichar", async (req, res) => {
  try {
    const { description, customApiKey, selectedModel, provider, thinkingMode = false, reasoningEffort = "medium" } = req.body;

    const isOpenRouter = provider === "openrouter";
    const keyToUse = customApiKey && customApiKey.trim();

    if (!keyToUse) {
      if (isOpenRouter || provider === "openai" || provider === "custom") {
        return res.status(400).json({
          error: `Missing ${provider === "openai" ? "OpenAI" : provider === "custom" ? "Custom Override" : "OpenRouter"} API Key. Please provide a custom API key.`,
        });
      } else {
        return res.status(400).json({
          error: "Missing Gemini API Key. Please provide it via the 'Custom Runner Override' panel.",
        });
      }
    }

    const modelToUse = sanitizeModel(selectedModel, provider);

    const systemInstruction = multicharSystemInstruction;

    let rawJsonResponse = "";

    if (isOpenRouter || provider === "openai" || provider === "custom") {
      const messages: any[] = [
        {
          role: "system",
          content: systemInstruction + `\n\nYour entire output must be a single valid JSON object strictly matching the following schema. Keep it compact. Do NOT return any markdown wrapping around your JSON string other than direct text, or if you must wrap it in markdown codeblocks, make sure it is valid JSON.\n\nJSON SCHEMA:\n{
  "overallSlopScore": number,
  "slopLabel": "string",
  "slopSummary": "string",
  "worldAndSystemAnalysis": {
    "worldBuilding": { "score": number, "notes": "string" },
    "systemRulesAdherence": { "score": number, "notes": "string" },
    "lorebookIntegration": "string"
  },
  "characterAssessments": [
    {
      "name": "string",
      "archetype": "string",
      "depthScore": number,
      "synergyWithWorld": "string",
      "criticalNotes": "string"
    }
  ],
  "groupCohesion": "string",
  "criticalAssessment": "string",
  "playScenarios": {
    "rpgEncounter": "string",
    "campFireChat": "string"
  }
}`
        },
        {
          role: "user",
          content: `MULTI-CHARACTER CARD DATA TO ANALYZE:\n\n${description}`
        }
      ];

      rawJsonResponse = await callOpenAICompatible({
        req, apiKey: keyToUse, provider, model: modelToUse, messages,
        title: "LoreSieve Multi-Char Audit", thinkingMode, reasoningEffort
      });
    } else {
      const ai = new GoogleGenAI({ apiKey: keyToUse });
      
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: `MULTI-CHARACTER CARD DATA TO ANALYZE:\n\n${description}`,
        config: {
          maxOutputTokens: 8192,
        ...geminiThinkingConfig(thinkingMode, reasoningEffort),
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallSlopScore: { type: Type.INTEGER },
              slopLabel: { type: Type.STRING },
              slopSummary: { type: Type.STRING },
              worldAndSystemAnalysis: {
                type: Type.OBJECT,
                properties: {
                  worldBuilding: {
                    type: Type.OBJECT,
                    properties: {
                      score: { type: Type.INTEGER },
                      notes: { type: Type.STRING }
                    },
                    required: ["score", "notes"]
                  },
                  systemRulesAdherence: {
                    type: Type.OBJECT,
                    properties: {
                      score: { type: Type.INTEGER },
                      notes: { type: Type.STRING }
                    },
                    required: ["score", "notes"]
                  },
                  lorebookIntegration: { type: Type.STRING }
                },
                required: ["worldBuilding", "systemRulesAdherence", "lorebookIntegration"]
              },
              characterAssessments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    archetype: { type: Type.STRING },
                    depthScore: { type: Type.INTEGER },
                    synergyWithWorld: { type: Type.STRING },
                    criticalNotes: { type: Type.STRING }
                  },
                  required: ["name", "archetype", "depthScore", "synergyWithWorld", "criticalNotes"]
                }
              },
              groupCohesion: { type: Type.STRING },
              criticalAssessment: { type: Type.STRING },
              playScenarios: {
                type: Type.OBJECT,
                properties: {
                  rpgEncounter: { type: Type.STRING },
                  campFireChat: { type: Type.STRING }
                },
                required: ["rpgEncounter", "campFireChat"]
              }
            },
            required: ["overallSlopScore", "slopLabel", "slopSummary", "worldAndSystemAnalysis", "characterAssessments", "groupCohesion", "criticalAssessment", "playScenarios"]
          }
        }
      });

      rawJsonResponse = response.text?.trim() || "{}";
    }

    const result = safeParseJSON(rawJsonResponse);
    res.json(result);
  } catch (error: any) {
    console.error("Analyze Multi-Char error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze multi-character card" });
  }
});


// Serve frontend assets in development and production
if (process.env.NODE_ENV !== "production") {
  createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  }).then((vite) => {
    app.use(vite.middlewares);
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Development server running on http://localhost:${PORT}`);
    });
  });
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Production server running on port ${PORT}`);
  });
}
