// JSON syntax alone is not a valid report. Reject unusable grades and malformed
// fields before React sees them; never manufacture a score or a positive finding.
const invalid = (field: string): never => { throw new Error(`The AI returned an incomplete or invalid report (${field}). No grades were substituted. Please run the analysis again.`); };
const object = (v: any, field: string): any => v && typeof v === "object" && !Array.isArray(v) ? v : invalid(field);
const score = (v: any, max: number, field: string) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? v : invalid(field);
function strings(d: any, keys: string[]) {
  for (const key of keys) {
    if (d[key] == null) d[key] = "";
    else if (typeof d[key] !== "string") invalid(key);
  }
}
function list(d: any, key: string): any[] {
  if (d[key] == null) d[key] = [];
  if (!Array.isArray(d[key])) invalid(key);
  return d[key];
}
function stringList(d: any, key: string) {
  for (const value of list(d, key)) if (typeof value !== "string") invalid(key);
}
function report(d: any, scoreKey: string) {
  object(d, "report");
  score(d[scoreKey], 100, scoreKey);
  if (typeof d.criticalAssessment !== "string" || !d.criticalAssessment.trim()) invalid("criticalAssessment");
  strings(d, ["slopLabel", "slopSummary", "criticalAssessment"]);
}
function stat(d: any, field: string) {
  object(d, field);
  score(d.score, 10, field + ".score");
  strings(d, ["level", "notes"]);
}
const moduleStrings = ["datingProfile", "shoppingList", "topSongs", "demise", "psychoanalysis", "emotionalRegisters"];
function analysis(d: any) {
  report(d, "overallSlopScore");
  object(d.coreAnalysis, "coreAnalysis");
  for (const key of ["originality", "negativeSpace", "cohesion", "tropeUsage", "creatorCraft"]) stat(d.coreAnalysis[key], key);
  strings(d, ["quippySellSummary", "doesBest", "doesWorst", "firstMessageSynergy", "hiddenDynamic", "creatorNotesBlurb", "datingProfile", "psychoanalysis"]);
  if (d.profileVoice != null) strings(object(d.profileVoice, "profileVoice"), ["format", "evaluation"]);
  if (d.exampleDialogue != null) {
    object(d.exampleDialogue, "exampleDialogue");
    if (typeof d.exampleDialogue.present !== "boolean") invalid("exampleDialogue.present");
    strings(d.exampleDialogue, ["evaluation"]);
  }
  for (const observation of list(d, "observations")) strings(object(observation, "observation"), ["emoji", "text"]);
  if (d.visualComparison != null) {
    object(d.visualComparison, "visualComparison");
    score(d.visualComparison.accuracyScore, 100, "accuracyScore");
    stringList(d.visualComparison, "matches");
    stringList(d.visualComparison, "mismatches");
    strings(d.visualComparison, ["gradeNotes"]);
  }
  if (d.shoppingList != null) {
    object(d.shoppingList, "shoppingList");
    stringList(d.shoppingList, "items");
    strings(d.shoppingList, ["notes"]);
  }
  for (const song of list(d, "topSongs")) strings(object(song, "song"), ["title", "artist", "vibe"]);
  if (d.demise != null) strings(object(d.demise, "demise"), ["howTheyDie", "obituary"]);
  if (d.emotionalRegisters != null) strings(object(d.emotionalRegisters, "emotionalRegisters"), ["sad", "angry", "happy", "grief", "comedy"]);
  return d;
}
export function normalizeResult(endpoint: "analyze" | "compare" | "group" | "multichar", d: any): any {
  object(d, "report");
  if (endpoint === "analyze") return analysis(d);
  if (endpoint === "compare") {
    analysis(d.original);
    analysis(d.remake);
    const comparison = object(d.comparison, "comparison");
    strings(comparison, ["overallVerdict", "summaryOfChanges"]);
    stringList(comparison, "whatImproved");
    stringList(comparison, "whatRegressed");
    object(comparison.verdictScorecard, "verdictScorecard");
    for (const key of ["originalScore", "remakeScore"]) score(comparison.verdictScorecard[key], 10, key);
  } else if (endpoint === "group") {
    report(d, "groupSlopScore");
    const synergy = object(d.synergyAnalysis, "synergyAnalysis");
    strings(synergy, ["overallCompatibility", "roleplayPotential", "tokenBloatWarning"]);
    stringList(synergy, "redundancyWarnings");
    const characters = list(d, "characterBreakdowns");
    if (!characters.length) invalid("characterBreakdowns");
    for (const char of characters) strings(object(char, "character"), ["name", "archetype", "groupRole", "potentialConflicts", ...moduleStrings]);
    strings(object(d.groupScenarios, "groupScenarios"), ["roadTrip", "bankHeist"]);
  } else {
    report(d, "overallSlopScore");
    const world = object(d.worldAndSystemAnalysis, "worldAndSystemAnalysis");
    stat(world.worldBuilding, "worldBuilding");
    stat(world.systemRulesAdherence, "systemRulesAdherence");
    strings(world, ["lorebookIntegration"]);
    for (const char of list(d, "characterAssessments")) {
      object(char, "character");
      score(char.depthScore, 10, "depthScore");
      strings(char, ["name", "archetype", "synergyWithWorld", "criticalNotes", ...moduleStrings]);
    }
    strings(d, ["groupCohesion"]);
    strings(object(d.playScenarios, "playScenarios"), ["rpgEncounter", "campFireChat"]);
  }
  return d;
}
