import { requireAuthWithOrg } from "@/lib/auth";
import { getFileCount } from "./actions";
import { FileManager } from "./file-manager";

export default async function FilesPage() {
  const { organization } = await requireAuthWithOrg();
  const fileCount = await getFileCount();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
          Files
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Find, organize, and manage your media library.
        </p>
      </div>
      <FileManager initialFileCount={fileCount} locale={organization.locale || "en"} />
    </div>
  );
}
