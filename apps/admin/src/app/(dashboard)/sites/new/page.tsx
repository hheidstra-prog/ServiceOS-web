import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDesignerBusinessContext } from "./actions";
import { AIDesigner } from "./components/ai-designer";

export default async function NewSitePage() {
  let businessContext;

  try {
    businessContext = await getDesignerBusinessContext();
  } catch {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Settings className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Complete your business profile first
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            The AI Designer needs your business information to create a personalized
            website. Please fill in your business profile in Settings.
          </p>
          <Link href="/settings">
            <Button className="mt-4">
              <Settings className="mr-1.5 h-4 w-4" />
              Go to Settings
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="-m-4 lg:-m-6">
      <AIDesigner businessContext={businessContext} />
    </div>
  );
}
