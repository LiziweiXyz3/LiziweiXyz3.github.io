# Bilingual Titles and Songbang Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish reusable Chinese/English project-title styles and show Songbang with a local pixel SVG icon.

**Architecture:** Project data gains optional `titleEn` and `image` fields. The existing renderer emits independent Chinese and English title spans, plus an image element only when `image` is set. Central CSS variables control both language fonts and their visual-size ratio.

**Tech Stack:** HTML, CSS, vanilla JavaScript, SVG, Git.

## Global Constraints

- Chinese project titles use Zpix; English project titles use the existing pixel font.
- The title-size ratio, line height, and mixed-language gap are CSS variables for reuse.
- Songbang must use a local SVG, not an emoji, and the SVG must be decorative with empty alt text.
- Projects without `titleEn` or `image` keep working without extra markup or a broken image.
- Preserve whole-card new-tab links, existing layout, and existing project descriptions/tags.
- Commit locally only; do not push PersonalSite.

---

### Task 1: Add reusable bilingual title rendering and SVG image support

**Files:**
- Create: `D:\PersonalSite\assets\songbang-knot.svg`
- Modify: `D:\PersonalSite\data.js:53-72`
- Modify: `D:\PersonalSite\js\script.js:177-201`
- Modify: `D:\PersonalSite\stylesheet.css:31-36, 480-499`

**Interfaces:**
- Consumes: `title` (Chinese title), optional `titleEn` (English title), optional `image` (local SVG path), and existing `icon` project fields.
- Produces: `.project-title-cn`, optional `.project-title-en`, and either `.project-image` or the existing `.project-icon` markup.

- [ ] **Step 1: Write and run failing static checks**

Run:

```powershell
$data = Get-Content -Raw -LiteralPath data.js
$script = Get-Content -Raw -LiteralPath js\script.js
if ($data.Contains('titleEn:') -or $script.Contains('project-title-cn')) { exit 1 } else { Write-Output 'Bilingual title support missing as expected' }
```

Expected: `Bilingual title support missing as expected`.

- [ ] **Step 2: Add the Songbang SVG asset and project data**

Create `assets/songbang-knot.svg` as a 64×64 decorative pixel-style SVG using `shape-rendering="crispEdges"`, a transparent background, and two interlocking cyan/purple square-link paths. Give the root SVG `aria-hidden="true"`.

Change Songbang data to:

```javascript
title: "松绑",
titleEn: "Songbang",
image: "assets/songbang-knot.svg"
```

Keep its description, tags, status, and GitHub link unchanged. Keep the personal-website project unchanged.

- [ ] **Step 3: Update renderer and CSS tokens**

Use these renderer values:

```javascript
var titleHtml =
  '<span class="project-title-cn">' + proj.title + '</span>' +
  (proj.titleEn ? '<span class="project-title-en">' + proj.titleEn + '</span>' : '');
var iconHtml = proj.image
  ? '<img class="project-image" src="' + proj.image + '" alt="">'
  : '<div class="project-icon">' + (proj.icon || '📦') + '</div>';
```

Render `iconHtml` before the title and render `titleHtml` inside the existing `<h3 class="project-title">`.

Add these root variables:

```css
--font-title-cn: 'Zpix', monospace;
--font-title-en: 'Press Start 2P', monospace;
--font-title-cn-scale: 1.05;
--font-title-en-scale: 0.9;
--project-title-leading: 1.25;
--project-title-gap: 0.45em;
```

Add title/image styles that use those variables. The title must be an inline flex row with baseline alignment and the configured gap; Chinese and English spans must use their corresponding font and scale. `.project-image` must render at 40px square with `image-rendering: pixelated`, `display: block`, and the same 12px bottom margin as `.project-icon`.

- [ ] **Step 4: Run focused verification**

Run:

```powershell
node --check data.js
node --check js\script.js
$data = Get-Content -Raw -LiteralPath data.js
$script = Get-Content -Raw -LiteralPath js\script.js
$css = Get-Content -Raw -LiteralPath stylesheet.css
@('titleEn: "Songbang"', 'image: "assets/songbang-knot.svg"', 'project-title-cn', 'project-title-en', 'project-image', '--font-title-cn-scale', '--font-title-en-scale') | ForEach-Object { if (-not ($data + $script + $css).Contains($_)) { throw "Missing $_" } }
if (-not (Test-Path -LiteralPath assets\songbang-knot.svg)) { throw 'Songbang SVG missing' }
$svg = Get-Content -Raw -LiteralPath assets\songbang-knot.svg
if ($svg -notmatch 'shape-rendering="crispEdges"' -or $svg -notmatch 'aria-hidden="true"') { throw 'SVG accessibility or pixel rendering attributes missing' }
```

Expected: both Node syntax checks and all PowerShell assertions pass.

- [ ] **Step 5: Commit locally without pushing**

Run:

```powershell
git add data.js js\script.js stylesheet.css assets\songbang-knot.svg
git commit -m "feat: improve bilingual project titles"
git status --short --branch
```

Expected: one local commit on `main` and no `git push` command.
