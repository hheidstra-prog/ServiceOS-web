# AI Designer — Implementation Status

**Date:** 2026-02-11
**Status:** CODE COMPLETE — Needs manual browser testing

---

## What Was Built

Replaced the 5-step template wizard (`ai-site-form.tsx`) with a conversational AI Designer at `/sites/new`. Two-panel layout: chat with an AI creative director (left) + live moodboard (right). The AI discusses visual design preferences only (it already knows the business from settings), builds a moodboard with color palettes, typography, style keywords, and layout preferences, then synthesizes a design direction. User clicks "Generate my site" and the design tokens flow into the existing site generation pipeline.

---

## Verification Checklist

**Automated checks (PASSED):**
- [x] TypeScript: `tsc --noEmit` — zero errors
- [x] IDE diagnostics: zero issues across all new/modified files
- [x] Dev server: `/sites/new` compiles successfully, no compilation errors
- [x] No dangling imports of deleted `ai-site-form.tsx`

**Manual browser testing (TODO):**
- [ ] Navigate to `/sites` → "Generate with AI" links to `/sites/new`
- [ ] Load `/sites/new` → two-panel layout with AI opening message
- [ ] Chat with AI → asks visual design questions, not business questions
- [ ] Moodboard populates → color palettes, typography, keywords appear in right panel
- [ ] Pin/remove moodboard items
- [ ] Drop/attach an image → uploads, AI analyzes and adds moodboard items
- [ ] AI calls `update_design_direction` → summary card with "Generate my site" button appears
- [ ] Click "Generate my site" → site created, redirects to `/sites/{id}`
- [ ] Check generated site → design tokens, colors, fonts match conversation
- [ ] Mobile responsive → moodboard as Sheet on small screens

---

## All Files Changed

### Created (19 files)

```
apps/admin/src/app/(dashboard)/sites/new/
├── types.ts                           # MoodboardItem union, DesignDirection, DesignerState, DesignerAction
├── moodboard-reducer.ts               # useReducer for all state (messages, moodboard, loading)
├── designer-prompt.ts                 # System prompt builder + 6 Anthropic tool definitions
├── actions.ts                         # Server actions: getBusinessContext, sendMessage, createSite
├── page.tsx                           # Server component: auth, load context, render AIDesigner
└── components/
    ├── ai-designer.tsx                # Main orchestrator: useReducer, 2-panel layout, generate flow
    ├── chat/
    │   ├── designer-chat.tsx          # Chat container: send flow, tool call processing
    │   ├── designer-input.tsx         # Auto-resize textarea, send/attach buttons, image previews
    │   ├── designer-message.tsx       # Message bubble: AI left (violet), user right, bold parsing
    │   ├── designer-message-list.tsx  # Scrollable list, auto-scroll, loading indicator
    │   └── image-drop-zone.tsx        # Drag-and-drop overlay, file validation
    └── moodboard/
        ├── moodboard-panel.tsx        # Right panel: sections grouped by type, empty state
        ├── color-palette-card.tsx     # Color swatches with hex labels, pin/remove
        ├── typography-card.tsx        # Google Font preview, heading/body/vibe
        ├── style-keyword-tag.tsx      # Category-colored pills (mood/density/shape/feel)
        ├── uploaded-image-card.tsx    # Thumbnail, extracted colors, expandable analysis
        └── design-direction-summary.tsx  # Final direction: swatches, fonts, confidence, Generate button

apps/admin/src/app/api/designer/upload/
└── route.ts                           # POST: auth, validate image/10MB, upload to Vercel Blob
```

### Modified (2 files)

| File | Change |
|------|--------|
| `apps/admin/src/lib/ai-site-generator.ts` | Added `presetDesignTokens?` and `moodSummary?` params to `generateSiteFromDescription()`. Backward-compatible. Preset tokens override AI output. |
| `apps/admin/src/app/(dashboard)/sites/sites-list.tsx` | "Generate with AI" → `<Link href="/sites/new">`. Removed `isAIFormOpen`, `AISiteForm` import/usage. |

### Deleted (1 file)

| File | Reason |
|------|--------|
| `apps/admin/src/app/(dashboard)/sites/ai-site-form.tsx` | Old 5-step wizard, fully replaced. |

---

## Architecture Decisions

1. **Client-side moodboard (useReducer)** — Not in DB. Working document; only the final Site/SiteTheme persists.
2. **Separate AI flow** — Own system prompt, tools, persona. No business tools. Visual design only.
3. **No streaming** — Short responses (2-4 sentences), tool_use requires non-streaming. Loading dots suffice.
4. **Tool call loop (max 3)** — AI can call multiple tools per turn, loop until text-only response.
5. **Opening message** — Sends hidden init message on mount to trigger AI greeting. Fallback if API fails.
6. **presetDesignTokens** — Designer-decided tokens injected into prompt AND merged into result post-generation.

---

## Data Flow

```
User chats → sendDesignerMessage (server action)
           → Anthropic API with designer system prompt + tools
           → AI responds with text + tool_use blocks
           → Client processes tool calls → dispatch moodboard updates
           → Moodboard panel re-renders with new items

AI calls update_design_direction → DesignDirectionSummary appears
User clicks "Generate my site" → aiCreateSiteFromDesigner (server action)
           → generateSiteFromDescription (with presetDesignTokens + moodSummary)
           → Creates Site + SiteTheme + Pages + Navigation in DB
           → Redirects to /sites/{siteId}
```

---

## If Issues Found During Testing

**AI not responding:** Check `ANTHROPIC_API_KEY` in `apps/admin/.env.local`. Model is `claude-sonnet-4-20250514`.

**Image upload failing:** Check `BLOB_READ_WRITE_TOKEN` in `apps/admin/.env.local`. Endpoint: `/api/designer/upload`.

**404 on /sites/new:** Should not happen (compiles fine). Check Clerk middleware isn't blocking. The route is inside `(dashboard)` layout which requires auth.

**Moodboard not updating:** Check browser console for errors in tool call processing. The `designer-chat.tsx` processes each tool call name with a switch statement.

**Generated site has wrong tokens:** The `presetDesignTokens` are both injected into the prompt (telling AI to use them) and force-merged into the result in `ai-site-generator.ts`. Check both paths.
