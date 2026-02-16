# Blog Management — Admin UI

## Overview

Organization-level blog management at `/blog`. Blog posts, categories, and tags are scoped to the Organization (not a specific Site). A `BlogPostPublication` join table enables publishing the same post to multiple sites.

## Architecture

```
Blog List (/blog)
├── Post list table (status, date, categories, publications)
├── Categories management (create, delete)
└── Tags management (create, delete)

Blog Post Editor (/blog/[postId])
├── Novel Editor (col-span-2, TipTap rich text)
│   ├── StarterKit (headings, lists, quotes, code, etc.)
│   ├── Image support (upload via /api/media/upload)
│   ├── Link support
│   ├── Slash commands (/ menu)
│   └── Bubble toolbar (bold, italic, strike, code)
└── Sidebar (col-span-1, sticky)
    ├── AI tab — conversational content editing
    └── Settings tab — title, slug, status, excerpt, image, categories, tags, SEO

Blog Creation (/blog/new)
└── AI chat to generate a full blog post from a topic
```

## Content Format

Blog post content is stored as TipTap JSON (`{ type: "doc", content: [...] }`) in the Prisma `Json` field. Legacy posts may have `{ html: "<content>" }` format — the editor detects this and loads the HTML into TipTap on open. The web app's `BlogContent` component has an HTML fallback renderer (see `apps/web/src/components/blog/blog-content.tsx`).

## Multi-Site Publishing

- **BlogPostPublication** join table: `(postId, siteId, slug)` — composite PK on `(postId, siteId)`, unique on `(siteId, slug)`
- **Publish**: sets status to PUBLISHED, creates/updates a BlogPostPublication for the org's site
- **Unpublish**: sets status to DRAFT, deletes all publication entries
- **Public blog**: queries posts via `publications: { some: { siteId } }` — only shows posts published to that site
- Future: UI for selecting which sites to publish to (currently auto-publishes to org's first site)

## Files

### Server Actions

**`apps/admin/src/app/(dashboard)/blog/actions.ts`**

All blog CRUD operations, using `organizationId` from `requireAuthWithOrg()`:

| Action | Description |
|---|---|
| `getBlogPosts()` | List posts with author, categories, and publications (site names) |
| `getBlogPost(postId)` | Single post with all relations |
| `createBlogPost({ title, slug })` | Create draft with empty content |
| `updateBlogPost(postId, data)` | Update all fields, handle category/tag associations |
| `deleteBlogPost(postId)` | Delete post (cascades to publications) |
| `publishBlogPost(postId)` | Set PUBLISHED + upsert BlogPostPublication for org's site |
| `unpublishBlogPost(postId)` | Set DRAFT + delete all publications |
| `aiCreateBlogPostWithContent({ topic, keywords?, targetLength? })` | Generate full post with AI, auto-create tags |
| `aiChatEditBlogContent({ currentHtml, messages })` | Conversational HTML editing via tool_use |
| `aiFindAndInsertImage({ instruction, contextBefore, contextAfter, fullDocumentHtml })` | AI-powered image search — returns `ImageCandidate[]` from archive and/or free stock |
| `importStockAndInsert({ stockResourceId, title? })` | Imports a Freepik stock image to Cloudinary, returns `{ imageUrl }` |
| `getBlogCategories()` | List categories for org |
| `createBlogCategory({ name, slug })` | Create category |
| `deleteBlogCategory(categoryId)` | Delete category |
| `getBlogTags()` | List tags for org |
| `createBlogTag({ name, slug })` | Create tag |
| `deleteBlogTag(tagId)` | Delete tag |

### AI Layer

**`apps/admin/src/lib/ai-site-generator.ts`** — `chatEditBlogContent()`:

- Uses `update_content` tool with `{ html: string }` input schema
- System prompt includes current HTML, instructs to use semantic HTML tags
- Same tool_use loop pattern as `chatEditBlockContent` (up to 3 iterations)
- Returns `{ content: string, updatedHtml?: string }`

### UI Components

| File | Type | Description |
|---|---|---|
| `blog/page.tsx` | Server | Fetches posts/categories/tags, renders BlogManager |
| `blog/blog-manager.tsx` | Client | Post list table, category/tag management |
| `blog/new/page.tsx` | Server | AI blog creation page |
| `blog/new/blog-creation-chat.tsx` | Client | AI chat for generating new blog posts |
| `blog/new/actions.ts` | Server | `chatCreateBlogPost()` action for AI generation |
| `blog/[postId]/page.tsx` | Server | Fetches post + categories + tags, handles content format detection |
| `blog/[postId]/blog-post-editor.tsx` | Client | Novel editor, toolbar, sidebar with AI + settings tabs |
| `blog/[postId]/blog-content-chat.tsx` | Client | AI chat for blog content editing |

### Shared Components

| File | Description |
|---|---|
| `components/novel-editor.tsx` | TipTap editor wrapper with extensions, slash commands, bubble menu |
| `components/media-picker.tsx` | Image picker dialog for featured images |

## Data Flow: AI Content Editing

```
User types message in AI chat
  → BlogContentChat.handleSend()
  → aiChatEditBlogContent({ currentHtml, messages })
  → chatEditBlogContent({ currentHtml, messages })       (ai-site-generator.ts)
    → Anthropic API with update_content tool
    → Returns { content: "I've rewritten...", updatedHtml: "<p>New intro...</p>" }
  → onContentUpdate(updatedHtml)
    → editor.commands.setContent(html)
    → setTiptapContent(editor.getJSON())
```

## Data Flow: AI Image Candidate Picker

```
User types image request in AI chat (detected via IMAGE_KEYWORDS)
  → BlogContentChat.handleSend()
  → aiFindAndInsertImage({ instruction, contextBefore, contextAfter, fullDocumentHtml })
    → AI calls search_archive (always in English, even if user writes in other language)
    → If < 3 archive results → AI also calls search_stock (free images only via license: "freemium")
    → Collects all results into ImageCandidate[] (archive first, then stock)
    → Returns { candidates, message }
  → Chat displays 2-column image grid with clickable cards
    → Archive images: click → insert <img> at cursor position
    → Stock images: click → loading overlay → importStockAndInsert() → insert <img>
    → No cursor: image appended at end of document
  → Stock images show "Free" or "Premium" badge (currently only free images are fetched)
```

### ImageCandidate type

```ts
type ImageCandidate = {
  source: "archive" | "stock";
  fileId?: string;           // archive file ID
  stockResourceId?: number;  // Freepik resource ID
  url: string;               // thumbnail URL for display
  name: string;
  description?: string | null;
  stockLicense?: "free" | "premium";
};
```

### Image request routing

Image requests are detected client-side via `IMAGE_KEYWORDS` in `blog-content-chat.tsx`. This check runs **before** cursor/selection checks, so image search works with or without a cursor placed. Keywords cover EN, NL, DE, FR (e.g. "image", "afbeelding", "beelden", "bild", "photo").

### AI search language

Both the blog image search and the file assistant search in **English** regardless of user language. File metadata (names, tags, AI descriptions) is stored in English. The AI translates user queries before calling search tools, but responds in the user's language.

### Search quality: keyword splitting

Archive search splits multi-word queries into individual keywords and matches each against name, aiDescription, and tags. This was applied to both:
- `blog/actions.ts` → `aiFindAndInsertImage` (search_archive handler)
- `files/file-chat-actions.ts` → `search_files` handler

Without this, `hasSome: ["business woman"]` would fail because tags are individual words like "business", "woman".

### Future: Stock image licensing

Currently only free Freepik images are shown (`filters: { license: "freemium" }`). When subscription/financial logic is implemented, premium images can be unlocked for users with a paid Freepik plan by removing or adjusting the license filter in `aiFindAndInsertImage`.

### Block Editor Image Search (Page Builder)

The same image search pattern has been replicated in the page builder's block editor chat (`block-chat.tsx` + `sites/actions.ts`):
- `aiSearchBlockImages()` — same tool-use loop with `search_archive` + `search_stock`
- `importStockImage()` — same Freepik → Cloudinary import
- `ImageCandidate` type exported from `sites/actions.ts` (identical shape)
- Key difference: after user clicks an image, a follow-up message ("Use this URL for the block: {url}") is sent to `aiChatEditBlock`, which lets the AI decide which block field to set (e.g. `hero.image` vs `hero.backgroundImage` vs `columns.items[n].image`)
- The follow-up message is filtered from the chat UI for clean UX

### Future: Media capabilities roadmap

1. ~~AI finds suitable images (archive first, then free stock)~~ — done
2. ~~User browses archive ("show me business women")~~ — done
3. ~~Image search in block editor chat~~ — done (same pattern as blog)
4. Paid stock — gated by subscription/license logic (filter is in place, needs license check)
5. Upload from blog chat — reuse file assistant upload pattern
6. AI-generated images

## Data Flow: Legacy HTML Content

```
page.tsx loads post from DB
  → rawContent = post.content (Json field)
  → if rawContent.type === "doc" → tiptapContent = rawContent (TipTap JSON)
  → if rawContent.html exists → htmlContent = rawContent.html (legacy)
  → BlogPostEditor receives { content: tiptapContent, htmlContent }
    → NovelEditor initializes with empty doc (fallback)
    → onEditorReady: if htmlContent exists, editor.commands.setContent(htmlContent)
    → On save: content is stored as TipTap JSON going forward
```

## Post Statuses

| Status | Badge Style |
|---|---|
| DRAFT | `bg-zinc-500/10 text-zinc-700` |
| PUBLISHED | `bg-emerald-500/10 text-emerald-700` |
| SCHEDULED | `bg-sky-500/10 text-sky-700` |
| ARCHIVED | `bg-amber-500/10 text-amber-700` |

## Database Models

All models in `packages/database/prisma/schema.prisma`:

- **BlogPost** — `organizationId`, title, slug, excerpt, content (Json), featuredImage, status (PostStatus enum), publishedAt, featured, SEO fields. Unique on `[organizationId, slug]`
- **BlogCategory** — `organizationId`, name, slug, description. Unique on `[organizationId, slug]`
- **BlogTag** — `organizationId`, name, slug. Unique on `[organizationId, slug]`
- **BlogPostCategory** — join table (postId, categoryId)
- **BlogPostTag** — join table (postId, tagId)
- **BlogPostPublication** — join table (postId, siteId, slug). PK on `[postId, siteId]`, unique on `[siteId, slug]`

## URL Routing

| Route | Purpose |
|---|---|
| `/blog` | Blog post list, categories, tags management |
| `/blog/new` | AI-powered blog post creation |
| `/blog/[postId]` | Blog post editor (Novel + AI sidebar) |

## Public Blog (Web App)

| Route | How it queries |
|---|---|
| `/blog` (list) | `BlogPost` where `publications: { some: { siteId } }` and `status: PUBLISHED` |
| `/blog/[slug]` (detail) | `BlogPostPublication.findUnique({ siteId_slug })` → load post by ID |

Categories on public blog are queried by `organizationId: site.organizationId`.

## Patterns & Conventions

- Server actions use `requireAuthWithOrg()` → verify org ownership → perform operation → `revalidatePath()`
- Blog manager mirrors sites-list pattern (table, empty state, action dropdowns)
- Blog editor uses `grid lg:grid-cols-3` layout (editor 2/3, sidebar 1/3)
- Blog chat mirrors `block-chat.tsx` (messages, example prompts, "Content updated" pill)
- Category/tag associations use delete+recreate pattern in `updateBlogPost`
- Publish/unpublish are separate actions (not just a status change) because they manage publications

## Migration Notes

- **Migration script**: `scripts/migrate-blog-to-org.ts` — migrates existing posts/categories/tags from siteId to organizationId, creates BlogPostPublication entries
- **Schema change**: BlogPost/BlogCategory/BlogTag changed from `siteId` to `organizationId`
- **Old routes removed**: `/sites/[id]/blog/` no longer exists, Blog tab removed from site detail page
- **Starter posts**: `sites/new/actions.ts` `generateStarterBlogPosts()` now creates posts with `organizationId` + `BlogPostPublication` entries
