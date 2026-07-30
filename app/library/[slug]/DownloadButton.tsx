"use client";

import { useState } from "react";

type DownloadButtonProps = {
  slug: string;
  bookTitle: string;
  accentBg: string;
};

type Format = "pdf" | "epub" | "docx";

export function DownloadButton({ slug, bookTitle, accentBg }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showFormats, setShowFormats] = useState(false);

  async function handleDownload(format: Format) {
    setLoading(true);
    setShowFormats(false);
    
    try {
      // Fetch the library book manifest with its exact configuration
      const res = await fetch(`/api/ebook/manifest/${slug}`);
      if (!res.ok) throw new Error("Could not fetch book from library");
      const manifest = await res.json();

      // Export using the library book's exact settings (template, printSpec, etc.)
      const exportRes = await fetch("/api/ebook/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manifest,
          formats: {
            pdf: format === "pdf",
            epub: format === "epub",
            docx: format === "docx",
          },
          template: manifest.selectedTemplate || "devotional",
          printSpec: manifest.printSpec,
        }),
      });

      if (!exportRes.ok) {
        const error = await exportRes.json();
        throw new Error(error.error || "Export failed");
      }

      const result = await exportRes.json();
      const url = result[`${format}Url`];
      
      if (!url) throw new Error("No download URL returned");

      // Download the file
      const a = document.createElement("a");
      a.href = url;
      const safeName = bookTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      a.download = `${safeName}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed:", err);
      alert(err instanceof Error ? err.message : "Failed to download book");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowFormats(!showFormats)}
        disabled={loading}
        className={`inline-flex min-h-14 items-center gap-2 rounded-2xl border-2 ${accentBg.replace("bg-", "border-").replace("hover:bg-", "hover:border-")} bg-transparent px-8 text-base font-bold transition active:scale-[0.97] disabled:opacity-50`}
        title="Download ebook"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path d="M12 3v12" strokeLinecap="round" />
          <polyline points="17 12 12 17 7 12" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
        </svg>
        {loading ? "Preparing..." : "Download"}
      </button>

      {showFormats && !loading && (
        <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-xl border-2 border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={() => handleDownload("pdf")}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-base hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-xl"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-red-600">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              <path d="M14 2v6h6" />
            </svg>
            <div>
              <div className="font-medium">PDF</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Print-ready</div>
            </div>
          </button>
          <button
            onClick={() => handleDownload("epub")}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-base hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-green-600">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <div>
              <div className="font-medium">EPUB</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">E-readers</div>
            </div>
          </button>
          <button
            onClick={() => handleDownload("docx")}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-base hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-xl"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-blue-600">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              <path d="M14 2v6h6" />
              <path d="M10 12l2 3 2-3" />
              <path d="M12 12v6" />
            </svg>
            <div>
              <div className="font-medium">Word</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Editable</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
