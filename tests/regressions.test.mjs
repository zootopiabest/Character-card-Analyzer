import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { existsSync } from 'node:fs';
import { selectLatestModel, OPENROUTER_MODELS, migrateModel, DEFAULT_OPENROUTER_MODEL } from '../src/data/models.ts';
import { readProviderSettings } from '../src/providerSettings.ts';
import { normalizeResult } from '../src/resultValidation.ts';
import { tryExtractCharaMetadata } from '../src/utils.ts';
import { runAnalyze, runCompare, runGroup, runMultichar, fetchDeepSeekModels } from '../src/aiClient.ts';
import { buildPrompt } from '../src/systemInstructions.ts';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const params = { description: 'Test character', imageBase64: null, imageMimeType: null, analyzerNotes: null };
const cfg = { provider: 'openrouter', model: 'google/gemini-2.5-pro', apiKey: 'FAKE_TEST_KEY' };
const good = () => ({ overallSlopScore: 12, criticalAssessment: 'Coherent characterization.', coreAnalysis: Object.fromEntries(['originality','negativeSpace','cohesion','tropeUsage','creatorCraft'].map(key => [key, {score:8,level:'Strong',notes:'Supported.'}])) });
const chat = (content, extra={}) => ({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content},...extra}]})});

// No paid calls: every generation request is replaced with a deterministic response.
test('empty, missing, out-of-range, and malformed report fields are rejected', () => {
  for (const value of [{}, null, [], {...good(), coreAnalysis:{}}, {...good(), overallSlopScore:110}, {...good(), observations:[null]}, {...good(), datingProfile:{}}, {...good(), topSongs:[null]}]) {
    assert.throws(() => normalizeResult('analyze', value), /invalid report/);
  }
  assert.equal(normalizeResult('analyze', good()).coreAnalysis.originality.score, 8);
});
test('refusal, empty output, and token exhaustion never become reports', async () => {
  for (const [content, extra, expected] of [[null,{message:{content:null,refusal:'Declined'}},/declined/], ['',{},/empty answer/], ['{}',{finish_reason:'length'},/output-token limit/], ['{}',{},/invalid report/]]) {
    globalThis.fetch = async () => chat(content,extra);
    await assert.rejects(runAnalyze(params,cfg),expected);
  }
});
test('main carries no age gate or content refusal rule', () => {
  for (const endpoint of ['analyze','compare','group','multichar']) for (const efficient of [false, true]) assert.doesNotMatch(buildPrompt(endpoint,[],efficient),/MANDATORY SAFETY REFUSAL/);
  assert.equal(existsSync(new URL('../src/components/AgeGate.tsx', import.meta.url)), false);
});
test('token-efficient grading sends a much smaller prompt with the same schema, modules, and standards', async () => {
  for (const endpoint of ['analyze','compare','group','multichar']) {
    const full = buildPrompt(endpoint, ['boringTuesday','pissThemOff']);
    const lean = buildPrompt(endpoint, ['boringTuesday','pissThemOff'], true);
    assert.ok(lean.length < full.length * 0.7, `${endpoint}: ${lean.length} vs ${full.length}`);
    for (const prompt of [full, lean]) for (const marker of [/JSON SCHEMA/, /boringTuesday/, /pissThemOff/, /GREETING EVALUATION/, /CRAFT SPOTLIGHT/, /HIGHER IS WORSE/, /mutually exclusive starting points/i]) assert.match(prompt, marker);
  }
  let body;
  globalThis.fetch = async (_url, options) => { body = JSON.parse(options.body); return chat(JSON.stringify(good())); };
  await runAnalyze(params, cfg);
  const fullLength = body.messages[0].content.length;
  await runAnalyze(params, {...cfg, efficientGrading: true});
  assert.ok(body.messages[0].content.length < fullLength * 0.7);
});
test('both rubrics refuse credit for species-default ear/tail behavior', () => {
  // Every LLM plays ears/tails as mood displays unprompted, so a card that
  // states the obvious mapping must not be praised for it. Full and
  // efficient must carry the same standard.
  for (const endpoint of ['analyze','compare','group','multichar']) for (const efficient of [false, true]) {
    const prompt = buildPrompt(endpoint, [], efficient);
    for (const marker of [/Species-default BEHAVIOR/, /prehensile/, /Judge the override, never the appendage/, /species-default display/]) {
      assert.match(prompt, marker, `${endpoint} efficient=${efficient}`);
    }
  }
});
test('Boring Tuesday and Piss Them Off module shapes validate', () => {
  const result = normalizeResult('analyze', {...good(), boringTuesday:{inconvenience:'Rain on laundry day',beat:'Shrugs, moves the line inside.'}, pissThemOff:{trivial:'a',personal:'b',denied:'Not established.'}});
  assert.equal(result.pissThemOff.denied, 'Not established.');
  for (const bad of [{...good(), boringTuesday:'nope'}, {...good(), pissThemOff:{trivial:1}}]) assert.throws(() => normalizeResult('analyze', bad), /invalid report/);
  assert.equal(normalizeResult('group', {groupSlopScore:5,criticalAssessment:'Fine.',synergyAnalysis:{},characterBreakdowns:[{name:'A',boringTuesday:'Shrugs.',pissThemOff:'Nothing.'}],groupScenarios:{}}).characterBreakdowns[0].pissThemOff, 'Nothing.');
});
test('custom endpoints fail closed and normalize trailing slashes', async () => {
  const calls=[];
  globalThis.fetch=async (url,options)=>{calls.push({url,options});return chat(JSON.stringify(good()));};
  for(const customBaseUrl of ['', 'not-a-url','https://user:password@example.test/v1','https://example.test/v1?key=x']) {
    await assert.rejects(runAnalyze(params,{...cfg,provider:'custom',customBaseUrl}));
  }
  assert.equal(calls.length,0);
  await runAnalyze(params,{...cfg,provider:'custom',customBaseUrl:'https://example.test/v1/chat/completions/'});
  assert.equal(calls[0].url,'https://example.test/v1/chat/completions');
});
test('latest resolution excludes specialized variants and compares versions numerically', () => {
  const entries = [
    {id:'google/gemini-3.8-flash',created:20}, {id:'google/gemini-3.10-flash',created:21},
    {id:'google/gemini-3.10-flash-preview',created:22}, {id:'google/gemini-4-flash-lite',created:30},
    {id:'google/gemini-5-flash-image',created:40}, {id:'google/gemini-5-flash:batch',created:50},
    {id:'deepseek/deepseek-v4-pro',created:10}, {id:'deepseek/deepseek-v4-pro-0813',created:20},
    {id:'deepseek/deepseek-v4-flash-vision-exp',created:50},
  ];
  assert.equal(selectLatestModel('~google/gemini-flash-latest',entries).id,'google/gemini-3.10-flash');
  assert.equal(selectLatestModel('latest:deepseek-pro',entries).id,'deepseek/deepseek-v4-pro-0813');
  assert.throws(()=>selectLatestModel('~anthropic/claude-opus-latest',entries),/no matching release/);
  assert.equal(OPENROUTER_MODELS.length,9);
  assert.equal(migrateModel('openrouter','anthropic/claude-4.6-opus'),'anthropic/claude-opus-4.6');
});
test('old capitalized OpenRouter model strings (pre-alias-overhaul) still migrate onto a dropdown entry',()=>{
  // These are the literal pre-overhaul list values; a returning user's
  // localStorage could hold any of them. Every one must resolve to a
  // current OPENROUTER_MODELS id so the dropdown shows instead of silently
  // falling back to manual entry.
  const cases = {
    'Anthropic/Claude-4.6-opus':'anthropic/claude-opus-4.6',
    'Anthropic/Claude-4.6-sonnet':'~anthropic/claude-sonnet-latest',
    'Anthropic/Claude-4.8-opus':'~anthropic/claude-opus-latest',
    'Deepseek/deepseek-v4-flash':'~deepseek/deepseek-v4-flash-latest',
    'Deepseek/deepseek-v4-pro':'latest:deepseek-pro',
    'Google/gemma-4-31b-it':DEFAULT_OPENROUTER_MODEL,
    'Google/Gemini-3.1-flash-lite':DEFAULT_OPENROUTER_MODEL,
    'Google/Gemini-3.1-pro-preview':'google/gemini-3.1-pro-preview',
    'Google/Gemini-3.5-flash':DEFAULT_OPENROUTER_MODEL,
  };
  for (const [legacy, expected] of Object.entries(cases)) {
    const migrated = migrateModel('openrouter', legacy);
    assert.equal(migrated, expected, `${legacy} -> ${migrated}, expected ${expected}`);
    assert.ok(OPENROUTER_MODELS.some(m => m.id === migrated), `${migrated} must be a real dropdown entry`);
  }
});
test('latest is resolved before generation, preserves pinned IDs, and respects output ceiling', async () => {
  const calls=[];
  globalThis.fetch=async (url,options)=>{
    calls.push({url,options});
    return url.endsWith('/models') ? {ok:true,json:async()=>({data:[{id:'deepseek/deepseek-v4-pro-0813',top_provider:{max_completion_tokens:32768}}]})} : chat(JSON.stringify(good()));
  };
  const result=await runAnalyze(params,{...cfg,model:'latest:deepseek-pro',maxOutputTokens:65536});
  assert.equal(calls.length,2);
  assert.equal(calls[0].options.headers,undefined);
  const body=JSON.parse(calls[1].options.body);
  assert.equal(body.model,'deepseek/deepseek-v4-pro-0813');
  assert.equal(body.max_tokens,32768);
  assert.equal(result.requestModel,body.model);
  calls.length=0;
  await runAnalyze(params,cfg);
  assert.equal(calls.length,1);
  assert.equal(JSON.parse(calls[0].options.body).model,cfg.model);
});
test('catalog failure sends no generation request',async()=>{
  let count=0; globalThis.fetch=async()=>{count++;throw new Error('Offline');};
  await assert.rejects(runAnalyze(params,{...cfg,model:'latest:deepseek-pro'}),/no analysis request was sent/);
  assert.equal(count,1);
});
test('Gemini thinking levels and 2.5 budgets differ; thoughts are not parsed as the answer',async()=>{
  const requests=[];
  globalThis.fetch=async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'Internal thought'},{text:JSON.stringify(good())}]}}]})}};
  for(const reasoningEffort of ['low','medium','high']) await runAnalyze(params,{...cfg,provider:'gemini',model:'gemini-3.8-flash',thinkingMode:true,reasoningEffort});
  assert.deepEqual(requests.map(r=>r.generationConfig.thinkingConfig.thinkingLevel),['low','medium','high']);
  requests.length=0;
  for(const reasoningEffort of ['low','medium','high']) await runAnalyze(params,{...cfg,provider:'gemini',model:'gemini-2.5-pro',thinkingMode:true,reasoningEffort,maxOutputTokens:32768});
  assert.deepEqual(requests.map(r=>r.generationConfig.thinkingConfig.thinkingBudget),[1024,8192,16384]);
});
test('Gemini blocked and truncated responses are errors',async()=>{
  for(const response of [{promptFeedback:{blockReason:'SAFETY'}},{candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{}'}]}}]},{}]){
    globalThis.fetch=async()=>({ok:true,json:async()=>response});
    await assert.rejects(runAnalyze(params,{...cfg,provider:'gemini',model:'gemini-3.8-flash'}));
  }
});
test('provider keys migrate once and remain isolated across switches',()=>{
  const values=new Map([['loresieve_selected_provider','openrouter'],['loresieve_custom_api_key','FAKE_ROUTER_KEY'],['loresieve_selected_model','google/gemini-3.5-flash']]);
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  assert.equal(readProviderSettings(storage,'openrouter').apiKey,'FAKE_ROUTER_KEY');
  assert.equal(readProviderSettings(storage,'gemini').apiKey,'');
  values.set('loresieve_gemini_api_key','FAKE_GOOGLE_KEY');
  values.set('loresieve_selected_provider','gemini');
  assert.equal(readProviderSettings(storage,'openrouter').apiKey,'FAKE_ROUTER_KEY');
  assert.equal(readProviderSettings(storage,'gemini').apiKey,'FAKE_GOOGLE_KEY');
  assert.equal(values.has('loresieve_custom_api_key'),false);
});
test('a blank saved model falls back to the provider default instead of sticking',()=>{
  // An empty stored model is a cleared field, not a choice. Keeping it (as
  // `??` did) pinned the UI to manual entry with no way back to the dropdown.
  for(const blank of ['','   ']){
    const values=new Map([['loresieve_selected_provider','openrouter'],['loresieve_openrouter_model',blank]]);
    const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
    assert.equal(readProviderSettings(storage,'openrouter').model,DEFAULT_OPENROUTER_MODEL);
    // and the repaired value is written back, so it self-heals permanently
    assert.equal(values.get('loresieve_openrouter_model'),DEFAULT_OPENROUTER_MODEL);
  }
  const blankLegacy=new Map([['loresieve_selected_provider','openrouter'],['loresieve_selected_model','']]);
  const storage={getItem:k=>blankLegacy.get(k)??null,setItem:(k,v)=>blankLegacy.set(k,v),removeItem:k=>blankLegacy.delete(k)};
  assert.equal(readProviderSettings(storage,'openrouter').model,DEFAULT_OPENROUTER_MODEL);
  // a real saved pick is still honoured, and custom stays free-form
  const kept=new Map([['loresieve_openrouter_model','anthropic/claude-opus-4.6']]);
  const keptStorage={getItem:k=>kept.get(k)??null,setItem:(k,v)=>kept.set(k,v),removeItem:k=>kept.delete(k)};
  assert.equal(readProviderSettings(keptStorage,'openrouter').model,'anthropic/claude-opus-4.6');
  const customValues=new Map();
  const customStorage={getItem:k=>customValues.get(k)??null,setItem:(k,v)=>customValues.set(k,v),removeItem:k=>customValues.delete(k)};
  assert.equal(readProviderSettings(customStorage,'custom').model,'');
});
function chunk(type,data){const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);out.write(type,4);data.copy(out,8);return out;}
function png(chunks){const value=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),...chunks,chunk('IEND',Buffer.alloc(0))]);return value.buffer.slice(value.byteOffset,value.byteOffset+value.length);}
const metadata=Buffer.from(JSON.stringify({data:{name:'岳悦',description:'A complete character description.'}})).toString('base64');
test('PNG tEXt, uncompressed/compressed iTXt and zTXt preserve Unicode cards',async()=>{
  for(const entry of [chunk('tEXt',Buffer.from('chara\0'+metadata)),chunk('iTXt',Buffer.from('chara\0\0\0en\0Character\0'+metadata)),chunk('iTXt',Buffer.concat([Buffer.from('chara\0\x01\0\0\0'),deflateSync(metadata)])),chunk('zTXt',Buffer.concat([Buffer.from('chara\0\0'),deflateSync(metadata)]))]){
    assert.equal((await tryExtractCharaMetadata(png([entry]))).name,'岳悦');
  }
});
test('PNG v3 metadata takes precedence and malformed chunk lengths fail cleanly',async()=>{
  const v3=Buffer.from(JSON.stringify({data:{name:'Version three',description:'New'}})).toString('base64');
  assert.equal((await tryExtractCharaMetadata(png([chunk('tEXt',Buffer.from('chara\0'+metadata)),chunk('tEXt',Buffer.from('ccv3\0'+v3))]))).name,'Version three');
  const malformed=png([chunk('tEXt',Buffer.from('chara\0'+metadata))]);new DataView(malformed).setUint32(8,0x7fffffff);
  await assert.rejects(tryExtractCharaMetadata(malformed),/truncated/);
});
test('all four runners accept a complete report',async()=>{
  const comparison={original:good(),remake:good(),comparison:{verdictScorecard:{originalScore:8,remakeScore:8}}};
  const group={groupSlopScore:5,criticalAssessment:'Compatible.',synergyAnalysis:{},characterBreakdowns:[{name:'A'}],groupScenarios:{}};
  const multichar={overallSlopScore:5,criticalAssessment:'Coherent world.',worldAndSystemAnalysis:{worldBuilding:{score:8},systemRulesAdherence:{score:8}},characterAssessments:[],playScenarios:{}};
  for(const [response,run] of [[good(),()=>runAnalyze(params,cfg)],[comparison,()=>runCompare({originalDescription:'A',remakeDescription:'B'},cfg)],[group,()=>runGroup({characters:[{name:'A',description:'A'}]},cfg)],[multichar,()=>runMultichar({description:'World'},cfg)]]){
    globalThis.fetch=async()=>chat(JSON.stringify(response));
    assert.equal((await run()).requestModel,cfg.model);
  }
});

test('native latest aliases pass through unchanged and show the actual response model', async () => {
  const calls=[];
  globalThis.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({model:'google/gemini-3.8-flash',choices:[{finish_reason:'stop',message:{content:JSON.stringify(good())}}]})};};
  const result=await runAnalyze(params,{...cfg,model:'~google/gemini-flash-latest'});
  assert.equal(calls.length,1);
  assert.equal(JSON.parse(calls[0].options.body).model,'~google/gemini-flash-latest');
  assert.equal(result.requestModel,'google/gemini-3.8-flash');
});

test('OpenRouter receives reasoning settings and the chosen report limit',async()=>{
  let body;
  globalThis.fetch=async(url,options)=>{body=JSON.parse(options.body);return chat(JSON.stringify(good()));};
  await runAnalyze(params,{...cfg,thinkingMode:true,reasoningEffort:'high',maxOutputTokens:65536});
  assert.deepEqual(body.reasoning,{effort:'high',exclude:true});
  assert.equal(body.max_tokens,65536);
  assert.equal(body.reasoning_effort,undefined);
});
test('DeepSeek direct provider posts to api.deepseek.com without OpenAI-only or reasoning params',async()=>{
  const calls=[];
  globalThis.fetch=async(url,options)=>{calls.push({url,options});return chat(JSON.stringify(good()));};
  const result=await runAnalyze(params,{...cfg,provider:'deepseek',model:'',thinkingMode:true,reasoningEffort:'high',maxOutputTokens:8192});
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://api.deepseek.com/chat/completions');
  assert.equal(calls[0].options.headers.Authorization,'Bearer FAKE_TEST_KEY');
  const body=JSON.parse(calls[0].options.body);
  assert.equal(body.model,'deepseek-chat');
  assert.equal(body.response_format,undefined);
  assert.equal(body.reasoning,undefined);
  assert.equal(body.reasoning_effort,undefined);
  assert.equal(body.max_tokens,8192);
  assert.equal(result.requestModel,'deepseek-chat');
  await runAnalyze(params,{...cfg,provider:'deepseek',model:'deepseek/deepseek-reasoner'});
  assert.equal(JSON.parse(calls[1].options.body).model,'deepseek-reasoner');
});
test('DeepSeek model fetch lists IDs and fails cleanly',async()=>{
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'https://api.deepseek.com/models');
    assert.equal(options.headers.Authorization,'Bearer FAKE_TEST_KEY');
    return {ok:true,status:200,json:async()=>({object:'list',data:[{id:'deepseek-chat'},{id:'deepseek-reasoner'},{bogus:true}]})};
  };
  assert.deepEqual(await fetchDeepSeekModels('FAKE_TEST_KEY'),['deepseek-chat','deepseek-reasoner']);
  await assert.rejects(fetchDeepSeekModels('  '),/API key/);
  globalThis.fetch=async()=>({ok:false,status:401,json:async()=>({})});
  await assert.rejects(fetchDeepSeekModels('FAKE_TEST_KEY'),/401/);
  globalThis.fetch=async()=>({ok:true,status:200,json:async()=>({data:[]})});
  await assert.rejects(fetchDeepSeekModels('FAKE_TEST_KEY'),/no models/);
  globalThis.fetch=async()=>{throw new Error('Offline');};
  await assert.rejects(fetchDeepSeekModels('FAKE_TEST_KEY'),/Could not reach DeepSeek/);
});
test('Gemini 2.5 thinking budget leaves space for the report at a smaller output limit',async()=>{
  let config;
  globalThis.fetch=async(url,options)=>{config=JSON.parse(options.body).generationConfig;return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(good())}]}}]})};};
  await runAnalyze(params,{...cfg,provider:'gemini',model:'gemini-2.5-pro',thinkingMode:true,reasoningEffort:'high',maxOutputTokens:8192});
  assert.ok(config.thinkingConfig.thinkingBudget < config.maxOutputTokens);
});

// --- Evidence Verification Pass (optional second call) ---------------------
const verifiable = () => ({
  ...good(),
  doesBest: 'Holds a consistent obsessive register.',
  doesWorst: 'The backpack is stated but never used anywhere.',
  observations: [{ emoji: '🔍', text: 'Detail doing the most work: the bow ritual.' }],
});
// Replies in order: first the report, then the verification patch.
const scripted = (...bodies) => {
  const queue = [...bodies];
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return chat(queue.shift());
  };
  return calls;
};

test('verification is off by default and sends exactly one request', async () => {
  const calls = scripted(JSON.stringify(verifiable()));
  const result = await runAnalyze(params, cfg);
  assert.equal(calls.length, 1);
  assert.equal(result.verification, undefined);
});

test('verification sends a second rubric-free call and patches only the named claim', async () => {
  const calls = scripted(
    JSON.stringify(verifiable()),
    JSON.stringify({ fixes: [{ id: 8, problem: 'The backpack appears in two greetings.', replacement: 'The backpack carries little weight outside its two greeting beats.' }] })
  );
  const result = await runAnalyze(params, { ...cfg, verifyPass: true });
  assert.equal(calls.length, 2);

  const verify = calls[1];
  // The checker grades nothing, so it must not receive the rubric or a schema.
  assert.doesNotMatch(verify.messages[0].content, /JSON SCHEMA|CALIBRATION BASELINE|SLOP DETECTION/);
  assert.match(verify.messages[0].content, /evidence checker/i);
  assert.match(verify.messages[1].content, /CLAIMS TO CHECK/);
  assert.match(verify.messages[1].content, /Test character/);
  // Claim 8 is doesWorst in collection order; the patch must land there only.
  assert.match(verify.messages[1].content, /\[8\] \(doesWorst\)/);
  assert.match(verify.messages[1].content, /\[7\] \(doesBest\)/);
  // The checker re-reads the card, not pass 1's grading imperative.
  assert.doesNotMatch(verify.messages[1].content, /Analyze the following character card/);
  assert.equal(result.doesWorst, 'The backpack carries little weight outside its two greeting beats.');
  assert.equal(result.doesBest, 'Holds a consistent obsessive register.');
  assert.equal(result.observations[0].text, 'Detail doing the most work: the bow ritual.');
  assert.equal(result.verification.status, 'corrected');
  assert.equal(result.verification.corrected, 1);
  assert.equal(result.verification.corrections[0].label, 'doesWorst');
});

test('a clean verification reports every claim supported and changes nothing', async () => {
  scripted(JSON.stringify(verifiable()), JSON.stringify({ fixes: [] }));
  const result = await runAnalyze(params, { ...cfg, verifyPass: true });
  assert.equal(result.verification.status, 'clean');
  assert.equal(result.verification.corrected, 0);
  assert.ok(result.verification.checked > 5);
  assert.equal(result.doesWorst, 'The backpack is stated but never used anywhere.');
});

test('malformed, unknown-id, runaway, and score-bearing patches are dropped, never applied', async () => {
  const patches = [
    { fixes: [{ id: 999, replacement: 'not a real claim' }] },      // id we never sent
    { fixes: [{ id: 8, replacement: '' }] },                        // empty
    { fixes: [{ id: 8, replacement: 42 }] },                        // not a string
    { fixes: [{ id: 8, replacement: 'x'.repeat(5000) }] },          // runaway rewrite
    { fixes: 'nope' },                                              // wrong shape
    {},                                                             // no fixes at all
  ];
  for (const patch of patches) {
    scripted(JSON.stringify(verifiable()), JSON.stringify(patch));
    const result = await runAnalyze(params, { ...cfg, verifyPass: true });
    assert.equal(result.doesWorst, 'The backpack is stated but never used anywhere.', JSON.stringify(patch));
    assert.equal(result.verification.corrected, 0);
    // The pass never touches a number.
    assert.equal(result.overallSlopScore, 12);
    assert.equal(result.coreAnalysis.originality.score, 8);
  }
});

test('a failed verification keeps the report instead of discarding it', async () => {
  for (const second of [() => { throw new Error('network down'); }, () => chat('not json at all'), () => ({ ok: false, status: 429, text: async () => 'rate limited' })]) {
    let call = 0;
    globalThis.fetch = async () => (++call === 1 ? chat(JSON.stringify(verifiable())) : second());
    const result = await runAnalyze(params, { ...cfg, verifyPass: true });
    assert.equal(result.verification.status, 'unavailable');
    assert.equal(result.verification.corrected, 0);
    assert.equal(result.overallSlopScore, 12);
    assert.equal(result.doesWorst, 'The backpack is stated but never used anywhere.');
  }
});

test('verification never spends the full report budget on a patch', async () => {
  const calls = scripted(JSON.stringify(verifiable()), JSON.stringify({ fixes: [] }));
  await runAnalyze(params, { ...cfg, verifyPass: true, maxOutputTokens: 32768 });
  assert.equal(calls[0].max_tokens, 32768);
  assert.ok(calls[1].max_tokens <= 4096, `verify budget ${calls[1].max_tokens}`);
});

test('both rubrics protect specific likes, named works, and stated skill levels', () => {
  for (const endpoint of ['analyze', 'compare', 'group', 'multichar']) for (const efficient of [false, true]) {
    const prompt = buildPrompt(endpoint, [], efficient);
    for (const marker of [/anti-hallucination value/, /name-dropping/, /list padding/, /burnt water/, /bounded specifics/]) {
      assert.match(prompt, marker, `${endpoint} efficient=${efficient}`);
    }
  }
});

// Patch whichever claim carries `label`, whatever index it lands on. The
// lookup is plain string work and every assertion lives outside the mock:
// a throw inside it would be swallowed by run()'s best-effort try/catch.
async function patchClaim(report, label, replacement, invoke) {
  let claims = '';
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    if (!/evidence checker/i.test(body.messages[0].content)) return chat(JSON.stringify(report));
    claims = body.messages[1].content;
    const line = claims.split('\n').find(l => l.includes(`(${label})`));
    const id = line ? Number(line.slice(1, line.indexOf(']'))) : -1;
    return chat(JSON.stringify({ fixes: [{ id, problem: 'Contradicted by the card.', replacement }] }));
  };
  return { out: await invoke(), claims };
}

test('verification reaches nested claims in every mode, and both cards in a comparison', async () => {
  const side = label => ({ ...good(), doesWorst: `${label} never uses its stated props.` });
  const comparison = { original: side('original'), remake: side('remake'), comparison: { overallVerdict: 'Better.', verdictScorecard: { originalScore: 7, remakeScore: 9 } } };
  const group = { groupSlopScore: 5, criticalAssessment: 'Compatible.', synergyAnalysis: { overallCompatibility: 'They never interact.' }, characterBreakdowns: [{ name: 'Nala', archetype: 'Yandere', groupRole: 'Stalker', potentialConflicts: 'None stated.' }], groupScenarios: {} };
  const multichar = { overallSlopScore: 5, criticalAssessment: 'Coherent world.', worldAndSystemAnalysis: { worldBuilding: { score: 8, notes: 'No rules given.' }, systemRulesAdherence: { score: 8 } }, characterAssessments: [{ name: 'Nala', depthScore: 7, criticalNotes: 'Flat.' }], playScenarios: {} };

  // Comparison: only the named side is touched.
  let { out, claims } = await patchClaim(comparison, 'remake.doesWorst', 'The remake uses both props.',
    () => runCompare({ originalDescription: 'A', remakeDescription: 'B' }, { ...cfg, verifyPass: true }));
  assert.ok(claims.includes('(remake.doesWorst)'), 'remake.doesWorst was never offered');
  assert.ok(claims.includes('(original.doesWorst)'), 'original.doesWorst was never offered');
  assert.equal(out.remake.doesWorst, 'The remake uses both props.');
  assert.equal(out.original.doesWorst, 'original never uses its stated props.');
  assert.equal(out.verification.corrected, 1);
  assert.equal(out.verification.corrections[0].label, 'remake.doesWorst');
  // Scores are pass 1's, always.
  assert.equal(out.comparison.verdictScorecard.remakeScore, 9);

  // Group: roster entries are addressed by character name.
  ({ out, claims } = await patchClaim(group, 'Nala.potentialConflicts', 'She clashes with anyone near the user.',
    () => runGroup({ characters: [{ name: 'Nala', description: 'A' }] }, { ...cfg, verifyPass: true })));
  assert.ok(claims.includes('(Nala.potentialConflicts)'));
  assert.equal(out.characterBreakdowns[0].potentialConflicts, 'She clashes with anyone near the user.');
  assert.equal(out.groupSlopScore, 5);

  // Multichar: per-character notes and nested world fields.
  ({ out, claims } = await patchClaim(multichar, 'Nala.criticalNotes', 'Distinct, with a stated escalation ladder.',
    () => runMultichar({ description: 'World' }, { ...cfg, verifyPass: true })));
  assert.ok(claims.includes('(Nala.criticalNotes)'));
  assert.ok(claims.includes('(worldBuilding)'));
  assert.equal(out.characterAssessments[0].criticalNotes, 'Distinct, with a stated escalation ladder.');
  assert.equal(out.worldAndSystemAnalysis.worldBuilding.notes, 'No rules given.');
  assert.equal(out.characterAssessments[0].depthScore, 7);
});

test('immersion modules and flavor fields are never sent for fact-checking', async () => {
  const withModules = { ...good(), doesBest: 'Consistent register.', datingProfile: 'Swipe right for surveillance.',
    quippySellSummary: 'A cat who found her person.', slopSummary: 'Clean.', creatorNotesBlurb: 'Join the Discord.',
    shoppingList: { items: ['dart gun (against type)'], notes: 'Tells you everything.' },
    pissThemOff: { trivial: 'A crooked bow.', personal: 'Being ignored.', denied: 'Rejection.' } };
  const { claims } = await patchClaim(withModules, 'doesBest', 'Consistent obsessive register.',
    () => runAnalyze(params, { ...cfg, verifyPass: true }));
  for (const excluded of ['Swipe right', 'dart gun', 'A crooked bow', 'found her person', 'Join the Discord']) {
    assert.ok(!claims.includes(excluded), `${excluded} should not be fact-checked`);
  }
  assert.ok(claims.includes('(doesBest)'));
});
