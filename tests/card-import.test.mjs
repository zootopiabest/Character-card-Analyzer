import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { buildDescriptionFromJson, readCardFile, tryExtractCharaMetadata } from '../src/utils.ts';
import { readCharx, CARD_FILE_LIMIT, CHARX_FILE_LIMIT } from '../src/charx.ts';

const portrait = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const v3 = (extra = {}) => ({ spec: 'chara_card_v3', spec_version: '3.0', data: {
  name: '岳悦 — Researcher', description: 'A genomicist with a dry sense of humor.',
  group_only_greetings: [], ...extra,
} });
const icon = (uri, name = 'main') => ({ type: 'icon', uri, name, ext: 'png' });
async function archive(card = v3(), entries = {}, compression = 'DEFLATE') {
  const zip = new JSZip();
  if (card !== undefined && card !== null) zip.file('card.json', typeof card === 'string' ? card : JSON.stringify(card));
  for (const [name, bytes] of Object.entries(entries)) zip.file(name, bytes);
  return zip.generateAsync({ type: 'arraybuffer', compression });
}

test('V3 extraction preserves runtime fields and conditional lore settings without dumping assets', () => {
  const card = v3({
    nickname: '岳悦', first_mes: 'Hello.', alternate_greetings: ['Another opening.'],
    group_only_greetings: ['She greets the crew.'], creator_notes: 'English note.',
    creator_notes_multilingual: { en: 'English note.', zh: '中文备注' },
    creation_date: 0, modification_date: 123, source: ['https://example.com/card'],
    assets: [icon('data:image/png;base64,SECRET_ASSET_BYTES'), { type: 'background', uri: 'embeded://bg.png' }],
    extensions: { enabled: false, depth_prompt: { prompt: 'Stay concise.', depth: 0, role: 'system' } },
    character_book: { scan_depth: 0, token_budget: 800, recursive_scanning: false, extensions: { custom: 2 }, entries: [
      { keys: ['/vampires?/i'], secondary_keys: ['night'], use_regex: true, constant: false,
        enabled: false, case_sensitive: false, selective: true, insertion_order: 0, priority: 3,
        position: 'after_char', extensions: { probability: 25 }, content: '@@depth 2\nVampires need blood.' },
      { constant: true, content: 'The sun rises every day.' }, null,
    ] },
  });
  const result = buildDescriptionFromJson(card);
  assert.equal(result.name, card.data.name);
  for (const marker of ['{{char}} Replacement', 'Group-Only Greetings', 'She greets the crew.', '中文备注',
    'scan_depth: 0', 'recursive_scanning: false', 'use_regex: true', 'case_sensitive: false', 'selective: true',
    'insertion_order: 0', 'priority: 3', 'position: after_char', '"probability":25', '[DISABLED]',
    '[Always Active / Constant]', '@@depth 2', 'creation_date: 0', 'Depth: 0', 'icon: 1', 'background: 1']) {
    assert.ok(result.description.includes(marker), marker);
  }
  assert.equal(result.description.split('English note.').length - 1, 1);
  assert.doesNotMatch(result.description, /SECRET_ASSET_BYTES|data:image/);
});

test('V1 and V2 retain character prose, alternate greetings, extensions, and lorebook content', () => {
  const data = { name: 'Legacy', description: 'Original description', first_mes: 'Original greeting',
    alternate_greetings: [{ text: 'Legacy alternate' }], mes_example: 'Example dialogue',
    extensions: { custom: 'Custom instruction' }, character_book: { entries: [{ key: 'town', entry: 'Old lore' }] } };
  for (const card of [data, { spec: 'chara_card_v2', data }]) {
    const result = buildDescriptionFromJson(card);
    assert.equal(result.name, 'Legacy');
    for (const text of ['Original description', 'Original greeting', 'Legacy alternate', 'Example dialogue', 'Custom instruction', 'Old lore']) assert.ok(result.description.includes(text));
  }
  for (const invalid of [null, [], 'text', 123, { data: [] }]) assert.throws(() => buildDescriptionFromJson(invalid), /object/);
});

function pngChunk(keyword, value) {
  const data = Buffer.from(keyword + '\0' + Buffer.from(value).toString('base64'));
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length); chunk.write('tEXt', 4); data.copy(chunk, 8);
  return chunk;
}
function png(entries) {
  const bytes = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), ...entries]);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length);
}
test('dual-payload PNGs prefer V3 in either order, preserve V3 greetings, and fall back on invalid V3', async () => {
  const older = pngChunk('chara', JSON.stringify({ data: { name: 'Old', description: 'Old text' } }));
  const newer = pngChunk('ccv3', JSON.stringify(v3({ group_only_greetings: ['Group opening.'] })));
  for (const entries of [[older, newer], [newer, older]]) {
    const result = await tryExtractCharaMetadata(png(entries));
    assert.equal(result.name, '岳悦 — Researcher');
    assert.match(result.description, /Group opening/);
    assert.doesNotMatch(result.description, /Old text/);
  }
  assert.equal((await tryExtractCharaMetadata(png([pngChunk('ccv3', 'broken'), older]))).name, 'Old');
  await assert.rejects(tryExtractCharaMetadata(png([pngChunk('ccv3', 'broken')])), /could not be decoded/);
});

test('CharX reads STORE and DEFLATE archives, selects main portrait, and preserves Unicode paths', async () => {
  for (const compression of ['STORE', 'DEFLATE']) {
    const card = v3({ assets: [icon('embeded://other.png', 'other'), icon('embeded://assets/头像.png')] });
    const result = await readCharx(await archive(card, { 'other.png': 'invalid', 'assets/头像.png': portrait }, compression));
    assert.deepEqual(result.card, card);
    assert.equal(result.image.base64, portrait.toString('base64'));
    assert.equal(result.image.mimeType, 'image/png');
    assert.equal(result.warning, undefined);
  }
});

test('CharX accepts first icon, inline portrait, and common embedded URI spelling', async () => {
  for (const uri of ['embeded://portrait.png', 'embedded://portrait.png', 'data:image/png;base64,' + portrait.toString('base64')]) {
    const result = await readCharx(await archive(v3({ assets: [icon(uri, 'avatar')] }), { 'portrait.png': portrait }));
    assert.equal(result.image.base64, portrait.toString('base64'));
  }
});

test('CharX detects actual JPEG, WebP, GIF image types regardless of extension', async () => {
  for (const [bytes, mime] of [[Buffer.from([255,216,255,224]), 'image/jpeg'], [Buffer.from('RIFF0000WEBP'), 'image/webp'], [Buffer.from('GIF89a'), 'image/gif']]) {
    const result = await readCharx(await archive(v3({ assets: [icon('embeded://portrait.png')] }), { 'portrait.png': bytes }));
    assert.equal(result.image.mimeType, mime);
  }
});

test('CharX without artwork imports normally; unavailable artwork keeps text and gives a notice', async () => {
  for (const extra of [{}, { assets: [] }, { assets: [icon('ccdefault:')] }]) {
    const result = await readCharx(await archive(v3(extra)));
    assert.equal(result.image, undefined); assert.equal(result.warning, undefined);
  }
  for (const uri of ['embeded://missing.png', 'https://example.com/avatar.png', 'file:///avatar.png', 'embeded://bad.png', 'embeded://../bad.png']) {
    const result = await readCharx(await archive(v3({ assets: [icon(uri)] }), { 'bad.png': '<svg></svg>' }));
    assert.equal(result.card.data.name, '岳悦 — Researcher');
    assert.equal(result.image, undefined); assert.match(result.warning, /text imported without artwork/);
  }
});

test('CharX rejects invalid archives, missing root card, malformed JSON, and wrong card types', async () => {
  await assert.rejects(readCharx(new ArrayBuffer(8)), /Could not open/);
  await assert.rejects(readCharx(await archive(null, { 'nested/card.json': JSON.stringify(v3()) })), /missing card.json/);
  await assert.rejects(readCharx(await archive('{bad json')), /not valid/);
  for (const card of [{ spec: 'chara_card_v2', data: {} }, [], { spec: 'chara_card_v3', data: [] }]) {
    await assert.rejects(readCharx(await archive(card)), /Character Card V3/);
  }
  await assert.rejects(readCharx(await archive(null, { '../card.json': JSON.stringify(v3()) })), /invalid archive path/);
});

test('CharX bounds inflated card and portrait sizes while ignoring large unused assets', async () => {
  const oversized = 'x'.repeat(CARD_FILE_LIMIT + 1);
  await assert.rejects(readCharx(await archive(v3({ description: oversized }))), /15MB extracted-file limit/);
  const imageResult = await readCharx(await archive(v3({ assets: [icon('embeded://large.png')] }), { 'large.png': oversized }));
  assert.equal(imageResult.image, undefined); assert.match(imageResult.warning, /15MB/);
  const result = await readCharx(await archive(v3(), { 'unused/background.png': oversized }));
  assert.equal(result.card.data.name, '岳悦 — Researcher');
});

test('shared file reader imports CharX text before its portrait, even with a generic MIME type', async () => {
  const buffer = await archive(v3({ assets: [icon('embeded://portrait.png')] }), { 'portrait.png': portrait });
  const events = [];
  await new Promise((resolve, reject) => readCardFile(new File([buffer], 'CHARACTER.CHARX', { type: 'application/octet-stream' }), {
    onText: value => events.push(['text', value]),
    onImage: value => { events.push(['image', value]); resolve(); },
    onError: reject,
  }));
  assert.deepEqual(events.map(([type]) => type), ['text', 'image']);
  assert.equal(events[0][1].source, 'charx');
  assert.equal(events[0][1].name, '岳悦 — Researcher');
  assert.equal(events[1][1].base64, portrait.toString('base64'));
});

test('shared reader exposes portrait notices and rejects oversize uploads before reading', async () => {
  const buffer = await archive(v3({ assets: [icon('embeded://missing.png')] }));
  const events = [];
  await new Promise((resolve, reject) => readCardFile(new File([buffer], 'card.charx'), {
    onText: () => events.push('text'), onImage: () => events.push('image'),
    onWarning: message => { events.push('warning'); assert.match(message, /missing/); resolve(); }, onError: reject,
  }));
  assert.deepEqual(events, ['text', 'warning']);
  for (const [name, size, limit] of [['card.charx', CHARX_FILE_LIMIT + 1, /100MB/], ['card.json', CARD_FILE_LIMIT + 1, /15MB/]]) {
    let error;
    readCardFile({ name, size, arrayBuffer: () => { throw new Error('must not read'); } }, { onError: message => { error = message; } });
    assert.match(error, limit);
  }
});
