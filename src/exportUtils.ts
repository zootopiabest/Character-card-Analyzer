import { AnalysisResult, ComparisonResult, GroupResult, MultiCharResult } from "./types";

// The AI occasionally omits a field; guard every nested access so a slightly
// off response can never break the export buttons.
function statLine(label: string, s?: { score?: number; level?: string; notes?: string }): string {
  return `- **${label}**: ${s?.score ?? "?"}/10 (${s?.level ?? "N/A"}) - ${s?.notes ?? ""}\n`;
}

// Compact per-character immersion-module lines (group + multichar rosters).
function characterModuleLines(c: {
  datingProfile?: string | null;
  shoppingList?: string | null;
  topSongs?: string | null;
  demise?: string | null;
  psychoanalysis?: string | null;
  emotionalRegisters?: string | null;
}): string {
  let md = "";
  if (c.datingProfile) md += `- **Dating Profile**: ${c.datingProfile}\n`;
  if (c.shoppingList) md += `- **Against-Type Shopping**: ${c.shoppingList}\n`;
  if (c.topSongs) md += `- **On Repeat**: ${c.topSongs}\n`;
  if (c.demise) md += `- **Demise & Obituary**: ${c.demise}\n`;
  if (c.psychoanalysis) md += `- **Psychoanalysis**: ${c.psychoanalysis}\n`;
  if (c.emotionalRegisters) md += `- **Emotional Registers**: ${c.emotionalRegisters}\n`;
  return md;
}

export function generateAuditMarkdown(data: AnalysisResult, characterName: string = "Character"): string {
  let md = `# Audit Report: ${characterName}\n\n`;

  md += `## Scores\n`;
  md += `- **Slop Score**: ${data.overallSlopScore}/100 (${data.slopLabel})\n`;
  md += `- **Verdict**: ${data.slopSummary}\n\n`;

  md += `## Core Analysis\n`;
  md += statLine("Creator Craft", data.coreAnalysis?.creatorCraft);
  md += statLine("Originality", data.coreAnalysis?.originality);
  md += statLine("Negative Space", data.coreAnalysis?.negativeSpace);
  md += statLine("Cohesion", data.coreAnalysis?.cohesion);
  md += statLine("Trope Usage", data.coreAnalysis?.tropeUsage);
  md += `\n`;

  md += `## Critical Assessment\n${data.criticalAssessment}\n\n`;
  md += `## Quippy Summary\n*${data.quippySellSummary}*\n\n`;

  if (data.profileVoice) {
    md += `## Profile Voice\n`;
    md += `- **Format**: ${data.profileVoice.format}\n`;
    md += `- **Evaluation**: ${data.profileVoice.evaluation}\n\n`;
  }

  if (data.exampleDialogue) {
    md += `## Example Dialogue\n`;
    md += `- **Present**: ${data.exampleDialogue.present ? "Yes" : "No"}\n`;
    md += `- **Evaluation**: ${data.exampleDialogue.evaluation}\n\n`;
  }

  md += `## Behavioral Observations\n`;
  md += `- **Does Best**: ${data.doesBest}\n`;
  md += `- **Does Worst**: ${data.doesWorst}\n`;
  md += `- **First Message Synergy**: ${data.firstMessageSynergy}\n`;
  md += `- **Hidden Dynamic**: ${data.hiddenDynamic}\n\n`;

  // Optional immersion modules — only whatever the user enabled for this run.
  let modulesMd = "";
  if (data.datingProfile) {
    modulesMd += `- **Dating Profile**: ${data.datingProfile}\n`;
  }
  if (data.shoppingList && data.shoppingList.items?.length) {
    modulesMd += `- **Against-Type Shopping List**:\n`;
    data.shoppingList.items.forEach(item => {
      modulesMd += `  - ${item}\n`;
    });
    if (data.shoppingList.notes) modulesMd += `  - *${data.shoppingList.notes}*\n`;
  }
  if (data.topSongs && data.topSongs.length) {
    modulesMd += `- **Top Songs**:\n`;
    data.topSongs.forEach((song, i) => {
      modulesMd += `  ${i + 1}. *${song.title}* — ${song.artist}${song.vibe ? ` (${song.vibe})` : ""}\n`;
    });
  }
  if (data.demise) {
    if (data.demise.howTheyDie) modulesMd += `- **How They Die**: ${data.demise.howTheyDie}\n`;
    if (data.demise.obituary) modulesMd += `- **Obituary**: ${data.demise.obituary}\n`;
  }
  if (data.psychoanalysis) {
    modulesMd += `- **Psychoanalysis**: ${data.psychoanalysis}\n`;
  }
  if (data.emotionalRegisters) {
    const er = data.emotionalRegisters;
    modulesMd += `- **Emotional Registers**:\n`;
    if (er.sad) modulesMd += `  - Sad: ${er.sad}\n`;
    if (er.angry) modulesMd += `  - Angry: ${er.angry}\n`;
    if (er.happy) modulesMd += `  - Happy: ${er.happy}\n`;
    if (er.grief) modulesMd += `  - Grief: ${er.grief}\n`;
    if (er.comedy) modulesMd += `  - Comedy: ${er.comedy}\n`;
  }
  if (modulesMd) {
    md += `## Immersion Modules\n${modulesMd}\n`;
  }

  if (data.observations && data.observations.length > 0) {
    md += `## Quirky Observations\n`;
    data.observations.forEach(o => {
      md += `- ${o.emoji} ${o.text}\n`;
    });
    md += `\n`;
  }

  if (data.visualComparison) {
    md += `## Visual Match\n`;
    md += `- **Accuracy Score**: ${data.visualComparison.accuracyScore}/100\n`;
    md += `- **Notes**: ${data.visualComparison.gradeNotes}\n\n`;
  }

  return md;
}

export function generateComparisonMarkdown(data: ComparisonResult): string {
  let md = `# Comparison Report\n\n`;

  md += `## Overall Verdict\n`;
  md += `${data.comparison.overallVerdict}\n\n`;
  md += `### Scorecard\n`;
  md += `- **Original Verdict Score**: ${data.comparison.verdictScorecard?.originalScore ?? "?"}/10\n`;
  md += `- **Remake Verdict Score**: ${data.comparison.verdictScorecard?.remakeScore ?? "?"}/10\n\n`;
  md += `### Summary of Changes\n`;
  md += `${data.comparison.summaryOfChanges}\n\n`;

  md += `## Breakdown\n`;
  md += `### What Improved\n`;
  data.comparison.whatImproved.forEach(i => md += `- ${i}\n`);
  md += `\n### What Regressed\n`;
  data.comparison.whatRegressed.forEach(r => md += `- ${r}\n`);
  md += `\n`;

  md += `---\n\n`;
  md += `## Original Character Audit\n\n`;
  md += generateAuditMarkdown(data.original, "Original Version");
  
  md += `---\n\n`;
  md += `## Remake Character Audit\n\n`;
  md += generateAuditMarkdown(data.remake, "Remake Version");

  return md;
}

export function generateGroupMarkdown(data: GroupResult): string {
  let md = `# Group Synergy Report\n\n`;

  md += `## Overall Group Slop\n`;
  md += `- **Score**: ${data.groupSlopScore}/100 (${data.slopLabel})\n`;
  md += `- **Verdict**: ${data.slopSummary}\n\n`;

  md += `## Synergy Analysis\n`;
  md += `- **Compatibility**: ${data.synergyAnalysis.overallCompatibility}\n`;
  md += `- **Roleplay Potential**: ${data.synergyAnalysis.roleplayPotential}\n`;
  if (data.synergyAnalysis.tokenBloatWarning) {
    md += `- **Token Bloat Warning**: ${data.synergyAnalysis.tokenBloatWarning}\n`;
  }
  if (data.synergyAnalysis.redundancyWarnings.length > 0) {
    md += `- **Redundancy Warnings**:\n`;
    data.synergyAnalysis.redundancyWarnings.forEach(w => md += `  - ${w}\n`);
  }
  md += `\n`;

  md += `## Roster Breakdown\n`;
  data.characterBreakdowns.forEach(c => {
    md += `### ${c.name} (${c.archetype})\n`;
    md += `- **Group Role**: ${c.groupRole}\n`;
    md += `- **Friction Points**: ${c.potentialConflicts}\n`;
    md += characterModuleLines(c);
    md += `\n`;
  });

  md += `## Dynamic Scenarios\n`;
  md += `### Road Trip\n${data.groupScenarios.roadTrip}\n\n`;
  md += `### Bank Heist\n${data.groupScenarios.bankHeist}\n\n`;

  md += `## Terminal Assessment\n${data.criticalAssessment}\n\n`;

  return md;
}

export function generateMultiCharMarkdown(data: MultiCharResult, characterName: string = "Multi-Character File"): string {
  let md = `# Multi-Char / RPG Report: ${characterName}\n\n`;

  md += `## Overall Group Slop\n`;
  md += `- **Score**: ${data.overallSlopScore}/100 (${data.slopLabel})\n`;
  md += `- **Verdict**: ${data.slopSummary}\n\n`;

  md += `## World & System\n`;
  md += `- **World Building Score**: ${data.worldAndSystemAnalysis?.worldBuilding?.score ?? "?"}/10\n`;
  md += `- **World Building Notes**: ${data.worldAndSystemAnalysis?.worldBuilding?.notes ?? ""}\n`;
  md += `- **System Rules Score**: ${data.worldAndSystemAnalysis?.systemRulesAdherence?.score ?? "?"}/10\n`;
  md += `- **System Rules Notes**: ${data.worldAndSystemAnalysis?.systemRulesAdherence?.notes ?? ""}\n`;
  md += `- **Lorebook Integration**: ${data.worldAndSystemAnalysis?.lorebookIntegration ?? ""}\n\n`;

  md += `## Character Assessments\n`;
  data.characterAssessments.forEach(c => {
    md += `### ${c.name} (${c.archetype})\n`;
    md += `- **Depth Score**: ${c.depthScore}/10\n`;
    md += `- **Synergy With World**: ${c.synergyWithWorld}\n`;
    md += `- **Critical Notes**: ${c.criticalNotes}\n`;
    md += characterModuleLines(c);
    md += `\n`;
  });

  md += `## Group Cohesion\n${data.groupCohesion}\n\n`;
  
  md += `## Dynamic Scenarios\n`;
  md += `### RPG Encounter\n${data.playScenarios.rpgEncounter}\n\n`;
  md += `### Campfire Chat\n${data.playScenarios.campFireChat}\n\n`;

  md += `## Terminal Assessment\n${data.criticalAssessment}\n\n`;

  return md;
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
