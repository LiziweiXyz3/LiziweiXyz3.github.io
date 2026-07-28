const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const css = read('stylesheet.css');
const data = read('data.js');
const html = read('index.html');
const script = read('js/script.js');

test('display and section type tokens are fixed rem values', () => {
  assert.match(css, /--type-display:\s*2rem;/);
  assert.match(css, /--type-section:\s*1\.25rem;/);
  assert.doesNotMatch(css, /--type-(?:display|section):[^;]*(?:clamp|vw)/);
});

test('about card emoji is isolated from the scalable English title', () => {
  assert.match(html, /<span class="about-card-icon" aria-hidden="true">⚔️<\/span>\s*<span lang="en">CHARACTER STATS<\/span>/);
  assert.match(html, /<span class="about-card-icon" aria-hidden="true">🎒<\/span>\s*<span lang="en">SKILL SLOTS<\/span>/);
  assert.match(css, /\.about-card-icon\s*\{[^}]*font-size:\s*11px;/s);
});

test('mixed content is explicitly split into language parts in data', () => {
  assert.match(data, /bioParts:\s*\[[\s\S]*?lang:\s*["']en["'][\s\S]*?text:\s*["']AI["']/);
  assert.match(data, /introParts:\s*\[[\s\S]*?text:\s*["']Hey["'][\s\S]*?text:\s*["']SQL["'][\s\S]*?text:\s*["']AI["']/);
  assert.match(data, /descParts:\s*\[[\s\S]*?text:\s*["']GitHub Pages["']/);
  assert.match(data, /periodParts:\s*\[[\s\S]*?text:\s*["']2024 -["'][\s\S]*?text:\s*["']至今["']/);
  assert.match(data, /text:\s*["']SDK["']/);
  assert.match(data, /text:\s*["']AB["']/);
  assert.match(data, /text:\s*["']Distinction["']/);
});

test('data-driven text is rendered with DOM nodes rather than innerHTML', () => {
  assert.match(script, /function renderTextParts\([\s\S]*?document\.createElement\(['"]span['"]\)[\s\S]*?span\.textContent\s*=/);
  assert.match(script, /function partsToText\(/);
  assert.match(script, /renderTextParts\(heroDesc, user\.bioParts\)/);
  assert.match(script, /renderTextParts\(aboutIntro, about\.introParts\)/);
  assert.match(script, /renderTextParts\(field, exp\.(?:periodParts|titleParts|companyParts|descParts)/);
  assert.doesNotMatch(script, /(?:heroDesc|aboutIntro|row|node|card)\.innerHTML\s*=/);
});

test('Chinese content has an explicit Zpix mapping and MSc has English display intent', () => {
  assert.match(css, /#aboutIntro \.text-cn,[\s\S]*?\.stat-name \.text-cn,[\s\S]*?\.timeline-node \.node-company \.text-cn,[\s\S]*?\.timeline-node \.node-desc \.text-cn,[\s\S]*?\.timeline-node \.node-tag \.text-cn\s*\{[\s\S]*?font-family:\s*var\(--font-cn-pixel\)/);
  assert.match(data, /titleParts:\s*\[\s*\{\s*lang:\s*["']en["'],\s*text:\s*["']MSc Digital Strategy & Information Systems["']/);
  assert.match(script, /renderTextParts\(field, exp\.titleParts \|\| exp\.title, 'text-en-display'\)/);
});
