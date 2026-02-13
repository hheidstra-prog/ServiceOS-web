"use client";

import { useState, useCallback, useRef } from "react";
import { Search, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface FreepikImage {
  id: number;
  title: string;
  url: string;
  thumbnail: { url: string };
  author: { name: string };
  licenses: Array<{ type: string }>;
  orientation: string;
}

interface SelectedFile {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

interface FreepikBrowserProps {
  onSelect: (file: SelectedFile) => void;
}

export function FreepikBrowser({ onSelect }: FreepikBrowserProps) {
  const [query, setQuery] = useState("");
  const [images, setImages] = useState<FreepikImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<string>("all");
  const [license, setLicense] = useState<string>("freemium");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchImages = useCallback(
    async (searchQuery: string, pageNum: number = 1) => {
      if (!searchQuery.trim()) return;
      setIsSearching(true);

      try {
        const params = new URLSearchParams({
          q: searchQuery,
          page: String(pageNum),
        });

        if (orientation !== "all") params.set("orientation", orientation);
        if (license !== "all") params.set("license", license);

        const res = await fetch(`/api/media/freepik?${params}`);
        if (!res.ok) throw new Error("Search failed");

        const data = await res.json();

        if (pageNum === 1) {
          setImages(data.images || []);
        } else {
          setImages((prev) => [...prev, ...(data.images || [])]);
        }

        setPage(pageNum);
        setHasMore(
          data.meta?.currentPage < data.meta?.lastPage
        );
      } catch (error) {
        toast.error("Failed to search stock images");
      } finally {
        setIsSearching(false);
      }
    },
    [orientation, license]
  );

  const handleSearch = () => {
    searchImages(query, 1);
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.trim()) searchImages(value, 1);
    }, 500);
  };

  const handleDownload = async (image: FreepikImage) => {
    setDownloadingId(image.id);
    try {
      const res = await fetch("/api/media/freepik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: image.id }),
      });

      if (!res.ok) throw new Error("Download failed");

      const data = await res.json();
      onSelect(data.file);
      toast.success("Image added to library");
    } catch (error) {
      toast.error("Failed to download image");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search stock images..."
            className="pl-9"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={!query.trim() || isSearching}
          variant="outline"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Search"
          )}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["all", "landscape", "portrait", "square"].map((o) => (
          <button
            key={o}
            onClick={() => {
              setOrientation(o);
              if (query.trim()) searchImages(query, 1);
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              orientation === o
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            {o === "all" ? "All" : o.charAt(0).toUpperCase() + o.slice(1)}
          </button>
        ))}
        <div className="w-px bg-zinc-200 dark:bg-zinc-800" />
        {["all", "freemium", "premium"].map((l) => (
          <button
            key={l}
            onClick={() => {
              setLicense(l);
              if (query.trim()) searchImages(query, 1);
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              license === l
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            {l === "all" ? "All" : l === "freemium" ? "Free" : "Premium"}
          </button>
        ))}
      </div>

      {/* Results */}
      {images.length === 0 && !isSearching ? (
        <div className="py-12 text-center">
          <p className="text-sm text-zinc-500">
            {query ? "No images found. Try a different search." : "Search for stock images above."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative cursor-pointer overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
              onClick={() => handleDownload(image)}
            >
              <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-900">
                <img
                  src={image.thumbnail.url}
                  alt={image.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                {downloadingId === image.id ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <Download className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </div>

              {/* License badge */}
              <div className="absolute left-1.5 top-1.5">
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    image.licenses.some((l) => l.type === "premium")
                      ? "bg-orange-500/90 text-white"
                      : "bg-emerald-500/90 text-white"
                  }`}
                >
                  {image.licenses.some((l) => l.type === "premium")
                    ? "Premium"
                    : "Free"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isSearching && images.length > 0 && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      )}

      {hasMore && !isSearching && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => searchImages(query, page + 1)}
          >
            Load More
          </Button>
        </div>
      )}

      {/* Attribution */}
      <p className="text-center text-[10px] text-zinc-400">
        Images provided by Freepik
      </p>
    </div>
  );
}
