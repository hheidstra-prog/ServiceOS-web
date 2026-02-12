"use client";

import { ExternalLink } from "lucide-react";
import type { SiteReference } from "../../types";

interface SitePreviewCardProps {
  reference: SiteReference;
}

export function SitePreviewCard({ reference }: SitePreviewCardProps) {
  const domain = getDomain(reference.url);
  const screenshotUrl = `https://image.thum.io/get/width/600/crop/400/${reference.url}`;

  return (
    <a
      href={reference.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      {/* Screenshot thumbnail */}
      <div className="relative h-32 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screenshotUrl}
          alt={`Screenshot of ${reference.title}`}
          className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          {/* Favicon */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt=""
            className="h-4 w-4 rounded-sm"
            loading="lazy"
          />
          <span className="text-sm font-medium text-zinc-900 dark:text-white">
            {reference.title}
          </span>
          <ExternalLink className="ml-auto h-3 w-3 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {reference.description}
        </p>
      </div>
    </a>
  );
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
