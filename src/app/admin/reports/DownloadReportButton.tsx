"use client";

import dynamic from "next/dynamic";

// @react-pdf/renderer touches browser-only APIs at import time, so the
// download button must never be part of the server-rendered bundle.
export const DownloadReportButton = dynamic(() => import("./ReportPDF").then((m) => m.ReportDownloadButton), {
  ssr: false,
  loading: () => (
    <button className="btn-primary" disabled>
      Preparing…
    </button>
  ),
});
