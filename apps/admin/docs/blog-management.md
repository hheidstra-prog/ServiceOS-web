# Blog Management — Admin UI

## Overview

Complete blog management integrated into the admin site builder. Allows creating, editing, publishing, and AI-generating blog posts with category/tag taxonomy, all from the admin dashboard.

## Architecture

```
Site Detail Page (/sites/[id])
├── Overview tab
├── Pages tab
├── Blog tab        ← post list, categories/tags management
├── Design tab
└── Settings tab

Blog Post Editor (/sites/[id]/blog/[postId])
├── Content Preview (col-span-2, rendered HTML)
└── Sidebar (col-span-1, sticky)
    ├── AI tab      ← conversational content editing
    └── Settings tab ← title, slug, status, excerpt, image, categories, tags, SEO
```

## Content Format

Blog post content is stored as `{ html: "<content>" }` in the Prisma `Json` field. The web app's `BlogContent` component has an HTML fallback renderer that supports this format (see `apps/web/src/components/blog/blog-content.tsx`). AI generates HTML natively — no TipTap dependency needed for the admin editor.

## Files

### Server Actions

**`apps/admin/src/app/(dashboard)/sites/blog-actions.ts`**

All blog CRUD operations, following patterns from `sites/actions.ts`:

| Action | Description |
|---|---|
| `getBlogPosts(siteId)` | List posts with author and categories |
| `getBlogPost(siteId, postId)` | Single post with all relations |
| `createBlogPost(siteId, { title, slug })` | Create draft with `{ html: "" }` |
| `updateBlogPost(siteId, postId, data)` | Update all fields, handle category/tag associations via delete+recreate |
| `deleteBlogPost(siteId, postId)` | Delete post |
| `aiCreateBlogPostWithContent(siteId, { topic, keywords?, targetLength? })` | Generate full post with AI, auto-create tags |
| `aiChatEditBlogContent(siteId, { currentHtml, messages })` | Conversational HTML editing via tool_use |
| `getBlogCategories(siteId)` | List categories |
| `createBlogCategory(siteId, { name, slug })` | Create category |
| `deleteBlogCategory(siteId, categoryId)` | Delete category |
| `getBlogTags(siteId)` | List tags |
| `createBlogTag(siteId, { name, slug })` | Create tag |
| `deleteBlogTag(siteId, tagId)` | Delete tag |

### AI Layer

**`apps/admin/src/lib/ai-site-generator.ts`** — Added `chatEditBlogContent()`:

- Uses `update_content` tool with `{ html: string }` input schema
- System prompt includes current HTML, instructs to use semantic HTML tags
- Same tool_use loop pattern as `chatEditBlockContent` (up to 3 iterations)
- Returns `{ content: string, updatedHtml?: string }`

### UI Components

| File | Type | Description |
|---|---|---|
| `sites/[id]/tabs/blog-tab.tsx` | Client | Post list table, create/AI dialogs, category/tag management |
| `sites/[id]/blog/[postId]/page.tsx` | Server | Fetches site + post + categories + tags, renders editor |
| `sites/[id]/blog/[postId]/blog-post-editor.tsx` | Client | Full editor: HTML preview, toolbar, sidebar with AI + settings tabs |
| `sites/[id]/blog/[postId]/blog-content-chat.tsx` | Client | AI chat for blog content, mirrors `block-chat.tsx` |

### Modified Files

| File | Change |
|---|---|
| `sites/actions.ts` | `getSite()` now includes `posts`, `categories`, `tags` |
| `sites/[id]/page.tsx` | Added Blog tab, tabs are URL-driven via `?tab=` |
| `sites/[id]/tabs/overview-tab.tsx` | Blog Posts stat links to `?tab=blog` |

## Data Flow: AI Content Editing

```
User types message in AI chat
  → BlogContentChat.handleSend()
  → aiChatEditBlogContent(siteId, { currentHtml, messages })
  → chatEditBlogContent({ currentHtml, messages })       (ai-site-generator.ts)
    → Anthropic API with update_content tool
    → Returns { content: "I've rewritten...", updatedHtml: "<p>New intro...</p>" }
  → onContentUpdate(updatedHtml) → setHtmlContent() → preview re-renders
```

## Post Statuses

| Status | Badge Style |
|---|---|
| DRAFT | `bg-zinc-500/10 text-zinc-700` |
| PUBLISHED | `bg-emerald-500/10 text-emerald-700` |
| SCHEDULED | `bg-sky-500/10 text-sky-700` |
| ARCHIVED | `bg-amber-500/10 text-amber-700` |

## Database Models

All models are defined in `packages/database/prisma/schema.prisma`:

- **BlogPost** — title, slug, excerpt, content (Json), featuredImage, status (PostStatus enum), publishedAt, featured, SEO fields
- **BlogCategory** — name, slug, description. Unique on `[siteId, slug]`
- **BlogTag** — name, slug. Unique on `[siteId, slug]`
- **BlogPostCategory** — join table (postId, categoryId)
- **BlogPostTag** — join table (postId, tagId)

## URL Routing

| Route | Purpose |
|---|---|
| `/sites/[id]?tab=blog` | Blog post list within site detail |
| `/sites/[id]/blog/[postId]` | Blog post editor |

## Patterns & Conventions

- Server actions follow auth pattern: `requireAuthWithOrg()` → verify site ownership → perform operation → `revalidatePath()`
- Blog tab mirrors `pages-tab.tsx` structure (table, dialogs, empty state)
- Blog editor mirrors `page-editor.tsx` layout (`grid lg:grid-cols-3`, sticky sidebar, AI + Settings tabs)
- Blog chat mirrors `block-chat.tsx` (messages, example prompts, "Content updated" pill)
- Category/tag associations use delete+recreate pattern in `updateBlogPost`
