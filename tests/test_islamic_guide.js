#!/usr/bin/env node
/**
 * Islamic Beginners Introduction Guide — memorisation coach preview checks:
 * spaced-repetition scheduler, combined reviews, localStorage persistence,
 * verbatim credits and disclaimer, official Tanzil / ClearQuran wording,
 * transliteration from transliteration-verses.json only, no wudu/prayer/duas
 * screens, and no runtime network requests apart from user-tapped credit links.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');

var root = path.resolve(__dirname, '..');
var Guide = require(path.join(root, 'app.js'));

var failed = 0;
var passed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('  PASS  ' + name);
  } catch (err) {
    failed += 1;
    console.log('  FAIL  ' + name);
    console.log('        ' + (err && err.stack ? err.stack.split('\n').slice(0, 6).join('\n        ') : err));
  }
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function parsePipeSample(text) {
  return Guide.parsePipeVerses(text);
}

var rawCurriculum = JSON.parse(read('data/curriculum.json'));
var tanzilText = read('tanzil/quran-simple.txt');
var clearText = read('clearquran/clearquran-allah-edition.txt');
var translitList = JSON.parse(read('data/transliteration-verses.json'));
var curriculum = Guide.hydrateCurriculum(rawCurriculum, parsePipeSample(tanzilText), parsePipeSample(clearText), translitList);
var html = read('index.html');
var css = read('style.css');
var js = read('app.js');
var readme = read('README.md');

console.log('Islamic Beginners Introduction Guide — memorisation coach preview tests');

test('bundled curriculum has six example groups and only verse references', function () {
  assert.strictEqual(rawCurriculum.label, 'Example data');
  assert.ok(rawCurriculum.groups.length === 6);
  rawCurriculum.groups.forEach(function (g) {
    assert.ok(g.id && g.title && g.reference && g.verses && g.verses.length);
    g.verses.forEach(function (v) {
      assert.strictEqual(typeof v.surah, 'number');
      assert.strictEqual(typeof v.ayah, 'number');
      assert.strictEqual(v.arabic, undefined);
      assert.strictEqual(v.english, undefined);
      assert.strictEqual(v.transliteration, undefined);
      assert.strictEqual(v.translit, undefined);
    });
  });
  var blob = JSON.stringify(rawCurriculum);
  assert.ok(!/[\u0600-\u06FF]/.test(blob), 'curriculum must not paste Arabic');
  assert.ok(blob.indexOf('In the name of Allah') === -1);
});

test('Arabic is loaded from official Tanzil Simple 1.1 and matches word for word', function () {
  var official = parsePipeSample(tanzilText);
  assert.ok(tanzilText.indexOf('Tanzil Quran Text (Simple, Version 1.1)') !== -1);
  assert.ok(tanzilText.indexOf('CHANGING IT IS NOT ALLOWED') !== -1);
  assert.ok(tanzilText.indexOf('http://tanzil.net/updates/') !== -1);
  var count = 0;
  curriculum.groups.forEach(function (g) {
    g.verses.forEach(function (v) {
      var key = v.surah + '|' + v.ayah;
      assert.ok(official[key], 'missing official Arabic at ' + key);
      assert.strictEqual(v.arabic, official[key], 'arabic mismatch at ' + key);
      count += 1;
    });
  });
  assert.ok(count >= 20);
  assert.strictEqual(Object.keys(official).length, 6236);
});

test('English is loaded from official ClearQuran Allah Edition and matches word for word', function () {
  var official = parsePipeSample(clearText);
  assert.ok(/Talal Itani/.test(clearText));
  assert.ok(/ClearQuran/i.test(clearText));
  assert.ok(/CC BY-ND 4\.0/.test(clearText));
  curriculum.groups.forEach(function (g) {
    g.verses.forEach(function (v) {
      var key = v.surah + '|' + v.ayah;
      assert.ok(official[key], 'missing official English at ' + key);
      assert.strictEqual(v.english, official[key], 'english mismatch at ' + key);
    });
  });
  assert.strictEqual(curriculum.englishCredit, 'Translation by Talal Itani, ClearQuran.com');
  assert.strictEqual(rawCurriculum.englishEdition, 'Allah Edition');
  assert.strictEqual(Object.keys(official).length, 6236);
});

test('transliteration is loaded only from transliteration-verses.json', function () {
  assert.strictEqual(Guide.DATA_TRANSLIT, 'data/transliteration-verses.json');
  assert.ok(js.indexOf('data/transliteration-verses.json') !== -1);
  assert.ok(!/(?:['"]|fetch\()(?!data\/)transliteration\.json/.test(js));
  assert.ok(!/\btransliteration\.json\b/.test(js.replace(/transliteration-verses\.json/g, '')));
  assert.ok(!fs.existsSync(path.join(root, 'transliteration.json')));
  assert.ok(!fs.existsSync(path.join(root, 'data/transliteration.json')));
  assert.ok(fs.existsSync(path.join(root, 'data/transliteration-verses.json')));
  var byKey = {};
  translitList.forEach(function (row) {
    assert.deepStrictEqual(Object.keys(row).sort(), ['ayah', 'plain', 'surah', 'translit']);
    byKey[row.surah + '|' + row.ayah] = row.translit;
  });
  curriculum.groups.forEach(function (g) {
    g.verses.forEach(function (v) {
      var key = v.surah + '|' + v.ayah;
      assert.ok(byKey[key], 'missing translit at ' + key);
      assert.strictEqual(v.transliteration, byKey[key]);
    });
  });
  var htmlBlock = Guide.verseBlocks(curriculum.groups[0], curriculum, Guide.defaultSettings(), true);
  assert.ok(htmlBlock.indexOf(byKey['1|1']) !== -1);
  assert.ok(htmlBlock.indexOf(Guide.TRANSLIT_LINE) !== -1);
  assert.ok(htmlBlock.indexOf('title') === -1 || htmlBlock.indexOf(byKey['1|1']) !== -1);
});

test('no audio is bundled and there is no audio teaser', function () {
  function walk(dir, hits) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (ent) {
      if (ent.name === '.git' || ent.name === 'node_modules') return;
      var p = path.join(dir, ent.name);
      if (ent.isDirectory()) return walk(p, hits);
      if (/\.(mp3|wav|ogg|m4a|webm)$/i.test(ent.name)) hits.push(path.relative(root, p));
    });
  }
  var hits = [];
  walk(root, hits);
  assert.deepStrictEqual(hits, []);
  var blob = html + js + JSON.stringify(rawCurriculum) + readme;
  assert.ok(!/audio will be added/i.test(blob));
  assert.ok(!/<audio/i.test(html));
});

test('first Remembered today schedules a same-day review (interval 0)', function () {
  var today = '2026-11-15';
  var state = Guide.emptyState(curriculum);
  state = Guide.markRememberedToday(state, curriculum, 'fatiha-1', today);
  var g = state.groups['fatiha-1'];
  assert.strictEqual(g.intervalIndex, 0);
  assert.strictEqual(g.nextReviewAt, today);
  assert.strictEqual(g.firstRememberedAt, today);
  assert.strictEqual(g.status, 'remembered');
  assert.ok(Guide.isDue(g.nextReviewAt, today));
  assert.strictEqual(Guide.getCurrentNewGroup(state, curriculum).id, 'fatiha-2');
});

test('Remembered advances through 1, 3, 7, 14 and 30 day intervals and stays at 30', function () {
  var today = '2026-11-15';
  var state = Guide.emptyState(curriculum);
  state = Guide.markRememberedToday(state, curriculum, 'fatiha-1', today);
  var expected = [1, 3, 7, 14, 30, 30];
  expected.forEach(function (days, i) {
    state = Guide.reviewGroup(state, 'fatiha-1', true, today);
    var g = state.groups['fatiha-1'];
    var expectIdx = Math.min(i + 1, 5);
    assert.strictEqual(g.intervalIndex, expectIdx, 'index after review ' + (i + 1));
    assert.strictEqual(g.nextReviewAt, Guide.addDays(today, days), 'date after review ' + (i + 1));
    assert.ok(!Guide.isDue(g.nextReviewAt, today));
  });
});

test('Needs practice moves one interval back and is due tomorrow', function () {
  var today = '2026-11-15';
  var state = Guide.emptyState(curriculum);
  state = Guide.markRememberedToday(state, curriculum, 'fatiha-1', today);
  state = Guide.reviewGroup(state, 'fatiha-1', true, today);
  state = Guide.reviewGroup(state, 'fatiha-1', true, today);
  assert.strictEqual(state.groups['fatiha-1'].intervalIndex, 2);
  state = Guide.reviewGroup(state, 'fatiha-1', false, today);
  var g = state.groups['fatiha-1'];
  assert.strictEqual(g.intervalIndex, 1);
  assert.strictEqual(g.nextReviewAt, '2026-11-16');
  assert.strictEqual(g.status, 'learning');
});

test('Needs practice at interval 0 stays at 0 and is due tomorrow', function () {
  var today = '2026-11-15';
  var state = Guide.emptyState(curriculum);
  state = Guide.markRememberedToday(state, curriculum, 'fatiha-1', today);
  state = Guide.reviewGroup(state, 'fatiha-1', false, today);
  var g = state.groups['fatiha-1'];
  assert.strictEqual(g.intervalIndex, 0);
  assert.strictEqual(g.nextReviewAt, '2026-11-16');
});

test('a combined review unlocks after every three first-time Remembered today marks', function () {
  var today = '2026-11-15';
  var state = Guide.emptyState(curriculum);
  var ids = ['fatiha-1', 'fatiha-2', 'fatiha-3', 'ikhlas', 'falaq', 'nas'];
  ids.forEach(function (id, i) {
    state = Guide.markRememberedToday(state, curriculum, id, today);
    var expect = Math.floor((i + 1) / 3);
    assert.strictEqual(state.combinedReviews.length, expect, 'after ' + (i + 1) + ' groups');
  });
  assert.deepStrictEqual(state.combinedReviews[0].groupIds, ['fatiha-1', 'fatiha-2', 'fatiha-3']);
  assert.deepStrictEqual(state.combinedReviews[1].groupIds, ['ikhlas', 'falaq', 'nas']);
  assert.strictEqual(state.combinedReviews[0].nextReviewAt, today);
  assert.strictEqual(Guide.combinedStatus(state.combinedReviews[0], today), 'due');
  assert.ok(Guide.getDueCombined(state, today).length === 2);
});

test('combined review Remembered is due in 7 days, then 30; Needs practice is due tomorrow', function () {
  var today = '2026-11-15';
  var state = Guide.emptyState(curriculum);
  ['fatiha-1', 'fatiha-2', 'fatiha-3'].forEach(function (id) {
    state = Guide.markRememberedToday(state, curriculum, id, today);
  });
  var id = state.combinedReviews[0].id;
  state = Guide.reviewCombined(state, id, true, today);
  assert.strictEqual(state.combinedReviews[0].intervalStage, 1);
  assert.strictEqual(state.combinedReviews[0].nextReviewAt, '2026-11-22');
  assert.strictEqual(Guide.combinedStatus(state.combinedReviews[0], today), 'done');
  state = Guide.reviewCombined(state, id, true, today);
  assert.strictEqual(state.combinedReviews[0].intervalStage, 2);
  assert.strictEqual(state.combinedReviews[0].nextReviewAt, '2026-12-15');
  state = Guide.reviewCombined(state, id, false, today);
  assert.strictEqual(state.combinedReviews[0].nextReviewAt, '2026-11-16');
  assert.strictEqual(state.combinedReviews[0].intervalStage, 2);
});

test('progress and saved items persist through localStorage and can be cleared', function () {
  var store = Guide.memoryStore();
  var today = '2026-11-15';
  var state = Guide.emptyState(curriculum);
  state = Guide.markRememberedToday(state, curriculum, 'fatiha-1', today);
  state = Guide.addSaved(state, 'group', 'fatiha-1', 'practise after dinner', today);
  state = Guide.updateSettings(state, { fontSize: 'large', showTransliteration: true });
  Guide.saveState(state, store);
  var reloaded = Guide.loadState(curriculum, store);
  assert.strictEqual(reloaded.groups['fatiha-1'].nextReviewAt, today);
  assert.strictEqual(reloaded.groups['fatiha-1'].intervalIndex, 0);
  assert.strictEqual(reloaded.saved[0].note, 'practise after dinner');
  assert.strictEqual(reloaded.settings.fontSize, 'large');
  assert.strictEqual(reloaded.settings.showTransliteration, true);
  var cleared = Guide.clearState(curriculum, store);
  var after = Guide.loadState(curriculum, store);
  assert.strictEqual(after.groups['fatiha-1'].status, 'new');
  assert.deepStrictEqual(after.saved, []);
  assert.strictEqual(cleared.groups['fatiha-1'].status, 'new');
});

test('disclaimer, credits, privacy line and last-checked appear word for word', function () {
  var d = Guide.DISCLAIMER;
  var last = Guide.LAST_CHECKED;
  assert.strictEqual(d, 'This guide is a general beginner\'s aid, not a religious ruling (fatwa). It has not been reviewed by a scholar. Practice differs between schools of thought (madhhabs), so please learn from a qualified teacher or imam at your local mosque.');
  assert.strictEqual(Guide.TRANSLIT_LINE, 'Transliteration is approximate. Learn the Arabic pronunciation from a teacher.');
  assert.strictEqual(Guide.SOURCES_LINE, 'Sources (educational references only). Naming a book, website, mosque or author does not mean they endorse, approve or are affiliated with this app or with Makerman Services.');
  assert.strictEqual(Guide.PRIVACY_LINE, 'Your progress, settings and any saved notes stay on this device only. Nothing is sent off the device. You can clear this data at any time.');
  assert.strictEqual(last, 'Last checked: 15 Nov 2026');
  assert.strictEqual(Guide.ARABIC_CREDIT, 'Arabic Quran text: Tanzil Quran Text (Simple, Version 1.1), © 2007–2026 Tanzil Project, used verbatim under the Tanzil text licence (Creative Commons Attribution 3.0, with no changes allowed). Source: Tanzil Project, https://tanzil.net. Updates: http://tanzil.net/updates/.');
  assert.strictEqual(Guide.ENGLISH_CREDIT, 'Translation by Talal Itani, ClearQuran.com');
  ['view-welcome', 'view-today', 'view-review', 'view-progress', 'view-saved'].forEach(function (id) {
    var start = html.indexOf('id="' + id + '"');
    assert.ok(start !== -1, 'missing section ' + id);
    var nextIds = ['view-today', 'view-review', 'view-progress', 'view-saved', 'toast'];
    var end = html.length;
    nextIds.forEach(function (other) {
      if (other === id) return;
      var at = html.indexOf('id="' + other + '"', start + 1);
      if (at !== -1 && at < end) end = at;
    });
    var block = html.slice(start, end);
    assert.ok(block.indexOf(d) !== -1, 'disclaimer missing from ' + id);
    assert.ok(block.indexOf(last) !== -1, 'last checked missing from ' + id);
  });
  var aboutStart = html.indexOf('id="about"');
  var about = html.slice(aboutStart, html.indexOf('id="view-today"'));
  assert.ok(about.indexOf(d) !== -1, 'disclaimer missing from About');
  assert.ok(about.indexOf(Guide.TRANSLIT_LINE) !== -1);
  assert.ok(about.indexOf(Guide.SOURCES_LINE) !== -1);
  assert.ok(about.indexOf(Guide.PRIVACY_LINE) !== -1);
  assert.ok(about.indexOf('Tanzil Quran Text (Simple, Version 1.1)') !== -1);
  assert.ok(about.indexOf('Translation by Talal Itani,') !== -1);
  assert.ok(about.indexOf(last) !== -1);
  var welcome = html.slice(html.indexOf('id="view-welcome"'), html.indexOf('id="view-today"'));
  assert.ok(welcome.indexOf(Guide.TRANSLIT_LINE) !== -1);
  assert.ok(welcome.indexOf(Guide.SOURCES_LINE) !== -1);
  assert.ok(welcome.indexOf(Guide.PRIVACY_LINE) !== -1);
  var intro = html.slice(html.indexOf('id="view-welcome"'), aboutStart);
  var onboard = intro.match(/<ol class="onboard-steps">[\s\S]*?<\/ol>/);
  assert.ok(onboard, 'missing onboarding list');
  assert.strictEqual((onboard[0].match(/<li>/g) || []).length, 2);
  assert.ok(onboard[0].indexOf('Meet Islamic Beginners Introduction Guide.') !== -1);
  assert.ok(onboard[0].indexOf('Learn a few verses at a time, then review them together.') !== -1);
  assert.ok(onboard[0].indexOf(d) === -1, 'disclaimer must not be repeated as an onboarding line');
  assert.ok(/id="welcome-disclaimer"[^>]*>/.test(intro));
  assert.ok(intro.indexOf(d) !== -1);
  assert.strictEqual(intro.split(d).length - 1, 1, 'Welcome intro should have one dedicated disclaimer only');
  assert.ok(about.split(d).length - 1 >= 1);
});

test('Welcome keeps one wudu and prayer pointer only, with Legal\'s exact wording', function () {
  var note = 'Learning wudu and prayer: this first release does not include step-by-step prayer guides. Please learn those with a qualified teacher or imam at your local mosque.';
  assert.ok(html.indexOf(note) !== -1);
  assert.strictEqual(html.split(note).length - 1, 1);
  assert.ok(/id="wudu-prayer-note"/.test(html));
  assert.ok(html.indexOf('For wudu and prayer, learn with a teacher at your local mosque.') === -1);
  assert.ok(!/coming soon/i.test(html + js + css));
  assert.ok(!/href=["'][^"']*(?:wudu|prayer-steps|duas)/i.test(html));
});

test('no wudu, prayer-step or duas screens, nav, links or files', function () {
  assert.ok(!fs.existsSync(path.join(root, 'data/guides.json')));
  assert.ok(html.indexOf('view-guides') === -1);
  assert.ok(html.indexOf('tab-guides') === -1);
  assert.ok(html.indexOf('data-view="guides"') === -1);
  assert.ok(js.indexOf("'guides'") === -1);
  assert.ok(js.indexOf('data/guides.json') === -1);
  assert.ok(js.indexOf('toggleChecklist') === -1);
  var appFiles = ['index.html', 'style.css', 'app.js', 'data/curriculum.json'];
  appFiles.forEach(function (rel) {
    var text = read(rel);
    if (rel === 'index.html') {
      assert.ok(!/duas/i.test(text), 'duas mentioned in ' + rel);
      return;
    }
    assert.ok(!/duas/i.test(text), 'duas mentioned in ' + rel);
    assert.ok(!/dua\b/i.test(text), 'dua mentioned in ' + rel);
  });
  // The only allowed pointer is the Welcome note (tested separately). No screens or links.
  assert.ok(html.indexOf('Learning wudu and prayer: this first release does not include step-by-step prayer guides. Please learn those with a qualified teacher or imam at your local mosque.') !== -1);
  assert.ok(html.indexOf('For wudu and prayer, learn with a teacher at your local mosque.') === -1);
  assert.ok(!/href=["'][^"']*(?:wudu|prayer-steps|duas)/i.test(html));
  assert.ok(!/checklist/i.test(html));
  assert.ok(!/#guides/.test(html + js));
});

test('no runtime network requests apart from plain credit links the user taps', function () {
  var allowedHref = [
    'https://tanzil.net',
    'https://tanzil.net/',
    'http://tanzil.net/',
    'http://tanzil.net/updates/',
    'https://tanzil.net/docs/text_license',
    'https://creativecommons.org/licenses/by/3.0/',
    'https://creativecommons.org/licenses/by-nd/4.0/',
    'https://clearquran.com',
    'https://clearquran.com/',
    'https://www.clearquran.com',
    'https://www.clearquran.com/',
    'https://software.sil.org/scheherazade/',
    'https://openfontlicense.org/',
    'https://www.sil.org/'
  ];
  var nsOnly = /^https?:\/\/www\.w3\.org\//;
  function isAllowedCredit(url) {
    var clean = url.replace(/[.,);]+$/, '');
    return allowedHref.some(function (a) {
      return clean === a || (clean.indexOf(a) === 0 && (a.endsWith('/') || clean.length === a.length || clean.charAt(a.length) === '/' || clean.charAt(a.length) === '#'));
    });
  }
  var runtimeFiles = ['index.html', 'style.css', 'app.js', 'favicon.svg'];
  var hits = [];
  runtimeFiles.forEach(function (rel) {
    var text = read(rel);
    if (/fonts\.googleapis|fonts\.gstatic|google-analytics|googletagmanager|doubleclick|connect\.facebook|api\.quran\.com|quran\.com\/api|everyayah/i.test(text)) {
      hits.push(rel + ': blocked tracker or API host');
    }
    if (/@import\s+url\(\s*['"]?https?:/i.test(text)) hits.push(rel + ': remote @import');
    var fetchRe = /fetch\s*\(\s*(['"`])([\s\S]*?)\1/g;
    var m;
    while ((m = fetchRe.exec(text))) {
      if (/^https?:/i.test(m[2])) hits.push(rel + ': fetch of ' + m[2]);
    }
    if (/new\s+XMLHttpRequest|navigator\.sendBeacon|new\s+WebSocket\s*\(\s*['"]wss?:/i.test(text)) {
      hits.push(rel + ': XHR, beacon or websocket');
    }
    var re = /https?:\/\/[^\s"'`<>)]+/gi;
    while ((m = re.exec(text))) {
      if (nsOnly.test(m[0])) continue;
      if (isAllowedCredit(m[0])) continue;
      hits.push(rel + ': ' + m[0]);
    }
    var urlRe = /url\(\s*(['"]?)(https?:\/\/[^'")]+)\1\s*\)/gi;
    while ((m = urlRe.exec(text))) hits.push(rel + ': remote url() ' + m[2]);
  });
  if (/<(?:script|img|link|audio|source|iframe)[^>]+(?:src|href)=['"]https?:/i.test(html)) {
    hits.push('index.html: remote src/href on a loaded asset');
  }
  if (/<script[^>]+src=['"]https?:/i.test(html)) hits.push('index.html: remote script');
  if (/<link[^>]+rel=['"]stylesheet['"][^>]+href=['"]https?:/i.test(html)) hits.push('index.html: remote stylesheet');
  assert.deepStrictEqual(hits, [], 'unexpected network or off-site runtime URL:\n' + hits.join('\n'));
  assert.ok(html.indexOf('href="https://tanzil.net"') !== -1);
  assert.ok(html.indexOf('href="http://tanzil.net/updates/"') !== -1);
  assert.ok(html.indexOf('href="https://clearquran.com"') !== -1);
  assert.ok(css.indexOf('fonts/ScheherazadeNew-Regular.woff2') !== -1);
  assert.ok(css.indexOf('fonts/amiri/Amiri-Regular.ttf') !== -1);
  assert.ok(!/fonts\.googleapis/.test(css));
});

test('Scheherazade New and Amiri are self-hosted, each with OFL.txt, and not loaded from a CDN', function () {
  assert.ok(fs.existsSync(path.join(root, 'fonts/ScheherazadeNew-Regular.woff2')));
  assert.ok(fs.existsSync(path.join(root, 'fonts/amiri/Amiri-Regular.ttf')));
  var oflS = read('fonts/OFL.txt');
  var oflA = read('fonts/amiri/OFL.txt');
  assert.ok(/SIL Open Font License, Version 1\.1/.test(oflS));
  assert.ok(/Reserved Font Names "Scheherazade" and "SIL"/.test(oflS));
  assert.ok(/SIL Open Font License, Version 1\.1/.test(oflA));
  assert.ok(/Amiri Project Authors/.test(oflA));
  assert.ok(/@font-face/.test(css));
  assert.ok(/font-family:\s*"Scheherazade New"/.test(css) || /font-family:"Scheherazade New"/.test(css));
  assert.ok(/font-family:\s*"Amiri"/.test(css) || /font-family:"Amiri"/.test(css));
});

test('licence notices for Tanzil Simple and ClearQuran are bundled', function () {
  var tanzil = read('LICENCES/TANZIL-QURAN-TEXT.txt');
  assert.ok(/Tanzil Quran Text \(Simple, Version 1\.1\)/.test(tanzil));
  assert.ok(/Creative Commons Attribution 3\.0/.test(tanzil));
  var cq = read('LICENCES/CLEARQURAN.txt');
  assert.ok(/Translation by Talal Itani, ClearQuran.com/.test(cq));
  assert.ok(/not from Tanzil/.test(cq));
  assert.ok(/CC BY-ND 4\.0/.test(cq));
});

test('blocked sources are not used as app content', function () {
  var blob = html + '\n' + js + '\n' + JSON.stringify(rawCurriculum);
  assert.ok(!/Mustafa Khattab|The Clear Quran®|Saheeh International|Hilali|Yusuf Ali|api-docs\.quran\.com|everyayah/i.test(blob));
  assert.ok(!fs.existsSync(path.join(root, 'data/en.itis.txt')));
  assert.ok(!/tanzil\.net\/trans/.test(html + js));
});

test('preview is marked private and has no shop, price, donation or upsell', function () {
  assert.ok(/noindex,nofollow,noarchive/.test(html));
  assert.ok(/Private preview/.test(html));
  var robots = read('robots.txt');
  assert.ok(/Disallow: \//.test(robots));
  var phrases = ['buy now', 'add to cart', 'check' + 'out', 'priced at', 'US$', 'A$', 'donate', 'upsell', 'upgrade'];
  var blob = (html + css + js).toLowerCase();
  phrases.forEach(function (p) {
    assert.ok(blob.indexOf(p.toLowerCase()) === -1, 'found ' + p);
  });
});

test('calm wording: hurry, Voice bot and shame phrases stay out of the app files', function () {
  var files = ['index.html', 'style.css', 'app.js', 'data/curriculum.json', 'README.md'];
  var phrases = ['in a hurry', 'Voice bot', "don't fall behind", 'you are behind', 'leaderboard'];
  files.forEach(function (rel) {
    var text = read(rel);
    phrases.forEach(function (p) {
      assert.ok(text.indexOf(p) === -1, p + ' in ' + rel);
    });
  });
});

test('transliteration is on by default for new users', function () {
  assert.strictEqual(Guide.defaultSettings().showTransliteration, true);
  assert.strictEqual(Guide.emptyState(curriculum).settings.showTransliteration, true);
  assert.strictEqual(Guide.loadState(curriculum, Guide.memoryStore()).settings.showTransliteration, true);
});

test('existing users with the old default saved as off now get transliteration on', function () {
  var map = {};
  var store = Guide.memoryStore(map);
  Guide.saveState(Guide.emptyState(curriculum), store);
  var keys = Object.keys(map);
  assert.strictEqual(keys.length, 1);
  var old = JSON.parse(map[keys[0]]);
  old.settings = { fontSize: 'medium', showArabic: true, showTranslation: true, showTransliteration: false };
  map[keys[0]] = JSON.stringify(old);
  assert.strictEqual(Guide.loadState(curriculum, store).settings.showTransliteration, true);
});

test('an explicit off choice made with the toggle is respected after a reload', function () {
  var store = Guide.memoryStore();
  var st = Guide.updateSettings(Guide.emptyState(curriculum), { showTransliteration: false, transliterationChosen: true });
  Guide.saveState(st, store);
  var r = Guide.loadState(curriculum, store);
  assert.strictEqual(r.settings.showTransliteration, false);
  assert.strictEqual(r.settings.transliterationChosen, true);
});

function slotOrder(htmlBlock) {
  var groups = htmlBlock.split('<div class="verse-group">').slice(1);
  assert.ok(groups.length > 0, 'no verse groups rendered');
  return groups.map(function (g) {
    return { ar: g.indexOf('>Arabic</span>'), tl: g.indexOf('>Transliteration</span>'), tr: g.indexOf('>Translation</span>'), g: g };
  });
}

test('every verse shows Arabic, then transliteration, then translation', function () {
  var group = curriculum.groups[0];
  slotOrder(Guide.verseBlocks(group, curriculum, Guide.defaultSettings(), true)).forEach(function (o) {
    assert.ok(o.ar >= 0 && o.tl > o.ar && o.tr > o.tl, 'order wrong: ' + JSON.stringify([o.ar, o.tl, o.tr]));
  });
  slotOrder(Guide.verseBlocks(group, curriculum, Guide.defaultSettings(), false)).forEach(function (o) {
    assert.ok(o.ar >= 0 && o.tl > o.ar && o.tr > o.tl);
    assert.ok(o.g.indexOf(group.verses[0].transliteration) < 0, 'transliteration should hide with the Arabic');
  });
});

test('Today, Review and Saved all render verses with the transliteration slot', function () {
  var src = read('app.js');
  ['renderToday', 'renderReview', 'renderSaved'].forEach(function (fn) {
    var i = src.indexOf('function ' + fn + '(');
    var j = src.indexOf('\n  function ', i + 10);
    assert.ok(i >= 0 && /verseBlocks\(/.test(src.slice(i, j)), fn + ' does not render verses');
  });
  assert.ok(/id="tog-transliteration" checked/.test(read('index.html')), 'toggle should start checked');
});

test('Saved uses the same Tanzil and ClearQuran credit block as Today and Review', function () {
  var src = read('app.js');
  function fnBody(name) {
    var i = src.indexOf('function ' + name + '(');
    var j = src.indexOf('\n  function ', i + 10);
    assert.ok(i >= 0, 'missing ' + name);
    return src.slice(i, j);
  }
  ['renderToday', 'renderReview', 'renderSaved'].forEach(function (fn) {
    assert.ok(/creditHtml\(/.test(fnBody(fn)), fn + ' is missing creditHtml');
  });
  var block = Guide.creditHtml(curriculum);
  assert.ok(block.indexOf('Tanzil Quran Text (Simple, Version 1.1)') !== -1);
  assert.ok(block.indexOf('href="https://tanzil.net"') !== -1);
  assert.ok(block.indexOf('href="http://tanzil.net/updates/"') !== -1);
  assert.ok(block.indexOf('href="https://clearquran.com"') !== -1);
  assert.ok(block.indexOf('Translation by Talal Itani,') !== -1);
  assert.ok(block.indexOf('ClearQuran.com') !== -1);
  assert.ok(block.indexOf('(Allah Edition)') === -1, 'verse credit block should keep the required credit unchanged');
});

test('About and sources adds (Allah Edition) after the required ClearQuran credit', function () {
  var about = html.slice(html.indexOf('id="about"'), html.indexOf('id="view-today"'));
  assert.ok(about.indexOf('Translation by Talal Itani, <a href="https://clearquran.com" rel="noopener noreferrer">ClearQuran.com</a> (Allah Edition).') !== -1);
  // The required credit words and link stay; the edition is an addition after them, in Sources only.
  var verseCredit = Guide.creditHtml(curriculum);
  assert.ok(verseCredit.indexOf('(Allah Edition)') === -1);
});

test('official Tanzil and ClearQuran files are shipped unaltered', function () {
  var pack = '/workspace/ops/content/proposals/islamic-beginners-guide-2026-11/building-pack';
  function sha(p) { return fs.readFileSync(p); }
  assert.deepStrictEqual(sha(path.join(root, 'tanzil/quran-simple.txt')), sha(path.join(pack, 'tanzil/quran-simple.txt')));
  assert.deepStrictEqual(sha(path.join(root, 'clearquran/clearquran-allah-edition.txt')), sha(path.join(pack, 'clearquran/clearquran-allah-edition.txt')));
  assert.deepStrictEqual(sha(path.join(root, 'data/transliteration-verses.json')), sha(path.join(pack, 'transliteration-verses.json')));
  assert.deepStrictEqual(sha(path.join(root, 'LICENCES/TANZIL-QURAN-TEXT.txt')), sha(path.join(pack, 'LICENCES/TANZIL-QURAN-TEXT.txt')));
});

console.log('');
console.log(passed + ' passed, ' + failed + ' failed.');
process.exit(failed ? 1 : 0);
