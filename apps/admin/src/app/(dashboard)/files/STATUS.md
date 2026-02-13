# File Manager Redesign — Status

## What we did

Redesigned the Files page from a traditional file grid + optional AI sidebar into a **two-panel layout**: chat on the left, results on the right. The AI assistant is now the primary interface for finding, organizing, and managing files.

## Architecture

```
┌─ Chat (380px) ─────────┬─ Results (flex-1) ──────────────────┐
│ ✨ AI Assistant         │  Landing state OR results grid      │
│                         │                                     │
│  Conversation bubbles   │  File cards / Stock image cards     │
│  Stock search widget    │  Up to 5 columns on wide screens   │
│  "N files shown →" hint │                                     │
│                         │                                     │
│ [input bar at bottom]   │                                     │
└─────────────────────────┴─────────────────────────────────────┘
```

## Files changed (from original)

### `actions.ts`
- **Added** `getFileCount()` — lightweight server action returning total file count for the org
- All other exports untouched (used by `file-chat-actions.ts` and elsewhere)

### `page.tsx`
- **Simplified** from 3-query `Promise.all` (getFiles, getFolders, getAllTags) to single `getFileCount()`
- Layout changed from `space-y-6` to `flex flex-col flex-1` so FileManager fills height
- Props: `initialFileCount` (was: initialFiles, initialTotal, initialFolders, initialTags)

### `file-manager.tsx` — Major rewrite
- **Removed**: file grid, list view, toolbar, search/filters, view toggle, sidebar panel, polling logic (~300 lines)
- **New layout**: two-panel flex row
  - Left panel (w-[380px]): bordered card with "AI Assistant" header + FileChat
  - Right panel (flex-1): landing state (welcome + quick-action chips) OR results grid
- **New state**: `currentFileResults`, `currentStockResults` — populated by `onResults` callback from FileChat
- **New state**: `externalMessage` — bridges chip clicks and drag-drop uploads into the chat
- **Kept intact**: FileRecord interface, upload/drop handlers, file detail Sheet, stock import, all edit/save/delete logic

### `file-chat.tsx` — Refactored
- **New export**: `ChatResultPayload` interface (fileResults + stockResults)
- **New prop**: `onResults` callback — when set, FileChat emits results to parent instead of rendering inline grids
- **Conditional rendering**: when `onResults` is provided, file/stock grids are NOT rendered inline; instead a small "N files shown →" hint appears in the chat
- **Inline fallback**: if `onResults` is NOT provided, results still render inline (backwards compatible)
- **Removed**: landing state (moved to right panel in file-manager.tsx)
- **Removed**: `initialFileCount` prop (no longer needed here)
- Stock search offer widget stays in chat (it's conversational)
- Input bar stays at bottom of chat panel

### `file-chat-actions.ts` — NOT changed
- AI tools and system prompt were already correct

## Data flow

1. User types in chat (left panel) or clicks a quick-action chip (right panel landing)
2. Chip clicks → `setExternalMessage(label)` → FileChat picks it up via `useEffect` → sends as chat message
3. FileChat calls `chatFileAssistant()` server action
4. Assistant responds with text + optional fileResults/stockResults
5. FileChat shows text in conversation, calls `onResults({fileResults, stockResults})`
6. FileManager updates `currentFileResults`/`currentStockResults` → right panel renders grid
7. Clicking a file card in the grid → opens the File Detail Sheet (unchanged)
8. Drag-drop upload → `handleUpload` → `setExternalMessage("I uploaded: file1.jpg")` → chat acknowledges

## What works

- Two-panel layout: chat left, results right
- Quick-action chips send messages to chat
- File results and stock results render in right panel grid
- File detail Sheet opens on card click (edit name/tags/folder, save, delete)
- Drag-drop upload with chat notification
- "Upload files" chip opens native file picker
- Stock search offer widget in chat → triggers stock search → results in right panel
- Import stock images
- TypeScript clean (only pre-existing freepik.ts Buffer error)

## Potential next steps / things to evaluate

- **Responsive**: chat panel is fixed 380px — may need adjustment on smaller screens
- **Landing state disappears**: once results load, landing state is replaced; no way to get back except page refresh. Could add a "clear" or "new search" action
- **Result persistence**: each new query replaces previous results. Could consider keeping history or showing "previous results" option
- **Card sizes**: right panel grid cards could be tuned — currently aspect-square thumbnails
- **File detail Sheet after edit**: currently closes on save but doesn't refresh results in right panel (results are a snapshot from the chat response)
- **Empty results**: if assistant finds no files, right panel still shows previous results (or landing if first query). Could show an explicit "no results" state
- **Chat panel height**: on short viewports the chat may feel cramped — could consider collapsible/resizable panels
