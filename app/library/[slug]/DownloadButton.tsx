"use client";

type DownloadButtonProps = {
  slug: string;
  bookTitle: string;
  accentBg: string;
};

export function DownloadButton({ slug, bookTitle, accentBg }: DownloadButtonProps) {
  async function handleDownload() {
    try {
      const res = await fetch(`/api/ebook/manifest/${slug}`);
      if (!res.ok) throw new Error("Could not fetch manifest");
      const manifest = await res.json();
      downloadJson(manifest, bookTitle);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download book. Please try again.");
    }
  }

  function downloadJson(data: unknown, title: string) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    a.download = `${safeName}_nexus_ebook.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleDownload}
      className={`inline-flex min-h-14 items-center gap-2 rounded-2xl border-2 ${accentBg.replace("bg-", "border-").replace("hover:bg-", "hover:border-")} bg-transparent px-8 text-base font-bold transition active:scale-[0.97]`}
      title="Download complete ebook in Nexus format"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
        <path d="M12 3v12" strokeLinecap="round" />
        <polyline points="17 12 12 17 7 12" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
      </svg>
      Download
    </button>
  );
}
