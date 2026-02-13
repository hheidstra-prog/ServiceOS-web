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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  updateBlogPost,
  publishBlogPost,
  unpublishBlogPost,
  createBlogCategory,
  createBlogTag,
} from "../actions";
import { BlogContentChat, type ChatMessage } from "./blog-content-chat";
import { NovelEditor } from "@/components/novel-editor";
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

interface BlogPostEditorProps {
  post: Post;
  categories: Category[];
  tags: Tag[];
}

export function BlogPostEditor({
  post,
  categories,
  tags,
}: BlogPostEditorProps) {
  const [tiptapContent, setTiptapContent] = useState<JSONContent | undefined>(
    post.content || undefined
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const editorRef = useRef<EditorInstance | null>(null);

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
  });

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

  const handlePublish = async () => {
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
      // Then publish (sets status + creates publication)
      await publishBlogPost(post.id);
      setPostSettings((prev) => ({ ...prev, status: "PUBLISHED" }));
      toast.success("Post published successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to publish post"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnpublish = async () => {
    setIsSaving(true);
    try {
      await unpublishBlogPost(post.id);
      setPostSettings((prev) => ({ ...prev, status: "DRAFT" }));
      toast.success("Post unpublished");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to unpublish post"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentUpdateFromChat = (html: string) => {
    if (editorRef.current) {
      editorRef.current.commands.setContent(html);
      setTiptapContent(editorRef.current.getJSON());
    }
  };

  const handleGenerateSEO = () => {
    setIsGeneratingSEO(true);
    try {
      const metaTitle = `${postSettings.title} | Blog`;
      const metaDesc = postSettings.excerpt || postSettings.title;

      setPostSettings((prev) => ({
        ...prev,
        metaTitle: metaTitle,
        metaDescription: metaDesc.slice(0, 160),
      }));
      toast.success("SEO metadata generated!");
    } finally {
      setIsGeneratingSEO(false);
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
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Novel Editor */}
      <div className="lg:col-span-2 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
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
              <Button variant="outline" onClick={handleUnpublish} disabled={isSaving}>
                <EyeOff className="mr-1.5 h-4 w-4" />
                Unpublish
              </Button>
            ) : (
              <Button onClick={handlePublish} disabled={isSaving}>
                <Eye className="mr-1.5 h-4 w-4" />
                Publish
              </Button>
            )}
          </div>
        </div>

        {/* Novel Editor */}
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
        />
      </div>

      {/* Sidebar */}
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Tabs defaultValue="ai">
          <TabsList className="w-full">
            <TabsTrigger value="ai" className="flex-1">
              <Sparkles className="mr-1 h-3.5 w-3.5" /> AI
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">
              <Settings className="mr-1 h-3.5 w-3.5" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="mt-4">
            <Card className="overflow-hidden">
              <CardContent className="h-[500px] p-0">
                <BlogContentChat
                  currentHtml={getCurrentHtml()}
                  messages={chatMessages}
                  onMessagesChange={setChatMessages}
                  onContentUpdate={handleContentUpdateFromChat}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Post Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="postTitle">Title</Label>
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
                  <Label htmlFor="postSlug">Slug</Label>
                  <div className="flex items-center">
                    <span className="flex h-9 items-center rounded-l-md border border-r-0 border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                      /
                    </span>
                    <Input
                      id="postSlug"
                      value={postSettings.slug}
                      onChange={(e) =>
                        setPostSettings({ ...postSettings, slug: e.target.value })
                      }
                      className="rounded-l-none"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={postSettings.status}
                    onValueChange={(v) =>
                      setPostSettings({ ...postSettings, status: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PUBLISHED">Published</SelectItem>
                      <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Excerpt */}
                <div className="space-y-2">
                  <Label htmlFor="postExcerpt">Excerpt</Label>
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setMediaPickerOpen(true)}
                  >
                    <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                    {postSettings.featuredImage ? "Change Image" : "Choose Image"}
                  </Button>
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
    </div>
  );
}
