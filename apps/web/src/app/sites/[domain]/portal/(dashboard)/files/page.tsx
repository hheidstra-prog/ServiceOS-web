import { Metadata } from "next";
import { cookies } from "next/headers";
import { db } from "@serviceos/database";
import {
  Files,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  Download,
  FolderKanban,
} from "lucide-react";
import { format } from "date-fns";

interface FilesPageProps {
  params: Promise<{ domain: string }>;
}

async function getFiles(domain: string, token: string | undefined) {
  if (!token) return null;

  const site = await db.site.findFirst({
    where: {
      OR: [{ subdomain: domain }, { customDomain: domain }],
      status: "PUBLISHED",
      portalEnabled: true,
    },
    select: { organizationId: true },
  });

  if (!site) return null;

  const session = await db.portalSession.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
      client: { organizationId: site.organizationId },
    },
    select: { clientId: true },
  });

  if (!session) return null;

  const files = await db.file.findMany({
    where: { clientId: session.clientId },
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        select: { id: true, name: true },
      },
      uploadedBy: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  return files;
}

export const metadata: Metadata = {
  title: "Files",
};

export default async function FilesPage({ params }: FilesPageProps) {
  const { domain } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_token")?.value;

  const files = await getFiles(domain, token);

  if (!files) {
    return null;
  }

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return File;
    if (mimeType.startsWith("image/")) return FileImage;
    if (mimeType.startsWith("video/")) return FileVideo;
    if (mimeType.startsWith("audio/")) return FileAudio;
    if (
      mimeType.includes("pdf") ||
      mimeType.includes("document") ||
      mimeType.includes("text")
    )
      return FileText;
    return File;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Group files by project
  const filesWithProject = files.filter((f) => f.project);
  const filesWithoutProject = files.filter((f) => !f.project);

  const projectGroups = filesWithProject.reduce(
    (acc, file) => {
      const projectId = file.project!.id;
      if (!acc[projectId]) {
        acc[projectId] = {
          project: file.project!,
          files: [],
        };
      }
      acc[projectId].files.push(file);
      return acc;
    },
    {} as Record<string, { project: { id: string; name: string }; files: typeof files }>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Files</h1>
        <p className="mt-1 text-zinc-600">
          Access and download your files.
        </p>
      </div>

      {files.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-zinc-200">
          <Files className="mx-auto h-12 w-12 text-zinc-300" />
          <h3 className="mt-4 font-semibold text-zinc-900">No files yet</h3>
          <p className="mt-2 text-sm text-zinc-600">
            Files will appear here once they&apos;re uploaded.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Files by Project */}
          {Object.values(projectGroups).map(({ project, files: projectFiles }) => (
            <div key={project.id}>
              <div className="mb-4 flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-zinc-400" />
                <h2 className="text-lg font-semibold text-zinc-900">
                  {project.name}
                </h2>
              </div>
              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
                <div className="divide-y divide-zinc-100">
                  {projectFiles.map((file) => {
                    const Icon = getFileIcon(file.mimeType);
                    return (
                      <div
                        key={file.id}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                          <Icon className="h-5 w-5 text-zinc-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium text-zinc-900">
                            {file.name}
                          </p>
                          <p className="text-sm text-zinc-500">
                            {formatFileSize(file.size)} •{" "}
                            {format(new Date(file.createdAt), "MMM d, yyyy")}
                            {file.uploadedBy &&
                              ` • Uploaded by ${file.uploadedBy.firstName} ${file.uploadedBy.lastName}`}
                          </p>
                        </div>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Files without project */}
          {filesWithoutProject.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900">
                General Files
              </h2>
              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
                <div className="divide-y divide-zinc-100">
                  {filesWithoutProject.map((file) => {
                    const Icon = getFileIcon(file.mimeType);
                    return (
                      <div
                        key={file.id}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                          <Icon className="h-5 w-5 text-zinc-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium text-zinc-900">
                            {file.name}
                          </p>
                          <p className="text-sm text-zinc-500">
                            {formatFileSize(file.size)} •{" "}
                            {format(new Date(file.createdAt), "MMM d, yyyy")}
                            {file.uploadedBy &&
                              ` • Uploaded by ${file.uploadedBy.firstName} ${file.uploadedBy.lastName}`}
                          </p>
                        </div>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
