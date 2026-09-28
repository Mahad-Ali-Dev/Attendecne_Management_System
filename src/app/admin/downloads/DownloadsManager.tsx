"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDesktopBuild, uploadDesktopBuild } from "./actions";
import { Modal } from "@/components/Modal";
import { formatDate, formatFileSize } from "@/lib/format";
import type { DesktopBuild } from "@/lib/types";
import { Download, Loader2, Trash2, Upload } from "lucide-react";

export function DownloadsManager({ builds }: { builds: DesktopBuild[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DesktopBuild | null>(null);
  const [deleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await uploadDesktopBuild(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setFileName("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const res = await deleteDesktopBuild(deleteTarget.path);
      if (res?.error) {
        setDeleteError(res.error);
      } else {
        router.refresh();
        setDeleteTarget(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-semibold text-navy">Upload a new build</h2>
        <p className="mt-1 text-sm text-slate-500">
          Employees always see the most recently uploaded build on their Tracker page.
        </p>
        <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept=".zip"
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            className="input"
          />
          <button type="submit" disabled={pending || !fileName} className="btn-primary shrink-0">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-navy">Uploaded builds</h2>
        </div>
        {builds.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">No builds uploaded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-6 py-3 font-medium">File</th>
                <th className="px-6 py-3 font-medium">Size</th>
                <th className="px-6 py-3 font-medium">Uploaded</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {builds.map((b, i) => (
                <tr key={b.path} className="text-slate-600">
                  <td className="px-6 py-3 font-medium text-navy">
                    {b.filename}
                    {i === 0 && <span className="badge ml-2 bg-emerald-50 text-emerald-700">Current</span>}
                  </td>
                  <td className="px-6 py-3">{formatFileSize(b.size)}</td>
                  <td className="px-6 py-3">{formatDate(b.uploadedAt)}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={b.url}
                        download={b.filename}
                        aria-label={`Download ${b.filename}`}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-navy"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => {
                          setDeleteTarget(b);
                          setDeleteError(null);
                        }}
                        aria-label={`Delete ${b.filename}`}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteTarget && (
        <Modal title="Delete build" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-600">
            Delete <strong className="text-navy">{deleteTarget.filename}</strong>? Employees won&apos;t be able to
            download it anymore. This can&apos;t be undone.
          </p>
          {deleteError && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}
          <div className="flex justify-end gap-2 pt-5">
            <button type="button" onClick={() => setDeleteTarget(null)} className="btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="btn bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
