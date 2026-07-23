# Project Card Click Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every linked Projects card open its repository in a new browser tab and remove the separate VIEW link.

**Architecture:** `renderProjects()` will select an anchor element only for projects with a `link`; cards without a link remain `<div>` elements. A small CSS modifier keeps anchor cards visually identical to existing cards and adds an accessible focus outline.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Git.

## Global Constraints

- A linked card must be an `<a>` with `target="_blank"` and `rel="noopener"`.
- A card without `link` remains non-clickable.
- Do not render a separate `VIEW` link.
- Preserve existing card layout and hover styling; add visible keyboard focus styling.
- Commit locally only; do not push the PersonalSite repository.

---

### Task 1: Render linked projects as whole-card anchors

**Files:**
- Modify: `D:\PersonalSite\js\script.js:177-200`
- Modify: `D:\PersonalSite\stylesheet.css:441-453`

**Interfaces:**
- Consumes: project objects with optional `link` values from `D:\PersonalSite\data.js`.
- Produces: an `<a class="project-card project-card-link">` for linked projects and a `<div class="project-card">` otherwise.

- [ ] **Step 1: Write and run the failing static check**

Run:

```powershell
$script = Get-Content -Raw -LiteralPath js\script.js
if ($script.Contains('project-card-link')) { exit 1 } else { Write-Output 'Whole-card link behavior missing as expected' }
```

Expected: `Whole-card link behavior missing as expected`.

- [ ] **Step 2: Implement whole-card linking**

Replace the unconditional card element creation and separate `linkHtml` with this logic:

```javascript
var card = document.createElement(proj.link ? 'a' : 'div');
card.className = 'project-card' + (proj.link ? ' project-card-link' : '');

if (proj.link) {
  card.href = proj.link;
  card.target = '_blank';
  card.rel = 'noopener';
}
```

Keep the existing status, icon, title, description, and tag markup. Remove both the `linkHtml` variable and the final VIEW-link markup. Add this CSS after the existing `.project-card` rule:

```css
.project-card-link {
  display: block;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}
.project-card-link:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 3px;
}
```

- [ ] **Step 3: Run focused verification**

Run:

```powershell
node --check js\script.js
$script = Get-Content -Raw -LiteralPath js\script.js
$css = Get-Content -Raw -LiteralPath stylesheet.css
@("document.createElement(proj.link ? 'a' : 'div')", "card.target = '_blank'", "card.rel = 'noopener'", 'project-card-link:focus-visible') | ForEach-Object { if (-not ($script + $css).Contains($_)) { throw "Missing $_" } }
if ($script.Contains('VIEW')) { throw 'Separate VIEW link still rendered' }
```

Expected: Node exits with code 0 and PowerShell exits without an exception.

- [ ] **Step 4: Commit locally without pushing**

Run:

```powershell
git add js\script.js stylesheet.css
git commit -m "feat: make project cards clickable"
git status --short --branch
```

Expected: a local commit on `main` and no `git push` command.
