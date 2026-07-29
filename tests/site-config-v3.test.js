const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../js/site-config.js');

const root = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'site-config.json'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(root, 'site-config.schema.json'), 'utf8'));
const editorHtml = fs.readFileSync(path.join(root, 'editor.html'), 'utf8');
const editorCss = fs.readFileSync(path.join(root, 'editor.css'), 'utf8');
const editorScript = fs.readFileSync(path.join(root, 'js', 'studio-editor.js'), 'utf8');
const runtimeScript = fs.readFileSync(path.join(root, 'js', 'site-runtime.js'), 'utf8');
const publicScript = fs.readFileSync(path.join(root, 'js', 'script.js'), 'utf8');
const publicCss = fs.readFileSync(path.join(root, 'stylesheet.css'), 'utf8');
const serverScript = fs.readFileSync(path.join(root, 'scripts', 'studio-server.js'), 'utf8');
const startEditorScript = fs.readFileSync(path.join(root, 'start-editor.cmd'), 'utf8');

test('V3 config uses stable ids for reorderable content', function () {
  assert.equal(config.version, 3);
  assert.deepEqual(config.content.experiences.map((item) => item.id), [
    'huya-2024', 'jingdong-2023', 'southampton-2021'
  ]);
  assert.ok(config.content.projects.every((item) => typeof item.id === 'string'));
  assert.ok(config.content.about.skills.every((item) => typeof item.id === 'string'));
});

test('site brand uses one Press Start 2P run at twelve pixels', function () {
  assert.equal(config.content.static['nav.brand'], 'SUIAN');
  assert.deepEqual(config.styles.elements['nav.brand'], {
    fontEn: 'press-start',
    size: 12
  });
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /data-edit-key="nav\.brand"[^>]*lang="en">SUIAN<\/span>/);
  assert.match(publicCss, /\.nav-brand::before,\s*\.nav-brand::after\s*\{[\s\S]*2px 0 \/ 2px 2px no-repeat[\s\S]*2px 4px \/ 2px 2px no-repeat/);
  assert.match(runtimeScript, /element\.getAttribute\('lang'\) === 'en'[\s\S]*lang: 'en'/);
});

test('project cards use repository-backed stacks and include GameLive ChatBI', function () {
  const projects = Object.fromEntries(config.content.projects.map((item) => [item.id, item]));

  assert.deepEqual(projects['personal-site'].tags.map((tag) => tag.text), [
    'HTML', 'CSS', 'JavaScript'
  ]);
  assert.deepEqual(projects.songbang.tags.map((tag) => tag.text), [
    'React', 'TypeScript', 'Vite', 'Tailwind CSS', 'IndexedDB'
  ]);
  assert.equal(projects.songbang.status, 'wip');

  assert.equal(projects['gamelive-chatbi'].link, 'https://github.com/LiziweiXyz3/gamelive-chatbi');
  assert.equal(projects['gamelive-chatbi'].status, 'done');
  assert.equal(projects['gamelive-chatbi'].description, '用自然语言查询并诊断游戏直播经营数据。');
  assert.deepEqual(projects['gamelive-chatbi'].tags.map((tag) => tag.text), [
    'Dify', 'FastAPI', 'DuckDB', 'SQLGlot', 'Python'
  ]);
});

test('versioned JSON Schema describes the complete formal configuration', function () {
  assert.equal(schema.properties.version.const, 3);
  assert.ok(schema.$defs.textStyle.properties.fontEn.enum.includes('zpix'));
  assert.ok(schema.$defs.textStyle.properties.gradient.enum.includes('arcade-rainbow'));
  assert.match(editorHtml, /<option value="zpix">Zpix<\/option>/);
  assert.match(runtimeScript, /zpix:\s*"'Zpix', monospace"/);
  assert.equal(schema.properties.game.properties.maxSpeed.maximum, 2.5);
  assert.deepEqual(schema.required, [
    'version', 'content', 'theme', 'styles', 'cursor', 'effects', 'assets', 'game'
  ]);
});

test('normalization locks built-in game settings and preserves per-element styles', function () {
  const next = api.clone(config);
  next.game.maxSpeed = 8;
  next.game.startSpeed = 5;
  next.game.hangFrames = 99;
  next.styles.elements['resume.huya-2024.title'] = {
    fontCn: 'cubic-11',
    fontEn: 'ibm-plex-mono',
    size: 26,
    mobileSize: 20,
    color: '#ffffff'
  };
  const normalized = api.normalizeConfig(next, config);
  assert.equal(normalized.game.maxSpeed, 1.8);
  assert.equal(normalized.game.startSpeed, 0.9);
  assert.equal(normalized.game.hangFrames, 10);
  assert.equal(normalized.styles.elements['resume.huya-2024.title'].fontCn, 'cubic-11');
  assert.equal(normalized.styles.elements['resume.huya-2024.title'].mobileSize, 20);
});

test('formal game configuration uses the fixed playable speed range', function () {
  assert.equal(config.game.startSpeed, 0.9);
  assert.equal(config.game.maxSpeed, 1.8);
  assert.equal(config.game.speedStep, 0.05);
  assert.equal(config.game.speedEveryFrames, 450);
  assert.equal(api.validateConfig(config).valid, true);
  const stale = api.clone(config);
  stale.game.startSpeed = 1.2;
  stale.game.maxSpeed = 2.5;
  const normalized = api.normalizeConfig(stale, config);
  assert.equal(normalized.game.startSpeed, 0.9);
  assert.equal(normalized.game.maxSpeed, 1.8);
  assert.equal(normalized.game.speedStep, 0.05);
  assert.equal(normalized.game.speedEveryFrames, 450);
});

test('every typography property updates independently without touching sibling fields or modules', function () {
  const fullStyle = {
    fontCn: 'zpix',
    fontEn: 'vt323',
    size: 18,
    mobileSize: 16,
    lineHeight: 1.6,
    weight: 700,
    italic: false,
    letterSpacing: 2,
    align: 'center',
    color: 'rgba(66, 133, 244, 0.8)'
  };
  const siblingStyle = {
    fontCn: 'cubic-11',
    fontEn: 'fira-code',
    size: 21,
    lineHeight: 1.8,
    weight: 400,
    italic: true,
    letterSpacing: 1,
    align: 'left',
    color: '#34A853'
  };
  const base = api.clone(config);
  base.styles.elements['hero.scrollHint'] = api.clone(fullStyle);
  base.styles.elements['hero.subtitle'] = api.clone(siblingStyle);
  base.styles.elements['resume.southampton-2021.title'] = api.clone(siblingStyle);
  const changes = {
    fontCn: 'boutique-7x7',
    fontEn: 'press-start',
    size: 24,
    mobileSize: 20,
    lineHeight: 2.1,
    weight: 400,
    italic: true,
    letterSpacing: 5,
    align: 'right',
    color: '#EA4335',
    gradient: 'arcade-rainbow'
  };

  Object.entries(changes).forEach(function ([property, value]) {
    const next = api.updateElementStyle(base, 'hero.scrollHint', property, value);
    assert.equal(next.styles.elements['hero.scrollHint'][property], value, property + ' 应更新');
    Object.keys(fullStyle).filter(function (key) { return key !== property; }).forEach(function (key) {
      assert.deepEqual(next.styles.elements['hero.scrollHint'][key], fullStyle[key],
        property + ' 不应改变同元素的 ' + key);
    });
    assert.deepEqual(next.styles.elements['hero.subtitle'], siblingStyle,
      property + ' 不应影响同模块的其他元素');
    assert.deepEqual(next.styles.elements['resume.southampton-2021.title'], siblingStyle,
      property + ' 不应影响其他模块');
    assert.deepEqual(base.styles.elements['hero.scrollHint'], fullStyle,
      property + ' 不应回写原草稿对象');
  });
});

test('removing one style property and save normalization preserve every other property', function () {
  const base = api.clone(config);
  const style = {
    fontCn: 'zpix',
    fontEn: 'zpix',
    size: 19,
    lineHeight: 1.7,
    weight: 700,
    italic: true,
    letterSpacing: 3,
    align: 'right',
    color: '#FBBC05'
  };
  base.styles.elements['hero.title'] = api.clone(style);
  base.styles.elements['resume.huya-2024.period'] = {
    fontCn: 'cubic-11', size: 15, lineHeight: 1.4, color: '#4285F4'
  };

  const changed = api.updateElementStyle(base, 'hero.title', 'color', undefined);
  const saved = api.normalizeConfig(JSON.parse(JSON.stringify(changed)), base);
  const expected = api.clone(style);
  delete expected.color;
  assert.deepEqual(saved.styles.elements['hero.title'], expected);
  assert.deepEqual(saved.styles.elements['resume.huya-2024.period'],
    base.styles.elements['resume.huya-2024.period']);
});

test('Hero gradient and solid color modes replace only each other', function () {
  const base = api.clone(config);
  base.styles.elements['hero.title'] = {
    fontCn: 'zpix',
    size: 28,
    lineHeight: 1.4,
    weight: 700,
    letterSpacing: 4,
    align: 'center',
    color: '#EA4335'
  };
  base.styles.elements['resume.huya-2024.title'] = {
    fontCn: 'cubic-11', size: 18, lineHeight: 1.6, color: '#e0e0e0'
  };

  let gradient = api.updateElementStyle(base, 'hero.title', 'color', undefined);
  gradient = api.updateElementStyle(gradient, 'hero.title', 'gradient', 'cyber-mint');
  assert.equal(gradient.styles.elements['hero.title'].color, undefined);
  assert.equal(gradient.styles.elements['hero.title'].gradient, 'cyber-mint');
  assert.equal(gradient.styles.elements['hero.title'].size, 28);
  assert.equal(gradient.styles.elements['hero.title'].lineHeight, 1.4);
  assert.deepEqual(gradient.styles.elements['resume.huya-2024.title'],
    base.styles.elements['resume.huya-2024.title']);

  let solid = api.updateElementStyle(gradient, 'hero.title', 'gradient', undefined);
  solid = api.updateElementStyle(solid, 'hero.title', 'color', '#FBBC05');
  assert.equal(solid.styles.elements['hero.title'].gradient, undefined);
  assert.equal(solid.styles.elements['hero.title'].color, '#FBBC05');
  assert.equal(solid.styles.elements['hero.title'].letterSpacing, 4);
  assert.deepEqual(solid.styles.elements['resume.huya-2024.title'],
    base.styles.elements['resume.huya-2024.title']);
});

test('reordering experiences does not change their style keys', function () {
  const next = api.clone(config);
  next.styles.elements['resume.huya-2024.title'] = { color: '#ff0000' };
  next.content.experiences.reverse();
  const normalized = api.normalizeConfig(next, config);
  assert.equal(normalized.content.experiences[2].id, 'huya-2024');
  assert.equal(normalized.styles.elements['resume.huya-2024.title'].color, '#ff0000');
});

test('legacy V2 draft maps index-based resume settings to stable ids', function () {
  const migrated = api.migrateLegacyDraft({
    version: 2,
    text: { 'resume.0.title': '高级数据分析师' },
    textStyles: { 'resume.0.title': { font: 'code', scale: 125, bold: true, italic: false } }
  }, config);
  assert.equal(migrated.content.overrides.text['resume.huya-2024.title'], '高级数据分析师');
  assert.equal(migrated.styles.elements['resume.huya-2024.title'].fontEn, 'fira-code');
  assert.equal(migrated.styles.elements['resume.huya-2024.title'].weight, 700);
});

test('game validation rejects impossible compact obstacle gaps', function () {
  const next = api.clone(config);
  next.game.sequences[2].items[0].gap = 10;
  const validation = api.validateConfig(next);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(' '), /内部间距至少为 24/);
});

test('game validation rejects jump physics that cannot clear the large obstacle', function () {
  const next = api.clone(config);
  next.game.jumpVelocity = -3;
  next.game.riseGravity = 0.5;
  const validation = api.validateConfig(next);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(' '), /无法越过大仙人掌/);
});

test('formal save validation rejects incomplete configurations', function () {
  const incomplete = api.clone(config);
  delete incomplete.content.experiences;
  delete incomplete.cursor;
  const validation = api.validateConfig(incomplete);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(' '), /缺少履历内容/);
  assert.match(validation.errors.join(' '), /缺少光标设置/);
});

test('editor uses a two-column preview and contextual editor without redundant tabs', function () {
  assert.match(editorHtml, /index\.html\?studio-preview=1/);
  assert.match(editorHtml, /id="discardDraftButton"/);
  assert.match(editorHtml, /id="structureTree"/);
  assert.match(editorHtml, /id="hideEditorButton"/);
  assert.match(editorHtml, /打开公开主页|公开主页/);
  assert.match(editorHtml, /data-view="element"/);
  assert.match(editorHtml, /data-view="cursor"/);
  assert.match(editorHtml, /data-view="history"/);
  assert.doesNotMatch(editorHtml, /data-view="game"|终端小游戏|更多微调（一般不用改）/);
  assert.doesNotMatch(editorScript, /createToolItem\('game'|GAME_PRESETS|startGamePreview|renderGame/);
  assert.doesNotMatch(editorHtml, /data-tab=/);
  assert.doesNotMatch(editorHtml, /studio-topbar|hidePreviewButton|showPreviewButton|折叠预览|手机字号|data-viewport|typewriterControl|自定义光标|heroStandUpload|projectIconUpload|旧版草稿工具/);
  assert.doesNotMatch(editorHtml, /data-view="theme"|data-view="effects"/);
  assert.doesNotMatch(editorScript, /模块排序|createModuleOrderSection|move-module|hide-module|show-module/);
  assert.match(editorScript, /personal-site-studio-v3-draft/);
  assert.match(editorScript, /studio:apply-draft/);
});

test('preview bridge accepts only same-origin editor messages', function () {
  assert.match(runtimeScript, /event\.origin !== window\.location\.origin/);
  assert.match(runtimeScript, /studio:apply-draft/);
  assert.match(runtimeScript, /studio:select/);
  assert.match(runtimeScript, /studio:start-game/);
});

test('runtime repairs stale language labels before applying independent fonts', function () {
  assert.match(runtimeScript, /function repairMislabeledTextParts\(element\)/);
  assert.match(runtimeScript, /repairMislabeledTextParts\(element\);\s*element\.setAttribute\('data-studio-style'/);
  assert.match(runtimeScript, /hasLatin && part\.lang !== 'en'/);
  assert.match(runtimeScript, /hasChinese && part\.lang !== 'zh-CN'/);
});

test('element formatting applies only the properties explicitly changed', function () {
  assert.match(runtimeScript, /data-studio-size/);
  assert.match(runtimeScript, /data-studio-font-cn/);
  assert.match(runtimeScript, /data-studio-font-en/);
  assert.match(runtimeScript, /data-studio-color/);
  assert.match(runtimeScript, /typeof style\.italic === 'boolean'/);
  assert.match(editorHtml, /id="boldControl"/);
  assert.match(editorHtml, /字号（px）/);
  assert.match(editorScript, /letterSpacingOutput'\)\.textContent = value \+ 'px'/);
  assert.doesNotMatch(editorHtml, /继承默认|字重|weightControl/);
  assert.match(editorScript, /function mutateElementStyle/);
  assert.match(editorScript, /SiteConfig\.updateElementStyle\(draft, targetKey, property, value\)/);
  assert.doesNotMatch(editorScript, /styleForKey\(/);
  assert.match(editorHtml, /id="terminalTypographyNotice"[^>]*>终端命令文字已统一为 Zpix · 15px/);
  assert.match(editorScript, /usesLockedTerminalTypography[\s\S]*?'terminal\.intro'[\s\S]*?'terminal\.prompt'[\s\S]*?'terminal\.inputPlaceholder'/);
  assert.match(editorScript, /sizeField'\)\.hidden = usesLockedTerminalTypography/);
  const staleTerminal = api.clone(config);
  staleTerminal.styles.elements['terminal.prompt'] = { fontEn: 'fira-code', size: 22 };
  const normalizedTerminal = api.normalizeConfig(staleTerminal, config);
  assert.deepEqual(
    {
      fontCn: normalizedTerminal.styles.elements['terminal.prompt'].fontCn,
      fontEn: normalizedTerminal.styles.elements['terminal.prompt'].fontEn,
      size: normalizedTerminal.styles.elements['terminal.prompt'].size
    },
    { fontCn: 'zpix', fontEn: 'zpix', size: 15 }
  );
});

test('editor distinguishes gradient text from solid colors and labels the quick palette', function () {
  assert.match(runtimeScript, /colorMode:\s*hasGradientText \? 'gradient' : 'solid'/);
  assert.match(runtimeScript, /gradient:\s*hasGradientText \? backgroundImage/);
  assert.match(runtimeScript, /defaultGradient:\s*defaultGradient/);
  assert.match(editorHtml, /id="gradientColorPreview"/);
  assert.match(editorHtml, /id="heroGradientControls"/);
  assert.match(editorHtml, /id="heroGradientPresets"/);
  assert.match(editorHtml, />快捷色板</);
  assert.match(editorHtml, /id="restoreGradientButton"/);
  assert.match(editorHtml, /<section class="color-settings"[\s\S]*?>快捷色板<[\s\S]*?<\/section>/);
  assert.doesNotMatch(editorHtml, /精细排版/);
  assert.match(editorScript, /当前使用渐变色；改成单色后，这里会提示文字是否容易看清/);
  assert.match(editorScript, /文字清晰易读/);
  assert.match(editorScript, /文字不够清晰/);
  assert.doesNotMatch(editorScript, /通过 AA/);
  assert.match(editorScript, /restoreGradientButton'\)\.hidden = !defaultGradient \|\| \(!style\.color && !style\.gradient\)/);
  assert.match(editorScript, /function mutateElementAppearance/);
  assert.match(editorScript, /街机彩虹/);
  assert.match(editorScript, /赛博薄荷/);
  assert.match(runtimeScript, /data-studio-gradient/);
  assert.match(runtimeScript, /--studio-gradient/);
  assert.match(publicCss, /data-studio-color="true"[\s\S]*?-webkit-text-fill-color:\s*var\(--studio-color\)\s*!important/);
  assert.match(publicCss, /data-studio-gradient="true"[\s\S]*?background-image:\s*var\(--studio-gradient\)\s*!important/);
});

test('editor can add and remove About items, project stacks and resume highlights', function () {
  assert.match(editorScript, /createGroupHeader\('属性条',[\s\S]*?'新增属性条'/);
  assert.match(editorScript, /createGroupHeader\('技能',[\s\S]*?'新增技能'/);
  assert.match(editorScript, /createGroupHeader\('属性条'/);
  assert.match(editorScript, /createGroupHeader\('技能'/);
  assert.match(editorScript, /tree-record-remove/);
  assert.match(editorCss, /\.tree-group-header\s*\{/);
  assert.match(editorCss, /\.tree-record-remove\s*\{/);
  assert.match(editorScript, /label:\s*'属性条颜色'/);
  assert.match(editorScript, /label:\s*'技能色块颜色'/);
  assert.match(editorScript, /新增技术栈/);
  assert.match(editorScript, /delete:project-tag:/);
  assert.match(editorScript, /新增亮点/);
  assert.match(editorScript, /delete:highlight:/);
  assert.match(editorHtml, /id="fontVisualHint"/);
  assert.match(editorScript, /Press Start 2P 的视觉尺寸偏大/);
});

test('game tuning is an internal website behavior rather than an editor feature', function () {
  assert.doesNotMatch(editorHtml, /gameStartSpeed|gameJumpVelocity|sequenceEditor|testGameButton/);
  assert.doesNotMatch(editorScript, /gameStartSpeed|gameJumpVelocity|sequence:add|studio:start-game/);
  assert.match(publicScript, /startSpeed:\s*0\.9/);
  assert.match(publicScript, /maxSpeed:\s*1\.8/);
  assert.match(publicScript, /speedEveryFrames:\s*450/);
  assert.match(publicScript, /isSequenceUnlocked\(sequence, speed, frame\)/);
  assert.match(publicScript, /sequenceWeight/);
});

test('reorderable content uses drag handles instead of visible move buttons', function () {
  assert.match(editorScript, /function createDragHandle/);
  assert.match(editorScript, /addEventListener\('dragstart'/);
  assert.match(editorScript, /addEventListener\('drop'/);
  assert.match(editorScript, /drag-sort:/);
  assert.match(editorScript, /按技能等级降序排列/);
  assert.match(editorScript, /sort:skills:level-desc/);
  assert.doesNotMatch(editorScript, /\['上移',\s*-1\]/);
  assert.doesNotMatch(editorScript, /\['下移',\s*1\]/);
  assert.match(editorCss, /\.tree-drag-handle\s*\{/);
  assert.match(editorCss, /\.tree-sort-row\.drop-before::before/);
});

test('preview stays visible while the editor scrolls and can collapse', function () {
  assert.match(editorCss, /\.inspector-body\s*\{[\s\S]*?grid-template-rows:[\s\S]*?overflow:\s*hidden;/);
  assert.match(editorCss, /\.settings-group\s*\{[\s\S]*?overflow-y:\s*auto;/);
  assert.match(editorCss, /\.studio-tree\s*\{[\s\S]*?overflow-y:\s*auto;/);
  assert.doesNotMatch(editorCss, /data-preview-collapsed="true"/);
  assert.match(editorCss, /data-editor-collapsed="true"/);
  assert.doesNotMatch(editorScript, /setPanelCollapsed|showPreviewButton|hidePreviewButton/);
  assert.match(editorScript, /setEditorCollapsed\(true\)/);
});

test('cursor choices are pixel presets without asset uploads', function () {
  assert.deepEqual(schema.properties.cursor.properties.preset.enum, [
    'pixel-arrow', 'pixel-hand', 'pixel-crosshair', 'pixel-terminal', 'pixel-outline'
  ]);
  assert.equal(schema.properties.cursor.properties.color.pattern, '^#[0-9A-Fa-f]{6}$');
  assert.match(editorScript, /像素箭头/);
  assert.match(editorScript, /像素手型/);
  assert.match(editorHtml, /id="cursorColorControl"/);
  assert.match(editorHtml, /id="cursorColorHexControl"/);
  assert.match(editorHtml, /id="cursorColorSwatches"/);
  assert.match(runtimeScript, /cursorColor = cursor && \/\^#\[0-9a-f\]\{6\}\$\/i/);
  assert.match(runtimeScript, /stroke="' \+ cursorColor \+ '"/);
  assert.doesNotMatch(editorHtml, /type="file"[^>]*(?:cursor|Hero|项目图标)/i);
});

test('cursor color normalizes independently and defaults to pixel purple', function () {
  const defaultCursor = api.normalizeConfig(Object.assign(api.clone(config), {
    cursor: { preset: 'pixel-arrow' }
  }), config);
  assert.equal(defaultCursor.cursor.color, '#b388ff');

  const next = api.clone(config);
  next.cursor.color = '#EA4335';
  const normalized = api.normalizeConfig(next, config);
  assert.equal(normalized.cursor.color, '#EA4335');
  assert.equal(normalized.cursor.preset, next.cursor.preset);
});

test('destructive confirmations and status messages stay inside the editor at the lower right', function () {
  assert.match(editorHtml, /id="confirmPanel"/);
  assert.match(editorHtml, /role="alertdialog"/);
  assert.match(editorScript, /function confirmAction/);
  assert.doesNotMatch(editorScript, /window\.confirm|confirm\(/);
  assert.match(editorCss, /\.studio-toast\s*\{[\s\S]*?right:\s*18px;[\s\S]*?bottom:\s*18px;/);
  assert.match(editorCss, /\.studio-confirm\s*\{[\s\S]*?right:\s*18px;[\s\S]*?bottom:\s*18px;/);
});

test('local server uses atomic saves, restricted assets and a 20 version history', function () {
  assert.match(serverScript, /fsp\.rename\(temp, filePath\)/);
  assert.match(serverScript, /files\.slice\(20\)/);
  assert.match(serverScript, /assets', 'custom/);
  assert.match(serverScript, /\['cursor', 'avatar', 'project-icon'\]/);
  assert.match(serverScript, /target\.startsWith\(ROOT \+ path\.sep\)/);
  assert.match(serverScript, /光标尺寸不能超过 128 × 128/);
  assert.match(serverScript, /素材文件内容与格式不匹配/);
  assert.match(serverScript, /function serverIsStale/);
  assert.match(serverScript, /stale:\s*serverIsStale\(\)/);
});

test('editor starter reuses an existing local service and opens the editor directly', function () {
  assert.match(startEditorScript, /api\/health/);
  assert.match(startEditorScript, /\$health\.stale -eq \$false/);
  assert.match(startEditorScript, /Stop-Process -Id \$serverPid/);
  assert.match(editorScript, /本地编辑器服务代码已更新，请重新双击 start-editor\.cmd/);
  assert.match(startEditorScript, /start "" "%EDITOR_URL%"/);
  assert.doesNotMatch(startEditorScript, /studio-server\.js --open/);
});

test('public index remains editor-free', function () {
  const publicHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(publicHtml, /studio-editor\.js/);
  assert.doesNotMatch(publicHtml, /siteStudioToggle/);
  assert.match(publicHtml, /site-config\.js/);
  assert.match(publicHtml, /site-runtime\.js/);
});

test('public page applies saved styles after terminal edit keys are initialized', function () {
  const setupIndex = publicScript.indexOf('setupTerminal();');
  const applyIndex = publicScript.indexOf('applyCurrentSiteConfig();', setupIndex);

  assert.ok(setupIndex >= 0, 'terminal initialization should run on public-page boot');
  assert.ok(applyIndex > setupIndex, 'saved styles should be applied after terminal edit keys exist');
  assert.match(
    publicScript,
    /applyConfig:\s*function\s*\(config\)[\s\S]*?renderConfiguredContent\(\);[\s\S]*?applyCurrentSiteConfig\(\);/
  );
});
