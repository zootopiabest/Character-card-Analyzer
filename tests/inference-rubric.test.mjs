import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt } from '../src/systemInstructions.ts';

const modes = ['analyze', 'compare', 'premise', 'group', 'multichar'];

test('all assembled prompts deliver the same inference and scenario-role standards once', () => {
  let expectedInference;
  let expectedFreedom;
  for (const mode of modes) for (const efficient of [false, true]) {
    const prompt = buildPrompt(mode, ['greetingBreakdown'], efficient);
    const context = `${mode}, efficient=${efficient}`;
    const inference = prompt.match(/INFERENCE, GUARDRAILS, AND EXPLANATORY PADDING:\n[\s\S]*?preferred card length\./g);
    const freedom = prompt.match(/ANYPOV AND SCENARIO ROLES:\n[\s\S]*?regardless of tags\./g);
    assert.equal(inference?.length, 1, context);
    assert.equal(freedom?.length, 1, context);
    expectedInference ??= inference[0];
    expectedFreedom ??= freedom[0];
    assert.equal(inference[0], expectedInference, context);
    assert.equal(freedom[0], expectedFreedom, context);

    for (const requirement of [
      /a goth likes sweet coffee; a badass loves rainbows/,
      /psychological justification.*not prerequisites/,
      /an absent guardrail is never a defect/,
      /independently of whether anything else is underexplained/,
      /constrain emergent reactions without prescribing a plot/,
      /penalize that over-narration, not interiority/,
      /credit equally useful explicit and inferable characterization equally/,
      /Length and brevity alone earn neither credit nor penalty/,
      /Client, transfer student, coworker, friend, or partner are valid scenario premises even on an AnyPOV-tagged card/,
      /expecting or inviting the user to follow is not narration that the user follows/,
    ]) assert.match(prompt, requirement, context);

    // These old instructions provided the exemptions/contradictions observed
    // in comparison reports. Do not silently reintroduce them in another mode.
    for (const obsolete of [
      /as load-bearing spec, not bloat/,
      /as load-bearing rather than bloat/,
      /overexplaining obvious traits while underexplaining/,
      /strategic redundancy .* is not bloat/,
      /Strategic anti-hallucination redundancy is valid/,
      /Penalize cards that claim AnyPOV but force/,
      /Penalize forced gender, body, relationship, sexual dynamic, or physical presence harshly/,
      /forcing (the user into a role or reaction the card did not advertise|an unadvertised user role or reaction)/,
    ]) assert.doesNotMatch(prompt, obsolete, context);
  }
});

// These are delivery/consistency checks, not claims that an LLM will comply
// or that either uploaded card must receive a particular score.
