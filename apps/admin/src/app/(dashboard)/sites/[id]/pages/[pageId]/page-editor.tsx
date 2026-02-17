"use client";

import { useState } from "react";
import {
  Loader2,
  Plus,
  Save,
  Eye,
  Settings,
  Type,
  Image,
  Layout,
  MessageSquare,
  Star,
  Zap,
  Phone,
  Layers,
  Sparkles,
  Wand2,
  BarChart3,
  HelpCircle,
  ListOrdered,
  DollarSign,
  Building2,
  Columns3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { updatePage, aiGenerateSEO, aiCreateBlockFromPrompt } from "../../../actions";
import { BlockChat, type ChatMessage } from "./block-chat";
import { BlockPreviewRenderer } from "@/components/preview/block-preview-renderer";
import type { SiteTheme } from "@/components/preview/preview-theme";

type BlockType = "hero" | "text" | "features" | "services" | "testimonials" | "cta" | "contact" | "image" | "stats" | "faq" | "process" | "pricing" | "logos" | "columns";

interface Block {
  id: string;
  type: BlockType;
  data: Record<string, unknown>;
}

interface PageContent {
  blocks: Block[];
}

interface Page {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  content: PageContent;
  metaTitle: string | null;
  metaDescription: string | null;
}

interface PageEditorProps {
  siteId: string;
  page: Page;
  siteTheme?: SiteTheme;
}

const blockTypes: Array<{ type: BlockType; label: string; icon: typeof Layout; description: string }> = [
  { type: "hero", label: "Hero", icon: Layout, description: "Large hero section with heading and CTA" },
  { type: "text", label: "Text", icon: Type, description: "Rich text content block" },
  { type: "features", label: "Features", icon: Zap, description: "Feature grid with icons" },
  { type: "services", label: "Services", icon: Layers, description: "List of services" },
  { type: "testimonials", label: "Testimonials", icon: MessageSquare, description: "Customer testimonials" },
  { type: "cta", label: "Call to Action", icon: Star, description: "Prominent CTA section" },
  { type: "contact", label: "Contact", icon: Phone, description: "Contact form" },
  { type: "image", label: "Image", icon: Image, description: "Full-width image" },
  { type: "stats", label: "Stats", icon: BarChart3, description: "Key statistics display" },
  { type: "faq", label: "FAQ", icon: HelpCircle, description: "Frequently asked questions" },
  { type: "process", label: "Process", icon: ListOrdered, description: "Step-by-step process" },
  { type: "pricing", label: "Pricing", icon: DollarSign, description: "Pricing plans grid" },
  { type: "logos", label: "Logos", icon: Building2, description: "Logo carousel or grid" },
  { type: "columns", label: "Columns", icon: Columns3, description: "Flexible multi-column layout" },
];

function generateBlockId() {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultBlockData(type: string): Record<string, unknown> {
  switch (type) {
    case "hero":
      return {
        heading: "Welcome to Our Site",
        subheading: "We help businesses succeed",
        ctaText: "Get Started",
        ctaLink: "/contact",
        backgroundImage: "",
      };
    case "text":
      return {
        heading: "",
        content: "<p>Add your content here...</p>",
        align: "left",
      };
    case "features":
      return {
        heading: "Our Features",
        subheading: "What makes us different",
        features: [
          { icon: "zap", title: "Feature 1", description: "Description here" },
          { icon: "shield", title: "Feature 2", description: "Description here" },
          { icon: "heart", title: "Feature 3", description: "Description here" },
        ],
      };
    case "services":
      return {
        heading: "Our Services",
        subheading: "What we offer",
        services: [],
      };
    case "testimonials":
      return {
        heading: "What Our Clients Say",
        subheading: "",
        testimonials: [
          { quote: "Amazing service!", author: "John Doe", role: "CEO", company: "Acme Inc" },
        ],
      };
    case "cta":
      return {
        heading: "Ready to Get Started?",
        subheading: "Contact us today",
        ctaText: "Contact Us",
        ctaLink: "/contact",
        style: "centered",
      };
    case "contact":
      return {
        heading: "Get in Touch",
        subheading: "We'd love to hear from you",
        showMap: false,
      };
    case "image":
      return {
        src: "",
        alt: "",
        caption: "",
      };
    case "stats":
      return {
        heading: "By the Numbers",
        stats: [
          { value: "500+", label: "Customers" },
          { value: "99%", label: "Satisfaction" },
          { value: "24/7", label: "Support" },
          { value: "50+", label: "Countries" },
        ],
      };
    case "faq":
      return {
        heading: "Frequently Asked Questions",
        subheading: "",
        items: [
          { question: "What is your service?", answer: "We provide top-quality solutions for your business needs." },
          { question: "How does pricing work?", answer: "We offer flexible pricing plans to suit businesses of all sizes." },
        ],
      };
    case "process":
      return {
        heading: "How It Works",
        subheading: "Our simple process",
        steps: [
          { title: "Step 1", description: "Get started by reaching out to us" },
          { title: "Step 2", description: "We'll create a custom plan for you" },
          { title: "Step 3", description: "Watch your business grow" },
        ],
      };
    case "pricing":
      return {
        heading: "Pricing Plans",
        subheading: "Choose the plan that's right for you",
        plans: [
          { name: "Starter", price: "$29", period: "month", features: ["Feature 1", "Feature 2"], ctaText: "Get Started" },
          { name: "Pro", price: "$79", period: "month", features: ["Everything in Starter", "Feature 3", "Feature 4"], highlighted: true, ctaText: "Get Started" },
          { name: "Enterprise", price: "$199", period: "month", features: ["Everything in Pro", "Feature 5", "Feature 6"], ctaText: "Contact Us" },
        ],
      };
    case "logos":
      return {
        heading: "Trusted by Industry Leaders",
        logos: [
          { name: "Company A" },
          { name: "Company B" },
          { name: "Company C" },
          { name: "Company D" },
        ],
      };
    case "columns":
      return {
        columns: 2,
        layout: "equal",
        items: [
          { heading: "Left Column", text: "Add your content here." },
          { heading: "Right Column", text: "Add your content here." },
        ],
      };
    default:
      return {};
  }
}

export function PageEditor({ siteId, page, siteTheme }: PageEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(page.content.blocks || []);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
  const [blockChatMessages, setBlockChatMessages] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [pageSettings, setPageSettings] = useState({
    title: page.title,
    slug: page.slug,
    metaTitle: page.metaTitle || "",
    metaDescription: page.metaDescription || "",
  });

  const handleAddBlock = (type: BlockType) => {
    const newBlock: Block = {
      id: generateBlockId(),
      type,
      data: getDefaultBlockData(type),
    };

    if (insertAfterIndex !== null && insertAfterIndex >= 0) {
      const newBlocks = [...blocks];
      newBlocks.splice(insertAfterIndex + 1, 0, newBlock);
      setBlocks(newBlocks);
    } else {
      setBlocks([...blocks, newBlock]);
    }

    setSelectedBlock(newBlock.id);
    setIsAddBlockOpen(false);
    setInsertAfterIndex(null);
  };

  const handleAiAddBlock = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    try {
      const result = await aiCreateBlockFromPrompt(siteId, aiPrompt);
      const newBlock: Block = {
        id: generateBlockId(),
        type: result.type as BlockType,
        data: result.data,
      };

      let newBlocks: Block[];
      if (insertAfterIndex !== null && insertAfterIndex >= 0) {
        newBlocks = [...blocks];
        newBlocks.splice(insertAfterIndex + 1, 0, newBlock);
      } else {
        newBlocks = [...blocks, newBlock];
      }

      setBlocks(newBlocks);
      setSelectedBlock(newBlock.id);
      setIsAddBlockOpen(false);
      setInsertAfterIndex(null);
      setAiPrompt("");

      // Auto-save so the new block is immediately visible in preview
      await updatePage(siteId, page.id, {
        title: pageSettings.title,
        slug: pageSettings.slug,
        metaTitle: pageSettings.metaTitle || undefined,
        metaDescription: pageSettings.metaDescription || undefined,
        content: JSON.parse(JSON.stringify({ blocks: newBlocks })),
      });
      toast.success("Block generated and saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate block"
      );
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleDeleteBlock = (blockId: string) => {
    setBlocks(blocks.filter((b) => b.id !== blockId));
    if (selectedBlock === blockId) {
      setSelectedBlock(null);
    }
  };

  const handleMoveBlock = (blockId: string, direction: "up" | "down") => {
    const index = blocks.findIndex((b) => b.id === blockId);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const handleUpdateBlockData = (blockId: string, data: Record<string, unknown>) => {
    setBlocks(
      blocks.map((b) => (b.id === blockId ? { ...b, data: { ...b.data, ...data } } : b))
    );
  };

  const handleAddBlockAfter = (index: number) => {
    setInsertAfterIndex(index);
    setIsAddBlockOpen(true);
  };

  const handleAIGenerateSEO = async () => {
    setIsGeneratingSEO(true);
    try {
      const generated = await aiGenerateSEO(siteId, page.id);
      setPageSettings({
        ...pageSettings,
        metaTitle: generated.metaTitle,
        metaDescription: generated.metaDescription,
      });
      toast.success("SEO metadata generated!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate SEO metadata"
      );
    } finally {
      setIsGeneratingSEO(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePage(siteId, page.id, {
        title: pageSettings.title,
        slug: pageSettings.slug,
        metaTitle: pageSettings.metaTitle || undefined,
        metaDescription: pageSettings.metaDescription || undefined,
        content: JSON.parse(JSON.stringify({ blocks })),
      });
      toast.success("Page saved successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save page"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsSaving(true);
    try {
      await updatePage(siteId, page.id, {
        title: pageSettings.title,
        slug: pageSettings.slug,
        metaTitle: pageSettings.metaTitle || undefined,
        metaDescription: pageSettings.metaDescription || undefined,
        content: JSON.parse(JSON.stringify({ blocks })),
        isPublished: true,
      });
      toast.success("Page published successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to publish page"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectedBlockData = blocks.find((b) => b.id === selectedBlock);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Editor — Visual Preview */}
      <div className="lg:col-span-2 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <Button variant="outline" onClick={() => { setInsertAfterIndex(null); setIsAddBlockOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Block
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Save Draft
            </Button>
            <Button onClick={handlePublish} disabled={isSaving}>
              <Eye className="mr-1.5 h-4 w-4" />
              Publish
            </Button>
          </div>
        </div>

        {/* Visual Block Preview */}
        <BlockPreviewRenderer
          blocks={blocks}
          selectedBlockId={selectedBlock}
          onSelectBlock={setSelectedBlock}
          onDeselectBlock={() => setSelectedBlock(null)}
          onMoveBlock={handleMoveBlock}
          onDeleteBlock={handleDeleteBlock}
          onAddBlockAfter={handleAddBlockAfter}
          siteTheme={siteTheme}
        />
      </div>

      {/* Sidebar — sticky so it follows scroll */}
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Tabs defaultValue="ai">
          <TabsList className="w-full">
            <TabsTrigger value="ai" className="flex-1">
              <Sparkles className="mr-1 h-3.5 w-3.5" /> AI
            </TabsTrigger>
            <TabsTrigger value="page" className="flex-1">
              <Settings className="mr-1 h-3.5 w-3.5" /> Page
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="mt-4">
            {selectedBlockData ? (
              <Card className="overflow-hidden">
                <CardHeader className="pb-0 pt-3 px-3">
                  <CardDescription className="text-xs">
                    Editing: {blockTypes.find((t) => t.type === selectedBlockData.type)?.label || selectedBlockData.type}
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[500px] p-0">
                  <BlockChat
                    block={selectedBlockData}
                    siteId={siteId}
                    siteTheme={siteTheme}
                    messages={blockChatMessages[selectedBlockData.id] || []}
                    onMessagesChange={(msgs) =>
                      setBlockChatMessages((prev) => ({
                        ...prev,
                        [selectedBlockData.id]: msgs,
                      }))
                    }
                    onBlockUpdate={(data) =>
                      handleUpdateBlockData(selectedBlockData.id, data)
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-zinc-300" />
                  <p className="mt-2 text-sm text-zinc-500">
                    Select a block in the preview to edit it with AI
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="page" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Page Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pageTitle">Title</Label>
                  <Input
                    id="pageTitle"
                    value={pageSettings.title}
                    onChange={(e) =>
                      setPageSettings({ ...pageSettings, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pageSlug">URL Slug</Label>
                  <Input
                    id="pageSlug"
                    value={pageSettings.slug}
                    onChange={(e) =>
                      setPageSettings({ ...pageSettings, slug: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="metaTitle">Meta Title</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAIGenerateSEO}
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
                    value={pageSettings.metaTitle}
                    onChange={(e) =>
                      setPageSettings({ ...pageSettings, metaTitle: e.target.value })
                    }
                    placeholder="SEO title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={pageSettings.metaDescription}
                    onChange={(e) =>
                      setPageSettings({
                        ...pageSettings,
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

      {/* Add Block Dialog */}
      <Dialog open={isAddBlockOpen} onOpenChange={(open) => { setIsAddBlockOpen(open); if (!open) { setInsertAfterIndex(null); setAiPrompt(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Block</DialogTitle>
            <DialogDescription className="sr-only">
              Add a new block to your page.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="ai">
            <TabsList className="w-full">
              <TabsTrigger value="ai" className="flex-1">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                AI Assistant
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1">
                <Layers className="mr-1.5 h-3.5 w-3.5" />
                Manual
              </TabsTrigger>
            </TabsList>
            <TabsContent value="ai" className="mt-4 space-y-4">
              <p className="text-sm text-zinc-500">
                Describe the section you want and AI will create it for you.
              </p>
              <form
                onSubmit={(e) => { e.preventDefault(); handleAiAddBlock(); }}
                className="space-y-3"
              >
                <Textarea
                  placeholder="e.g. A pricing section with 3 plans: Starter, Pro, and Enterprise..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={isAiGenerating}
                  rows={4}
                />
                <Button type="submit" className="w-full" disabled={isAiGenerating || !aiPrompt.trim()}>
                  {isAiGenerating ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-4 w-4" />
                  )}
                  {isAiGenerating ? "Generating..." : "Generate Block"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="manual" className="mt-4">
              <div className="grid gap-2 sm:grid-cols-2 max-h-[60vh] overflow-y-auto">
                {blockTypes.map((blockType) => {
                  const Icon = blockType.icon;
                  return (
                    <button
                      key={blockType.type}
                      onClick={() => handleAddBlock(blockType.type)}
                      className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 text-left hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <Icon className="h-5 w-5 text-zinc-500" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-950 dark:text-white">
                          {blockType.label}
                        </p>
                        <p className="text-xs text-zinc-500">{blockType.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
