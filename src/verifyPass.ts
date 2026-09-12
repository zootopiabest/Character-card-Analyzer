// Evidence Verification Pass — optional second call, prose-only.
//
// Pass 1 produces the report. This module pulls the report's *factual* prose
// claims into a numbered list, and applies the corrections the verifier sends
// back. The verifier returns a small patch ({"fixes":[...]}) rather than a
// whole report, so a clean audit costs about ten output tokens.
//
// Deliberately excluded from checking:
//   - scores, grades, labels (this pass never touches a number — see CLAUDE.md)
//   - slopSummary / quippySellSummary / creatorNotesBlurb (voice, not claims)
//   - every immersion module (the rubric calls them non-scoring voice stress
//     tests that may adapt concepts creatively; fact-checking breaks them)
//   - visualComparison (the image is not resent, so it cannot be checked)
//
// The whole feature is contained here plus one guarded block in aiClient.run().

export interface Claim {
  id: number;
  label: string;
  text: string;
  set: (value: string) => void;
}

export interface VerificationSummary {
  checked: number;
  corrected: number;
  status: "clean" | "corrected" | "unavailable";
  corrections: Array<{ label: string; problem: string }>;
}

function add(out: Claim[], label: string, host: any, key: string) {
  if (!host || typeof host !== "object") return;
  const value = host[key];
  if (typeof value !== "string" || !value.trim()) return;
  out.push({ id: out.length + 1, label, text: value, set: v => { host[key] = v; } });
}

function addItems(out: Claim[], label: string, host: any, key: string) {
  const arr = host?.[key];
  if (!Array.isArray(arr)) return;
  arr.forEach((value, i) => {
    if (typeof value !== "string" || !value.trim()) return;
    out.push({ id: out.length + 1, label: `${label}[${i + 1}]`, text: value, set: v => { arr[i] = v; } });
  });
}

// The prose fields of a single-card audit (also used for each side of a
// comparison, which embeds two complete audits).
function auditClaims(out: Claim[], data: any, prefix = "") {
  if (!data || typeof data !== "object") return;
  for (const key of ["originality", "negativeSpace", "cohesion", "tropeUsage", "creatorCraft"]) {
    add(out, `${prefix}${key}`, data.coreAnalysis?.[key], "notes");
  }
  add(out, `${prefix}criticalAssessment`, data, "criticalAssessment");
  add(out, `${prefix}profileVoice`, data.profileVoice, "evaluation");
  add(out, `${prefix}exampleDialogue`, data.exampleDialogue, "evaluation");
  add(out, `${prefix}doesBest`, data, "doesBest");
  add(out, `${prefix}doesWorst`, data, "doesWorst");
  add(out, `${prefix}firstMessageSynergy`, data, "firstMessageSynergy");
  add(out, `${prefix}hiddenDynamic`, data, "hiddenDynamic");
  if (Array.isArray(data.observations)) {
    data.observations.forEach((observation: any, i: number) => {
      add(out, `${prefix}observation[${i + 1}]`, observation, "text");
    });
  }
}

export function collectClaims(endpoint: string, data: any): Claim[] {
  const out: Claim[] = [];
  if (!data || typeof data !== "object") return out;

  if (endpoint === "analyze") {
    auditClaims(out, data);
  } else if (endpoint === "compare") {
    auditClaims(out, data.original, "original.");
    auditClaims(out, data.remake, "remake.");
    add(out, "comparison.overallVerdict", data.comparison, "overallVerdict");
    add(out, "comparison.summaryOfChanges", data.comparison, "summaryOfChanges");
    addItems(out, "comparison.whatImproved", data.comparison, "whatImproved");
    addItems(out, "comparison.whatRegressed", data.comparison, "whatRegressed");
  } else if (endpoint === "group") {
    add(out, "criticalAssessment", data, "criticalAssessment");
    for (const key of ["overallCompatibility", "roleplayPotential", "tokenBloatWarning"]) {
      add(out, `synergy.${key}`, data.synergyAnalysis, key);
    }
    addItems(out, "synergy.redundancyWarnings", data.synergyAnalysis, "redundancyWarnings");
    if (Array.isArray(data.characterBreakdowns)) {
      data.characterBreakdowns.forEach((c: any, i: number) => {
        const who = typeof c?.name === "string" && c.name.trim() ? c.name.trim() : `character ${i + 1}`;
        for (const key of ["archetype", "groupRole", "potentialConflicts"]) add(out, `${who}.${key}`, c, key);
      });
    }
  } else {
    add(out, "criticalAssessment", data, "criticalAssessment");
    add(out, "worldBuilding", data.worldAndSystemAnalysis?.worldBuilding, "notes");
    add(out, "systemRulesAdherence", data.worldAndSystemAnalysis?.systemRulesAdherence, "notes");
    add(out, "lorebookIntegration", data.worldAndSystemAnalysis, "lorebookIntegration");
    add(out, "groupCohesion", data, "groupCohesion");
    if (Array.isArray(data.characterAssessments)) {
      data.characterAssessments.forEach((c: any, i: number) => {
        const who = typeof c?.name === "string" && c.name.trim() ? c.name.trim() : `character ${i + 1}`;
        for (const key of ["archetype", "synergyWithWorld", "criticalNotes"]) add(out, `${who}.${key}`, c, key);
      });
    }
  }
  return out;
}

// The user message for the verification call: the card text the report was
// built from, plus the numbered claims. The rubric is deliberately absent.
export function buildClaimsMessage(cardText: string, claims: Claim[]): string {
  const numbered = claims.map(c => `[${c.id}] (${c.label}) ${c.text}`).join("\n\n");
  return `CARD TEXT THE REPORT WAS BUILT FROM:\n\n${cardText}\n\nCLAIMS TO CHECK (${claims.length}):\n\n${numbered}`;
}

// Apply only well-formed fixes that name a claim we actually sent. Anything
// else — unknown id, non-string replacement, empty text, a replacement that
// balloons the field — is dropped rather than trusted, the same fail-closed
// posture resultValidation.ts takes with pass 1.
export function applyFixes(claims: Claim[], raw: any): VerificationSummary {
  const byId = new Map(claims.map(c => [c.id, c]));
  const corrections: VerificationSummary["corrections"] = [];
  const seen = new Set<number>();
  const fixes = Array.isArray(raw?.fixes) ? raw.fixes : [];

  for (const fix of fixes) {
    if (!fix || typeof fix !== "object") continue;
    const id = typeof fix.id === "number" ? fix.id : Number(fix.id);
    if (!Number.isInteger(id) || seen.has(id)) continue;
    const claim = byId.get(id);
    if (!claim) continue;
    const replacement = typeof fix.replacement === "string" ? fix.replacement.trim() : "";
    if (!replacement || replacement === claim.text.trim()) continue;
    // A correction trims or rewords a claim; it never turns one line into an
    // essay. A wildly longer replacement means the verifier started writing
    // its own report, so refuse it.
    if (replacement.length > Math.max(400, claim.text.length * 3)) continue;
    seen.add(id);
    claim.set(replacement);
    corrections.push({
      label: claim.label,
      problem: typeof fix.problem === "string" ? fix.problem.trim().slice(0, 300) : "",
    });
  }

  return {
    checked: claims.length,
    corrected: corrections.length,
    status: corrections.length ? "corrected" : "clean",
    corrections,
  };
}
