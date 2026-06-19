import { AnalysisResult, ComparisonResult, GroupResult, MultiCharResult } from "./types";

export function generateAuditMarkdown(data: AnalysisResult, characterName: string = "Character"): string {
  let md = `# Audit Report: ${characterName}\n\n`;

  md += `## Scores\n`;
  md += `- **Slop Score**: ${data.overallSlopScore}/100 (${data.slopLabel})\n`;
  md += `- **Verdict**: ${data.slopSummary}\n\n`;

  md += `## Core Analysis\n`;
  md += `- **Creator Craft**: ${data.coreAnalysis.creatorCraft.score}/10 (${data.coreAnalysis.creatorCraft.level}) - ${data.coreAnalysis.creatorCraft.notes}\n`;
  md += `- **Originality**: ${data.coreAnalysis.originality.score}/10 (${data.coreAnalysis.originality.level}) - ${data.coreAnalysis.originality.notes}\n`;
  md += `- **Negative Space**: ${data.coreAnalysis.negativeSpace.score}/10 (${data.coreAnalysis.negativeSpace.level}) - ${data.coreAnalysis.negativeSpace.notes}\n`;
  md += `- **Cohesion**: ${data.coreAnalysis.cohesion.score}/10 (${data.coreAnalysis.cohesion.level}) - ${data.coreAnalysis.cohesion.notes}\n`;
  md += `- **Trope Usage**: ${data.coreAnalysis.tropeUsage.score}/10 (${data.coreAnalysis.tropeUsage.level}) - ${data.coreAnalysis.tropeUsage.notes}\n\n`;

  md += `## Critical Assessment\n${data.criticalAssessment}\n\n`;
  md += `## Quippy Summary\n*${data.quippySellSummary}*\n\n`;

  md += `## Profile Voice\n`;
  md += `- **Format**: ${data.profileVoice.format}\n`;
  md += `- **Evaluation**: ${data.profileVoice.evaluation}\n\n`;

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

  md += `## Roleplay Scenarios\n`;
  md += `- **Dating Profile**: ${data.datingProfile}\n`;
  md += `- **Walmart Run**: ${data.walmartRun}\n\n`;

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
  md += `- **Original Slop Score**: ${data.comparison.verdictScorecard.originalScore}/10\n`;
  md += `- **Remake Slop Score**: ${data.comparison.verdictScorecard.remakeScore}/10\n\n`;
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
    md += `- **Friction Points**: ${c.potentialConflicts}\n\n`;
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
  md += `- **World Building Score**: ${data.worldAndSystemAnalysis.worldBuilding.score}/10\n`;
  md += `- **World Building Notes**: ${data.worldAndSystemAnalysis.worldBuilding.notes}\n`;
  md += `- **System Rules Score**: ${data.worldAndSystemAnalysis.systemRulesAdherence.score}/10\n`;
  md += `- **System Rules Notes**: ${data.worldAndSystemAnalysis.systemRulesAdherence.notes}\n`;
  md += `- **Lorebook Integration**: ${data.worldAndSystemAnalysis.lorebookIntegration}\n\n`;

  md += `## Character Assessments\n`;
  data.characterAssessments.forEach(c => {
    md += `### ${c.name} (${c.archetype})\n`;
    md += `- **Depth Score**: ${c.depthScore}/10\n`;
    md += `- **Synergy With World**: ${c.synergyWithWorld}\n`;
    md += `- **Critical Notes**: ${c.criticalNotes}\n\n`;
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
