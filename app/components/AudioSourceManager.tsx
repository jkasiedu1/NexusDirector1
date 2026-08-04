"use client";

import { useState, useCallback } from "react";
import { ProseEditor } from "@/app/components/ProseEditor";

type AudioSource = {
  slot: number;
  label: string;
  audioFile: File | null;
  transcriptFile: File | null;
  currentTranscript: string;
  status: "idle" | "transcribing" | "complete" | "error" | "regenerating";
  wordCount: number;
  assignedSectionCount: number; // how many manuscript sections use this source
};

type Props = {
  audioSources: AudioSource[];
  onRegenerateSource: (slot: number, transcriptFile?: File) => Promise<void>;
  onTranscriptEdit: (slot: number, newTranscript: string) => void;
  onRemoveSource: (slot: number) => void;
};

export function AudioSourceManager({ audioSources, onRegenerateSource, onTranscriptEdit, onRemoveSource }: Props) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [newTranscriptFile, setNewTranscriptFile] = useState<File | null>(null);

  const activeSource = audioSources.find((s) => s.slot === activeSlot);

  const handleRegenerate = useCallback(async () => {
    if (!activeSource) return;
    try {
      await onRegenerateSource(activeSource.slot, newTranscriptFile ?? undefined);
      setNewTranscriptFile(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Regenerate failed");
    }
  }, [activeSource, newTranscriptFile, onRegenerateSource]);

  const handleRegenerateExisting = useCallback(async () => {
    if (!activeSource) return;
    if (!window.confirm(`Regenerate manuscript sections from ${activeSource.label}? This will rewrite ${activeSource.assignedSectionCount} section(s) using the current transcript.`)) return;
    try {
      await onRegenerateSource(activeSource.slot);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Regenerate failed");
    }
  }, [activeSource, onRegenerateSource]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3">
        <div className="mb-3 flex items-center justify-between">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Audio Sources
          </label>
          <span className="rounded-md bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
            {audioSources.filter((s) => s.status === "complete").length} / {audioSources.length} transcribed
          </span>
        </div>

        <div className="space-y-2">
          {audioSources.map((source) => (
            <button
              key={source.slot}
              type="button"
              onClick={() => setActiveSlot(source.slot)}
              className={[
                "w-full rounded-xl border p-3 text-left transition min-h-[60px]",
                activeSlot === source.slot
                  ? "border-cyan-400/50 bg-cyan-500/10"
                  : source.status === "error"
                  ? "border-red-700/40 bg-red-950/20"
                  : "border-slate-700/60 bg-slate-900/60 hover:border-slate-600",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">{source.label}</span>
                  {source.status === "complete" && (
                    <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
                      ✓
                    </span>
                  )}
                  {source.status === "transcribing" && (
                    <span className="rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-cyan-300">
                      Transcribing...
                    </span>
                  )}
                  {source.status === "regenerating" && (
                    <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
                      Regenerating...
                    </span>
                  )}
                  {source.status === "error" && (
                    <span className="rounded-md bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-300">
                      Error
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">{source.wordCount.toLocaleString()} words</span>
              </div>
              {source.audioFile && (
                <p className="mt-1 text-[10px] text-slate-400 truncate">{source.audioFile.name}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeSource && (
        <div className="space-y-3 rounded-xl border border-violet-500/20 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-violet-300">
              {activeSource.label} Controls
            </h3>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Remove ${activeSource.label} from the pipeline? This will regenerate the manuscript without this audio source.`)) {
                  onRemoveSource(activeSource.slot);
                  setActiveSlot(null);
                }
              }}
              className="min-h-[36px] rounded-lg border border-red-500/40 bg-red-500/10 px-3 text-xs font-semibold text-red-300 hover:bg-red-500/20"
            >
              Remove Source
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Upload new transcript
              </label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".txt,.md,.doc,.docx"
                  onChange={(e) => setNewTranscriptFile(e.target.files?.[0] ?? null)}
                  className="flex-1 rounded-xl border border-slate-700/60 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
                />
                <button
                  type="button"
                  disabled={!newTranscriptFile}
                  onClick={() => void handleRegenerate()}
                  className="min-h-[44px] rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Regenerate
                </button>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Upload a new transcript file (.txt, .md) to replace this source. Manuscript sections will be regenerated.
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-950/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-300 mb-2">
                Regenerate from current transcript
              </p>
              <p className="text-[10px] text-slate-300 mb-2">
                This will rewrite <span className="font-bold text-amber-200">{activeSource.assignedSectionCount} section(s)</span> that use {activeSource.label} without changing the transcript.
              </p>
              <button
                type="button"
                disabled={activeSource.assignedSectionCount === 0}
                onClick={() => void handleRegenerateExisting()}
                className="min-h-[36px] w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Regenerate Sections ({activeSource.assignedSectionCount})
              </button>
            </div>
          </div>

          <div>
            <ProseEditor
              label="Edit transcript manually"
              value={activeSource.currentTranscript}
              onChange={(value) => onTranscriptEdit(activeSource.slot, value)}
              rows={12}
              placeholder="Edit transcript text..."
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Manual edits will be used for manuscript generation. Save project to persist changes.
            </p>
          </div>
        </div>
      )}

      {!activeSource && audioSources.length > 0 && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-950/70 px-4 py-3 text-sm text-slate-400">
          Select an audio source above to retranscribe or edit its transcript.
        </div>
      )}
    </div>
  );
}
