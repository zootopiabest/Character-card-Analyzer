import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { selectLatestModel, OPENROUTER_MODELS, migrateModel } from '../src/data/models.ts';
import { readProviderSettings } from '../src/providerSettings.ts';
import { normalizeResult } from '../src/resultValidation.ts';
import { tryExtractCharaMetadata } from '../src/utils.ts';
import { runAnalyze, runCompare, runGroup, runMultichar } from '../src/aiClient.ts';

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
test('Gemini 2.5 thinking budget leaves space for the report at a smaller output limit',async()=>{
  let config;
  globalThis.fetch=async(url,options)=>{config=JSON.parse(options.body).generationConfig;return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(good())}]}}]})};};
  await runAnalyze(params,{...cfg,provider:'gemini',model:'gemini-2.5-pro',thinkingMode:true,reasoningEffort:'high',maxOutputTokens:8192});
  assert.ok(config.thinkingConfig.thinkingBudget < config.maxOutputTokens);
});
