import { getCurrentProfile } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";
import { listDesktopBuilds, formatFileSize } from "@/lib/desktopBuilds";
import { formatDate } from "@/lib/format";
import { Download, Monitor } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DownloadsPage() {
  await getCurrentProfile();
  // Storage's list() needs its own RLS policy on storage.objects, which
  // this project's bucket doesn't have — the admin client bypasses that,
  // same as the avatar upload already does.
  const builds = await listDesktopBuilds(createAdminClient());
  const latest = builds[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Tracker</h1>
        <p className="mt-1 text-sm text-slate-500">Get the tracker app that records your Productivity data.</p>
      </div>

      <div className="card p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Monitor className="h-7 w-7" />
        </div>

        {latest ? (
          <>
            <h2 className="mt-4 text-lg font-semibold text-navy">{latest.filename}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {formatFileSize(latest.size)} · uploaded {formatDate(latest.uploadedAt)}
            </p>
            <a
              href={latest.url}
              download={latest.filename}
              className="btn-primary mx-auto mt-5 inline-flex w-fit"
            >
              <Download className="h-4 w-4" /> Download
            </a>
            <p className="mx-auto mt-4 max-w-sm text-xs text-slate-400">
              Extract the zip file and run the app inside. If you already have it installed, this replaces it with
              the latest version.
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No build has been uploaded yet — check back soon.</p>
        )}
      </div>
    </div>
  );
}
