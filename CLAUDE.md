# Project Instructions

## Screenshots
When the user says "see screenshot" or references a screenshot, always check the `screenshots/` folder in the project root for the latest files. Do not ask for a file path.

## Language
The application supports multiple locales (nl, en, de, fr). AI-powered features must respect the organization's locale setting. Use `getBusinessContext()` or `getOrganizationContext()` to retrieve the locale and include appropriate language instructions in AI system prompts. For static client-side messages (e.g. seed messages in chat), use hardcoded translations keyed by locale with English fallback — don't make an AI roundtrip just for translation.

## Architecture: Chat-Driven Pages

The Blog and Files pages use a **chat-driven architecture** with a consistent pattern:

### Layout
- Left panel: AI chat (380px fixed width)
- Right panel: Results grid (flexible)
- Detail panel: Sheet/drawer for item details

### Data Loading (Hybrid Approach)
Both pages use a hybrid approach for instant loading:
1. **Server page** (`page.tsx`) fetches `organization.locale` and basic counts
2. **Manager component** loads recent items on mount via direct DB action (`getRecentBlogPosts`, `getRecentFiles`) — no AI roundtrip
3. **Chat component** receives `initialResults` prop and injects a **synthetic assistant message** with locale-aware text
4. **sessionStorage** caches chat messages — subsequent visits restore instantly without any server call
5. When user interacts, real AI chat takes over (tool-use loop with Claude)

### Key Files
- Blog: `blog-manager.tsx` → `blog-chat.tsx` → `blog-chat-actions.ts` (server actions + AI tools)
- Files: `file-manager.tsx` → `file-chat.tsx` → `file-chat-actions.ts` (server actions + AI tools)
- Both chats persist to sessionStorage (`blog-chat-messages`, `file-chat-messages`)
- Both managers clear sessionStorage on "new conversation" (reset button)

### Image Optimization
Use `cloudinaryThumb(url, width, height)` from `@/lib/file-utils` for all grid/thumbnail images. This inserts Cloudinary transformation params into the URL. Use full-size URLs only in detail/preview panels. Non-Cloudinary URLs pass through unchanged.

### Hydration Safety
Radix UI Sheet/Dialog components can cause hydration mismatches with auto-generated `aria-controls` IDs. Wrap them in a `{mounted && ...}` guard (with `useState(false)` + `useEffect(() => setMounted(true), [])`) when they start closed. Never read `sessionStorage` in `useState` initializers — defer to `useEffect`.

## Blog Post Editor
- `blog-post-editor.tsx` — TipTap/Novel rich text editor
- AI features: regenerate title/excerpt (`Wand2` button), AI image suggestions for featured image, SEO metadata generation
- Slug protection: locked for published posts (prevents breaking indexed URLs), sync button derives slug from title
- Content chat: `blog-content-chat.tsx` — inline AI assistant with image upload capability
- Status managed via Publish/Unpublish buttons in toolbar (no dropdown)

## Block Editor Chat (Page Builder)
- `block-chat.tsx` — AI chat sidebar for editing blocks in natural language
- **Image search**: detects image-related messages via `isImageRequest()` (multilingual keyword matching)
  - Calls `aiSearchBlockImages()` in `sites/actions.ts` — AI agent with `search_archive` + `search_stock` tools
  - Returns `ImageCandidate[]` rendered as a 2-col clickable image grid with license badges
  - Archive images: click sends follow-up to `aiChatEditBlock` which sets the URL on the correct block field
  - Stock images: click imports via `importStockImage()` (Freepik → Cloudinary), then same follow-up
  - Follow-up messages prefixed with `"Use this URL for the block:"` are hidden from chat UI but sent to AI
  - The AI decides WHERE to place the image (hero.image vs backgroundImage vs columns.items[n].image)
- **Normal chat**: all other messages go through `aiChatEditBlock()` → `chatEditBlockContent()` with tool_use loop
- Same `ImageCandidate` type as blog editor (source, fileId, stockResourceId, url, name, stockLicense)
- Key files: `sites/actions.ts` (server actions), `block-chat.tsx` (UI), `ai-site-generator.ts` (AI layer)

## File Management
- AI-powered semantic search via `smartSearch()` in `actions.ts` (uses Claude to expand query concepts)
- File upload: `/api/media/upload` → Cloudinary storage + async AI analysis (description + tags)
- Stock images: Freepik integration via `@/lib/freepik.ts`
- Media picker: `@/components/media-picker.tsx` — Library/Upload/Stock tabs
