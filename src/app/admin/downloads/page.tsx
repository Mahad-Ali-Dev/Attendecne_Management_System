import { requireAdmin } from "@/lib/data";
import { listDesktopBuilds } from "@/lib/desktopBuilds";
import { DownloadsManager } from "./DownloadsManager";

export const dynamic = "force-dynamic";

export default async function AdminDownloadsPage() {
  await requireAdmin();
  const builds = await listDesktopBuilds();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Tracker</h1>
        <p className="mt-1 text-sm text-slate-500">Manage the tracker desktop app builds your team installs.</p>
      </div>

      <DownloadsManager builds={builds} />
    </div>
  );
}
