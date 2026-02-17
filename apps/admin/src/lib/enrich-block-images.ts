import { db } from "@serviceos/database";
import { revalidatePath } from "next/cache";
import {
  searchFreepikImages,
  downloadAndStoreFreepikImage,
} from "@/lib/freepik";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Block {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface PageWithBlocks {
  pageId: string;
  blocks: Block[];
}

interface ImageSlot {
  pageId: string;
  blockId: string;
  /** Dot-separated path inside block.data, e.g. "backgroundImage" or "items.2.image" */
  fieldPath: string;
  /** Text extracted from the block for building a search query */
  textParts: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

/** Build a short search query from heading / subheading text. */
function buildSearchQuery(textParts: string[]): string {
  const STOP_WORDS = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "shall",
    "should", "may", "might", "must", "can", "could", "of", "in", "to",
    "for", "with", "on", "at", "from", "by", "about", "as", "into",
    "through", "during", "before", "after", "and", "but", "or", "nor",
    "not", "so", "yet", "both", "either", "neither", "each", "every",
    "all", "any", "few", "more", "most", "other", "some", "such", "no",
    "only", "own", "same", "than", "too", "very", "just", "our", "your",
    "we", "us", "you", "they", "them", "their", "its", "this", "that",
    "it", "i", "my", "me",
  ]);

  const words = textParts
    .join(" ")
    .replace(/<[^>]*>/g, "")          // strip HTML tags
    .replace(/[^\w\s]/g, " ")         // strip punctuation
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  return words.slice(0, 4).join(" ");
}

/** Set a value on an object using a dot-separated path like "items.2.image". */
function setNestedField(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const nextKey = parts[i + 1];
    if (current[key] === undefined || current[key] === null) {
      current[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

/** Run an async function over items with bounded concurrency. */
async function parallelMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Slot collection
// ---------------------------------------------------------------------------

function collectImageSlots(pages: PageWithBlocks[]): ImageSlot[] {
  const slots: ImageSlot[] = [];

  for (const { pageId, blocks } of pages) {
    for (const block of blocks) {
      const d = block.data;

      switch (block.type) {
        case "hero": {
          const variant = d.variant as string | undefined;
          const textParts = [d.heading, d.subheading].filter(Boolean) as string[];
          if (textParts.length === 0) break;

          if (variant === "split") {
            if (isEmpty(d.image)) {
              slots.push({ pageId, blockId: block.id, fieldPath: "image", textParts });
            }
          } else {
            // "background", "centered", or unset → use backgroundImage
            if (isEmpty(d.backgroundImage)) {
              slots.push({ pageId, blockId: block.id, fieldPath: "backgroundImage", textParts });
            }
          }
          break;
        }

        case "image": {
          if (isEmpty(d.src)) {
            const textParts = [d.alt, d.caption, d.heading].filter(Boolean) as string[];
            if (textParts.length === 0) textParts.push("professional business");
            slots.push({ pageId, blockId: block.id, fieldPath: "src", textParts });
          }
          break;
        }

        case "columns": {
          const items = d.items as Array<Record<string, unknown>> | undefined;
          if (!items) break;
          const sectionText = [d.heading, d.subheading].filter(Boolean) as string[];

          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!isEmpty(item.image)) continue;
            // Only enrich items that have some text content
            const itemText = [item.heading, item.text].filter(Boolean) as string[];
            if (itemText.length === 0) continue;
            slots.push({
              pageId,
              blockId: block.id,
              fieldPath: `items.${i}.image`,
              textParts: [...itemText, ...sectionText],
            });
          }
          break;
        }
      }
    }
  }

  return slots;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function enrichBlocksWithStockImages(
  pages: PageWithBlocks[],
  organizationId: string,
  siteId: string,
): Promise<void> {
  const slots = collectImageSlots(pages);
  if (slots.length === 0) return;

  // Group slots by query to avoid duplicate Freepik searches
  const queryMap = new Map<string, ImageSlot[]>();
  for (const slot of slots) {
    const query = buildSearchQuery(slot.textParts);
    if (!query) continue;
    const existing = queryMap.get(query);
    if (existing) {
      existing.push(slot);
    } else {
      queryMap.set(query, [slot]);
    }
  }

  // Search Freepik for each unique query (max 3 concurrent)
  const searchEntries = Array.from(queryMap.entries());
  const searchResults = await parallelMap(
    searchEntries,
    async ([query]) => {
      try {
        const result = await searchFreepikImages({
          query,
          limit: 3,
          filters: { license: "freemium" },
        });
        return result.images;
      } catch {
        return [];
      }
    },
    3,
  );

  // Assign images to slots, avoiding reuse of the same resource
  const usedResourceIds = new Set<number>();
  const assignments: Array<{ slot: ImageSlot; resourceId: number; title: string }> = [];

  for (let i = 0; i < searchEntries.length; i++) {
    const [, slotsForQuery] = searchEntries[i];
    const images = searchResults[i];
    if (!images || images.length === 0) continue;

    let imageIdx = 0;
    for (const slot of slotsForQuery) {
      // Find next unused image
      while (imageIdx < images.length && usedResourceIds.has(images[imageIdx].id)) {
        imageIdx++;
      }
      if (imageIdx >= images.length) break;

      const image = images[imageIdx];
      usedResourceIds.add(image.id);
      imageIdx++;

      const title = `${slot.fieldPath.includes("items") ? "Column" : slot.fieldPath === "src" ? "Image" : "Hero"} image - ${slot.textParts[0]?.slice(0, 50) || "Stock photo"}`;
      assignments.push({ slot, resourceId: image.id, title });
    }
  }

  if (assignments.length === 0) return;

  // Import images to Cloudinary (max 3 concurrent)
  const importResults = await parallelMap(
    assignments,
    async ({ resourceId, title }) => {
      try {
        const file = await downloadAndStoreFreepikImage(resourceId, organizationId, title);
        return file.url;
      } catch {
        return null;
      }
    },
    3,
  );

  // Group updates by pageId
  const pageUpdates = new Map<string, Array<{ blockId: string; fieldPath: string; url: string }>>();

  for (let i = 0; i < assignments.length; i++) {
    const url = importResults[i];
    if (!url) continue;

    const { slot } = assignments[i];
    const existing = pageUpdates.get(slot.pageId);
    const update = { blockId: slot.blockId, fieldPath: slot.fieldPath, url };
    if (existing) {
      existing.push(update);
    } else {
      pageUpdates.set(slot.pageId, [update]);
    }
  }

  // Apply updates to each page in the DB
  for (const [pageId, updates] of pageUpdates) {
    try {
      const page = await db.page.findUnique({ where: { id: pageId } });
      if (!page) continue;

      const content = page.content as { blocks: Block[] } | null;
      if (!content?.blocks) continue;

      for (const { blockId, fieldPath, url } of updates) {
        const block = content.blocks.find((b) => b.id === blockId);
        if (!block) continue;
        setNestedField(block.data, fieldPath, url);
      }

      await db.page.update({
        where: { id: pageId },
        data: { content: JSON.parse(JSON.stringify(content)) },
      });
    } catch (err) {
      console.error(`Failed to update page ${pageId} with stock images:`, err);
    }
  }

  revalidatePath(`/sites/${siteId}`);
}
