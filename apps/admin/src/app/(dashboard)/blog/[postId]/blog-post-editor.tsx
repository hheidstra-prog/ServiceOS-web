"use client";

import { useState, useRef } from "react";
import {
  Loader2,
  Save,
  Eye,
  EyeOff,
  Settings,
  Sparkles,
  Wand2,
  Plus,
  Image as ImageIcon,
  X,
  RefreshCw,
  Lock,
  LockOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  updateBlogPost,
  publishBlogPost,
  unpublishBlogPost,
  createBlogCategory,
  createBlogTag,
  aiGenerateSEO,
  aiRegenerateTitleAndExcerpt,
  aiFindAndInsertImage,
  importStockAndInsert,
} from "../actions";
import type { ImageCandidate } from "../actions";
import { BlogContentChat, type ChatMessage } from "./blog-content-chat";
import { NovelEditor, type EditorSelection } from "@/components/novel-editor";
import { MediaPicker } from "@/components/media-picker";
import type { JSONContent, EditorInstance } from "novel";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: JSONContent | null;
  htmlContent: string;
  featuredImage: string | null;
  featuredImageAlt: string | null;
  status: string;
  publishedAt: Date | null;
  featured: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  categoryIds: string[];
  tagIds: string[];
  publicationSiteIds: string[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface Site {
  id: string;
  name: string;
  subdomain: string;
}

interface BlogPostEditorProps {
  post: Post;
  categories: Category[];
  tags: Tag[];
  sites: Site[];
}

export function BlogPostEditor({
  post,
  categories,
  tags,
  sites,
}: BlogPostEditorProps) {
  const [tiptapContent, setTiptapContent] = useState<JSONContent | undefined>(
    post.content || undefined
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const editorRef = useRef<EditorInstance | null>(null);
  const [editorSelection, setEditorSelection] = useState<EditorSelection | null>(null);

  const [postSettings, setPostSettings] = useState({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || "",
    featuredImage: post.featuredImage || "",
    featuredImageAlt: post.featuredImageAlt || "",
    status: post.status,
    featured: post.featured,
    metaTitle: post.metaTitle || "",
    metaDescription: post.metaDescription || "",
    selectedCategoryIds: post.categoryIds,
    selectedTagIds: post.tagIds,
    selectedSiteIds: post.publicationSiteIds,
  });

  // Publish/unpublish modal state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishSiteIds, setPublishSiteIds] = useState<string[]>([]);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [unpublishSiteIds, setUnpublishSiteIds] = useState<string[]>([]);

  // AI regeneration state
  const [isRegeneratingTitleExcerpt, setIsRegeneratingTitleExcerpt] = useState(false);
  // Slug lock state (published posts start locked)
  const [slugUnlocked, setSlugUnlocked] = useState(false);
  // AI featured image suggestions
  const [isSuggestingImage, setIsSuggestingImage] = useState(false);
  const [imageCandidates, setImageCandidates] = useState<ImageCandidate[]>([]);
  const [importingStockId, setImportingStockId] = useState<number | null>(null);

  // Inline create state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const getContentForSave = () => {
    if (tiptapContent) {
      return JSON.parse(JSON.stringify(tiptapContent));
    }
    return { type: "doc", content: [{ type: "paragraph" }] };
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateBlogPost(post.id, {
        title: postSettings.title,
        slug: postSettings.slug,
        excerpt: postSettings.excerpt || undefined,
        content: getContentForSave(),
        featuredImage: postSettings.featuredImage || undefined,
        featuredImageAlt: postSettings.featuredImageAlt || undefined,
        status: postSettings.status as "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED",
        featured: postSettings.featured,
        metaTitle: postSettings.metaTitle || undefined,
        metaDescription: postSettings.metaDescription || undefined,
        categoryIds: postSettings.selectedCategoryIds,
        tagIds: postSettings.selectedTagIds,
      });
      toast.success("Post saved successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save post"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openPublishDialog = () => {
    // Pre-select: existing publications, or all sites for first publish
    const initial = postSettings.selectedSiteIds.length > 0
      ? postSettings.selectedSiteIds
      : sites.map((s) => s.id);
    setPublishSiteIds(initial);
    setPublishDialogOpen(true);
  };

  const handleTogglePublishSite = (siteId: string) => {
    setPublishSiteIds((prev) =>
      prev.includes(siteId)
        ? prev.filter((id) => id !== siteId)
        : [...prev, siteId]
    );
  };

  const handlePublish = async () => {
    setPublishDialogOpen(false);
    setIsSaving(true);
    try {
      // First save all content
      await updateBlogPost(post.id, {
        title: postSettings.title,
        slug: postSettings.slug,
        excerpt: postSettings.excerpt || undefined,
        content: getContentForSave(),
        featuredImage: postSettings.featuredImage || undefined,
        featuredImageAlt: postSettings.featuredImageAlt || undefined,
        featured: postSettings.featured,
        metaTitle: postSettings.metaTitle || undefined,
        metaDescription: postSettings.metaDescription || undefined,
        categoryIds: postSettings.selectedCategoryIds,
        tagIds: postSettings.selectedTagIds,
      });
      // Then publish (sets status + creates publications for selected sites)
      await publishBlogPost(post.id, publishSiteIds);
      setPostSettings((prev) => ({
        ...prev,
        status: "PUBLISHED",
        selectedSiteIds: publishSiteIds,
      }));
      toast.success("Post published successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to publish post"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openUnpublishDialog = () => {
    setUnpublishSiteIds(postSettings.selectedSiteIds);
    setUnpublishDialogOpen(true);
  };

  const handleToggleUnpublishSite = (siteId: string) => {
    setUnpublishSiteIds((prev) =>
      prev.includes(siteId)
        ? prev.filter((id) => id !== siteId)
        : [...prev, siteId]
    );
  };

  const handleUnpublish = async () => {
    setUnpublishDialogOpen(false);
    setIsSaving(true);
    try {
      if (unpublishSiteIds.length === 0) {
        // No sites remaining — full unpublish
        await unpublishBlogPost(post.id);
        setPostSettings((prev) => ({
          ...prev,
          status: "DRAFT",
          selectedSiteIds: [],
        }));
        toast.success("Post unpublished from all sites");
      } else {
        // Some sites remaining — update publications only
        await publishBlogPost(post.id, unpublishSiteIds);
        setPostSettings((prev) => ({
          ...prev,
          selectedSiteIds: unpublishSiteIds,
        }));
        const removed = postSettings.selectedSiteIds.length - unpublishSiteIds.length;
        toast.success(`Removed from ${removed} site${removed === 1 ? "" : "s"}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to unpublish post"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentUpdateFromChat = (html: string, selectionRange?: { from: number; to: number }) => {
    if (!editorRef.current) return;

    if (selectionRange) {
      // Strip outer block wrapper (p, h1-h6, div) if it's a single block element,
      // to avoid creating extra line breaks when replacing content within an existing block
      let cleanHtml = html.trim();
      const match = cleanHtml.match(/^<(p|h[1-6]|div)(?:\s[^>]*)?>([\s\S]*)<\/\1>$/i);
      if (match && !/<(p|h[1-6]|div)[\s>]/i.test(match[2])) {
        cleanHtml = match[2];
      }

      // Replace just the selected range
      editorRef.current
        .chain()
        .focus()
        .insertContentAt(
          { from: selectionRange.from, to: selectionRange.to },
          cleanHtml
        )
        .run();
    } else {
      // No cursor position — append at the end of the document
      const endPos = editorRef.current.state.doc.content.size;
      editorRef.current
        .chain()
        .focus()
        .insertContentAt(endPos, html)
        .run();
    }
    setTiptapContent(editorRef.current.getJSON());
  };

  const handleGenerateSEO = async () => {
    setIsGeneratingSEO(true);
    try {
      const contentHtml = editorRef.current?.getHTML() || "";
      const result = await aiGenerateSEO({
        title: postSettings.title,
        excerpt: postSettings.excerpt,
        contentHtml,
      });

      setPostSettings((prev) => ({
        ...prev,
        metaTitle: result.metaTitle,
        metaDescription: result.metaDescription,
      }));
      toast.success("SEO metadata generated!");
    } catch {
      toast.error("Failed to generate SEO metadata");
    } finally {
      setIsGeneratingSEO(false);
    }
  };

  const handleRegenerateTitleAndExcerpt = async () => {
    setIsRegeneratingTitleExcerpt(true);
    try {
      const contentHtml = editorRef.current?.getHTML() || "";
      if (!contentHtml || contentHtml === "<p></p>") {
        toast.error("Write some content first before regenerating");
        return;
      }
      const result = await aiRegenerateTitleAndExcerpt({ contentHtml });
      setPostSettings((prev) => ({
        ...prev,
        title: result.title,
        excerpt: result.excerpt,
      }));
      toast.success("Title and excerpt regenerated!");
    } catch {
      toast.error("Failed to regenerate title and excerpt");
    } finally {
      setIsRegeneratingTitleExcerpt(false);
    }
  };

  const handleSyncSlugFromTitle = () => {
    const slug = postSettings.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setPostSettings((prev) => ({ ...prev, slug }));
    toast.success("Slug synced from title");
  };

  const handleAiSuggestImage = async () => {
    setIsSuggestingImage(true);
    setImageCandidates([]);
    try {
      const contentHtml = editorRef.current?.getHTML() || "";
      const result = await aiFindAndInsertImage({
        instruction: `Find a featured header image for this blog post titled "${postSettings.title}"`,
        contextBefore: contentHtml.slice(0, 500),
        contextAfter: "",
        fullDocumentHtml: contentHtml,
      });
      setImageCandidates(result.candidates);
      if (result.candidates.length === 0) {
        toast.error("No suitable images found");
      }
    } catch {
      toast.error("Failed to find images");
    } finally {
      setIsSuggestingImage(false);
    }
  };

  const handleSelectImageCandidate = async (candidate: ImageCandidate) => {
    if (candidate.source === "archive") {
      setPostSettings((prev) => ({
        ...prev,
        featuredImage: candidate.url,
        featuredImageAlt: candidate.description || candidate.name,
      }));
      setImageCandidates([]);
    } else {
      setImportingStockId(candidate.stockResourceId ?? null);
      try {
        const result = await importStockAndInsert({
          stockResourceId: candidate.stockResourceId!,
          title: candidate.name,
        });
        setPostSettings((prev) => ({
          ...prev,
          featuredImage: result.imageUrl,
          featuredImageAlt: candidate.name,
        }));
        setImageCandidates([]);
      } catch {
        toast.error("Failed to import stock image");
      } finally {
        setImportingStockId(null);
      }
    }
  };

  const handleToggleCategory = (categoryId: string) => {
    setPostSettings((prev) => ({
      ...prev,
      selectedCategoryIds: prev.selectedCategoryIds.includes(categoryId)
        ? prev.selectedCategoryIds.filter((id) => id !== categoryId)
        : [...prev.selectedCategoryIds, categoryId],
    }));
  };

  const handleToggleTag = (tagId: string) => {
    setPostSettings((prev) => ({
      ...prev,
      selectedTagIds: prev.selectedTagIds.includes(tagId)
        ? prev.selectedTagIds.filter((id) => id !== tagId)
        : [...prev.selectedTagIds, tagId],
    }));
  };

  const handleToggleSite = (siteId: string) => {
    setPostSettings((prev) => ({
      ...prev,
      selectedSiteIds: prev.selectedSiteIds.includes(siteId)
        ? prev.selectedSiteIds.filter((id) => id !== siteId)
        : [...prev.selectedSiteIds, siteId],
    }));
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const categorySlug = newCategoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const category = await createBlogCategory({
        name: newCategoryName.trim(),
        slug: categorySlug,
      });
      setPostSettings((prev) => ({
        ...prev,
        selectedCategoryIds: [...prev.selectedCategoryIds, category.id],
      }));
      setNewCategoryName("");
      toast.success("Category created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create category"
      );
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setIsCreatingTag(true);
    try {
      const tagSlug = newTagName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const tag = await createBlogTag({
        name: newTagName.trim(),
        slug: tagSlug,
      });
      setPostSettings((prev) => ({
        ...prev,
        selectedTagIds: [...prev.selectedTagIds, tag.id],
      }));
      setNewTagName("");
      toast.success("Tag created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create tag"
      );
    } finally {
      setIsCreatingTag(false);
    }
  };

  const isPublished = postSettings.status === "PUBLISHED";

  const getCurrentHtml = (): string => {
    if (editorRef.current) {
      return editorRef.current.getHTML();
    }
    return post.htmlContent || "";
  };

  return (
    <div className="grid h-full gap-6 lg:grid-cols-3">
      {/* Novel Editor */}
      <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
        {/* Toolbar */}
        <div className="flex shrink-0 items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                isPublished
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400"
              }`}
            >
              {postSettings.status.charAt(0) + postSettings.status.slice(1).toLowerCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Save Draft
            </Button>
            {isPublished ? (
              <Button variant="outline" onClick={openUnpublishDialog} disabled={isSaving}>
                <EyeOff className="mr-1.5 h-4 w-4" />
                Unpublish
              </Button>
            ) : (
              <Button onClick={openPublishDialog} disabled={isSaving}>
                <Eye className="mr-1.5 h-4 w-4" />
                Publish
              </Button>
            )}
          </div>
        </div>

        {/* Novel Editor */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NovelEditor
            initialContent={tiptapContent}
            onChange={setTiptapContent}
            onEditorReady={(editor) => {
              editorRef.current = editor;
              // Load legacy HTML content into the editor
              if (!post.content && post.htmlContent) {
                editor.commands.setContent(post.htmlContent);
                setTiptapContent(editor.getJSON());
              }
            }}
            onSelectionChange={setEditorSelection}
          />
        </div>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-4 overflow-hidden">
        <Tabs defaultValue="ai" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="ai" className="flex-1">
              <Sparkles className="mr-1 h-3.5 w-3.5" /> AI
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">
              <Settings className="mr-1 h-3.5 w-3.5" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="mt-4 min-h-0 flex-1">
            <Card className="h-full overflow-hidden">
              <CardContent className="h-full p-0">
                <BlogContentChat
                  currentHtml={getCurrentHtml()}
                  messages={chatMessages}
                  onMessagesChange={setChatMessages}
                  onContentUpdate={handleContentUpdateFromChat}
                  editorSelection={editorSelection}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-4 min-h-0 flex-1 overflow-y-auto">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Post Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="postTitle">Title</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRegenerateTitleAndExcerpt}
                      disabled={isRegeneratingTitleExcerpt}
                      className="h-7 text-xs"
                    >
                      {isRegeneratingTitleExcerpt ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="mr-1 h-3 w-3" />
                      )}
                      Regenerate
                    </Button>
                  </div>
                  <Input
                    id="postTitle"
                    value={postSettings.title}
                    onChange={(e) =>
                      setPostSettings({ ...postSettings, title: e.target.value })
                    }
                  />
                </div>

                {/* Slug */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="postSlug">Slug</Label>
                    <div className="flex items-center gap-1">
                      {isPublished && !slugUnlocked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSlugUnlocked(true)}
                          className="h-7 text-xs"
                        >
                          <LockOpen className="mr-1 h-3 w-3" />
                          Unlock
                        </Button>
                      )}
                      {(!isPublished || slugUnlocked) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSyncSlugFromTitle}
                          className="h-7 text-xs"
                          title="Generate slug from title"
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Sync
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="flex h-9 items-center rounded-l-md border border-r-0 border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                      {isPublished && !slugUnlocked ? (
                        <Lock className="mr-1.5 h-3.5 w-3.5" />
                      ) : null}
                      /
                    </span>
                    <Input
                      id="postSlug"
                      value={postSettings.slug}
                      onChange={(e) =>
                        setPostSettings({ ...postSettings, slug: e.target.value })
                      }
                      className="rounded-l-none"
                      disabled={isPublished && !slugUnlocked}
                    />
                  </div>
                  {isPublished && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {slugUnlocked
                        ? "Slug unlocked — changing it may break existing links."
                        : "Slug is locked — changing it may break existing links."}
                    </p>
                  )}
                </div>

                {/* Excerpt */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="postExcerpt">Excerpt</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRegenerateTitleAndExcerpt}
                      disabled={isRegeneratingTitleExcerpt}
                      className="h-7 text-xs"
                    >
                      {isRegeneratingTitleExcerpt ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="mr-1 h-3 w-3" />
                      )}
                      Regenerate
                    </Button>
                  </div>
                  <Textarea
                    id="postExcerpt"
                    value={postSettings.excerpt}
                    onChange={(e) =>
                      setPostSettings({ ...postSettings, excerpt: e.target.value })
                    }
                    placeholder="Brief summary of the post..."
                    rows={3}
                  />
                </div>

                {/* Featured Image with MediaPicker */}
                <div className="space-y-2">
                  <Label>Featured Image</Label>
                  {postSettings.featuredImage ? (
                    <div className="relative overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <img
                        src={postSettings.featuredImage}
                        alt={postSettings.featuredImageAlt || "Featured"}
                        className="h-32 w-full object-cover"
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-1 top-1 h-6 w-6 bg-white/80 hover:bg-white dark:bg-zinc-950/80"
                        onClick={() =>
                          setPostSettings({
                            ...postSettings,
                            featuredImage: "",
                            featuredImageAlt: "",
                          })
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleAiSuggestImage}
                      disabled={isSuggestingImage}
                    >
                      {isSuggestingImage ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      AI Suggest
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setMediaPickerOpen(true)}
                    >
                      <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                      {postSettings.featuredImage ? "Change" : "Browse"}
                    </Button>
                  </div>
                  {/* AI Image Candidates Grid */}
                  {imageCandidates.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Pick an image</span>
                        <button
                          onClick={() => setImageCandidates([])}
                          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        >
                          Dismiss
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {imageCandidates.map((candidate) => (
                          <button
                            key={candidate.fileId || candidate.stockResourceId}
                            onClick={() => handleSelectImageCandidate(candidate)}
                            disabled={importingStockId !== null}
                            className="group flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white text-left transition-all hover:border-violet-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-700"
                          >
                            <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                              <img
                                src={candidate.url}
                                alt={candidate.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                              {candidate.source === "stock" && importingStockId === candidate.stockResourceId && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 p-1.5">
                              <p className="flex-1 truncate text-[11px] font-medium text-zinc-950 dark:text-white">
                                {candidate.name}
                              </p>
                              {candidate.source === "stock" && (
                                <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-medium ${
                                  candidate.stockLicense === "free"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                                }`}>
                                  {candidate.stockLicense === "free" ? "Free" : "Premium"}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {postSettings.featuredImage && (
                    <Input
                      value={postSettings.featuredImageAlt}
                      onChange={(e) =>
                        setPostSettings({ ...postSettings, featuredImageAlt: e.target.value })
                      }
                      placeholder="Alt text..."
                      className="text-xs"
                    />
                  )}
                </div>

                {/* Featured Toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="postFeatured">Featured Post</Label>
                  <Switch
                    id="postFeatured"
                    checked={postSettings.featured}
                    onCheckedChange={(checked) =>
                      setPostSettings({ ...postSettings, featured: checked })
                    }
                  />
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <Label>Categories</Label>
                  <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      >
                        <input
                          type="checkbox"
                          checked={postSettings.selectedCategoryIds.includes(category.id)}
                          onChange={() => handleToggleCategory(category.id)}
                          className="rounded border-zinc-300"
                        />
                        <span className="text-zinc-950 dark:text-white">
                          {category.name}
                        </span>
                      </label>
                    ))}
                    {categories.length === 0 && (
                      <p className="text-xs text-zinc-500 px-1.5 py-1">No categories</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="New category..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateCategory();
                        }
                      }}
                      disabled={isCreatingCategory}
                      className="h-8 text-xs"
                    />
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim() || isCreatingCategory}
                      className="h-8 w-8 shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
                    {tags.map((tag) => (
                      <label
                        key={tag.id}
                        className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      >
                        <input
                          type="checkbox"
                          checked={postSettings.selectedTagIds.includes(tag.id)}
                          onChange={() => handleToggleTag(tag.id)}
                          className="rounded border-zinc-300"
                        />
                        <span className="text-zinc-950 dark:text-white">
                          {tag.name}
                        </span>
                      </label>
                    ))}
                    {tags.length === 0 && (
                      <p className="text-xs text-zinc-500 px-1.5 py-1">No tags</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="New tag..."
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateTag();
                        }
                      }}
                      disabled={isCreatingTag}
                      className="h-8 text-xs"
                    />
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim() || isCreatingTag}
                      className="h-8 w-8 shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* SEO */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="metaTitle">Meta Title</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateSEO}
                      disabled={isGeneratingSEO}
                      className="h-7 text-xs"
                    >
                      {isGeneratingSEO ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="mr-1 h-3 w-3" />
                      )}
                      Generate SEO
                    </Button>
                  </div>
                  <Input
                    id="metaTitle"
                    value={postSettings.metaTitle}
                    onChange={(e) =>
                      setPostSettings({ ...postSettings, metaTitle: e.target.value })
                    }
                    placeholder="SEO title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={postSettings.metaDescription}
                    onChange={(e) =>
                      setPostSettings({
                        ...postSettings,
                        metaDescription: e.target.value,
                      })
                    }
                    placeholder="SEO description"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Media Picker Dialog */}
      <MediaPicker
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onSelect={(file) => {
          setPostSettings((prev) => ({
            ...prev,
            featuredImage: file.url,
            featuredImageAlt: file.name,
          }));
          setMediaPickerOpen(false);
        }}
        mediaType="IMAGE"
      />

      {/* Publish Confirmation Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Post</DialogTitle>
            <DialogDescription>
              Select the sites you want to publish this post to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
            {sites.map((site) => (
              <label
                key={site.id}
                className="flex items-center gap-2 rounded px-1.5 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <input
                  type="checkbox"
                  checked={publishSiteIds.includes(site.id)}
                  onChange={() => handleTogglePublishSite(site.id)}
                  className="rounded border-zinc-300"
                />
                <span className="text-zinc-950 dark:text-white">
                  {site.name}
                </span>
                <span className="text-xs text-zinc-400">
                  {site.subdomain}
                </span>
              </label>
            ))}
            {sites.length === 0 && (
              <p className="px-1.5 py-1 text-sm text-zinc-500">
                No sites configured. The post will be published without site associations.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPublishDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={sites.length > 0 && publishSiteIds.length === 0}
            >
              <Eye className="mr-1.5 h-4 w-4" />
              Publish{publishSiteIds.length > 0 ? ` to ${publishSiteIds.length} site${publishSiteIds.length === 1 ? "" : "s"}` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unpublish Dialog */}
      <Dialog open={unpublishDialogOpen} onOpenChange={setUnpublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unpublish Post</DialogTitle>
            <DialogDescription>
              Uncheck sites to remove this post from them. Unchecking all sites will revert the post to draft.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
            {sites.map((site) => (
              <label
                key={site.id}
                className="flex items-center gap-2 rounded px-1.5 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <input
                  type="checkbox"
                  checked={unpublishSiteIds.includes(site.id)}
                  onChange={() => handleToggleUnpublishSite(site.id)}
                  className="rounded border-zinc-300"
                />
                <span className="text-zinc-950 dark:text-white">
                  {site.name}
                </span>
                <span className="text-xs text-zinc-400">
                  {site.subdomain}
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnpublishDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnpublish}
            >
              <EyeOff className="mr-1.5 h-4 w-4" />
              {unpublishSiteIds.length === 0
                ? "Unpublish from all"
                : `Remove from ${postSettings.selectedSiteIds.length - unpublishSiteIds.length} site${postSettings.selectedSiteIds.length - unpublishSiteIds.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
