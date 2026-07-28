# PersonalSite Site Studio Design

## Goal

Provide a temporary, local-only visual editing studio for the portfolio site. The studio lets 岁安 edit every visible static or data-driven text item directly in the page, choose a font treatment and size per section, and preview a more playable terminal mini-game. When the content and typography are approved, a later maintenance pass will write the settled values into the permanent site source and remove the studio.

## Scope and constraints

- Work only in `D:\PersonalSite`; create local Git commits but do not push to GitHub.
- The studio opens from a compact, fixed right-side `编辑网站` control and stays closed by default.
- Editable areas are Navigation, Hero, About, Projects, Resume, Terminal, and Footer. The terminal mini-game canvas and its dynamic runtime output are excluded from direct content editing.
- Draft text and design selections are stored in browser `localStorage`, not written to `data.js` while experimenting.
- Existing Chinese/English language-aware rendering remains intact. Chinese uses Zpix; English uses the font selected for the relevant section.
- Visual-only assets, layout measurements, project external-link behavior, terminal commands, navigation, and the game canvas remain functional.

## User experience

Opening the studio shows a right-side panel with one collapsible control group per site section. Each group has a font-style selector and a size slider. Font styles are:

1. `经典像素` — Zpix Chinese, Press Start 2P titles, VT323 body copy.
2. `清晰终端` — Zpix Chinese, VT323 English text.
3. `硬核街机` — Zpix Chinese, Press Start 2P English text.
4. `代码等宽` — Zpix Chinese, Fira Code English text.

When edit mode is active, text-bearing elements carry a light visual affordance on hover. Clicking one changes it to an inline plain-text editor. Blur or Escape commits the text to the local draft; no HTML is accepted. A reset action restores either one section or all studio preferences to source defaults.

## Data flow and architecture

`js/site-studio.js` owns temporary draft state. It defines stable edit keys, reads and validates one `localStorage` record, applies section CSS custom properties / data attributes, and serializes text-only edits. `js/script.js` adds stable edit keys whenever it creates data-driven content. Static text in `index.html` receives stable edit keys directly.

The studio never writes user text with `innerHTML`; it uses `textContent`. Existing language spans stay as the rendering boundary for source content. A draft replacement becomes safe plain text within its editable field. The finalization pass will be a separate requested change: it will transfer approved values into `data.js`, `index.html`, and `stylesheet.css`, then remove `js/site-studio.js`, the panel markup, and its draft storage key.

## Typography behavior

Each section exposes `--studio-font-en-display`, `--studio-font-en-body`, and a section scale multiplier. Existing semantic font classes continue to select the Chinese or English family, but use the active section variables when a studio font choice is present. A section slider changes only that section's text scale; images, emoji, Canvas text, borders, spacing, and layout stay fixed. The current top-navigation global size control remains available and composes with a section's temporary multiplier.

## Mini-game difficulty

The terminal mini-game starts at speed `3` instead of `5`. It increases speed less frequently and in smaller increments, and never exceeds speed `5`. No temporary game-speed control is added.

## Error handling and persistence

Invalid or missing draft records fall back to the source page. Storage access failures leave the site usable with the studio changes applied only for the current page session. Reset clears only the studio draft key; it does not affect the existing global font-scale preference.

## Testing and acceptance

- Unit tests prove draft validation, section font/size application, safe text-only persistence, reset behavior, and the mini-game speed constants.
- Existing typography and font-scale tests continue passing.
- Browser validation covers edit-mode entry/exit, inline editing, draft restoration after reload, four font choices, independent section scaling, keyboard/focus behavior, desktop and mobile overflow, navigation, project links, terminal commands, and one playable mini-game session.
- The worktree remains local-only; no GitHub push occurs.
