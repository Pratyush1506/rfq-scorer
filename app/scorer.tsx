"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import type { Evaluation } from "@/lib/db";

const ALLOWED_EXTENSIONS = [".txt", ".md"];
const MAX_FILE_BYTES = 200 * 1024;

type Props = {
  rfqs: { id: string; title: string }[];
  initialEvaluations: Evaluation[];
};

// Reads an uploaded file as text, or returns an error message for anything
// that isn't a small plain-text file.
async function readProfileFile(file: File): Promise<{ text?: string; error?: string }> {
  const name = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return {
      error:
        "Only .txt or .md files are supported. For PDF or Word, copy the text and paste it below.",
    };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "File is too large (max 200 KB)." };
  }

  const text = await file.text();
  // Catches binaries renamed to .txt (e.g. a PDF): null bytes or lots of
  // undecodable characters.
  const replacementChars = text.split("�").length - 1;
  if (text.includes("\u0000") || replacementChars > text.length * 0.01) {
    return { error: "This file doesn't look like plain text." };
  }
  if (!text.trim()) {
    return { error: "The file is empty." };
  }
  return { text };
}

function scoreColor(score: number) {
  if (score >= 70) return "bg-green-100 text-green-800";
  if (score >= 41) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function ReasonsAndGaps({ evaluation }: { evaluation: Evaluation }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <h3 className="text-sm font-semibold text-green-700">Supporting reasons</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
          {evaluation.result.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-red-700">Gaps</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
          {evaluation.result.gaps.map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Scorer({ rfqs, initialEvaluations }: Props) {
  const [rfqId, setRfqId] = useState(rfqs[0]?.id ?? "");
  const [profile, setProfile] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [latest, setLatest] = useState<Evaluation | null>(null);
  const [evaluations, setEvaluations] = useState(initialEvaluations);

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    const { text, error } = await readProfileFile(file);
    setFileError(error ?? null);
    if (text) setProfile(text);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfqId, vendorProfile: profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Evaluation failed");
      setLatest(data);
      setEvaluations((prev) => [data, ...prev]);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">RFQ</span>
          <select
            value={rfqId}
            onChange={(e) => setRfqId(e.target.value)}
            className="mt-1 block w-full rounded border border-zinc-300 bg-transparent p-2"
          >
            {rfqs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} — {r.title}
              </option>
            ))}
          </select>
        </label>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Vendor profile</span>
            <label className="cursor-pointer text-sm text-blue-600 hover:underline">
              Upload .txt / .md
              <input
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                onChange={onFileChange}
                className="hidden"
              />
            </label>
          </div>
          <textarea
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            rows={12}
            placeholder="Paste the vendor profile here, or upload a file."
            className="mt-1 block w-full rounded border border-zinc-300 bg-transparent p-2 font-mono text-sm"
          />
          {fileError && <p className="mt-1 text-sm text-red-600">{fileError}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting || !rfqId || !profile.trim()}
          className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {submitting ? "Evaluating…" : "Evaluate"}
        </button>
        {submitError && <p className="text-sm text-red-600">{submitError}</p>}
      </form>

      {latest && (
        <section className="mt-8 rounded border border-zinc-300 p-4">
          <div className="flex items-center gap-4">
            <span className={`rounded px-3 py-2 text-3xl font-bold ${scoreColor(latest.score)}`}>
              {latest.score}
              <span className="text-base font-normal">/100</span>
            </span>
            <div>
              <div className="font-semibold">{latest.vendorName}</div>
              <div className="text-sm text-zinc-500">
                {latest.rfqId} — {latest.rfqTitle}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <ReasonsAndGaps evaluation={latest} />
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Past evaluations</h2>
        {evaluations.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No evaluations yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-200 border-y border-zinc-200">
            {evaluations.map((e) => (
              <li key={e.id}>
                <details className="py-2">
                  <summary className="flex cursor-pointer items-center gap-3">
                    <span className={`w-12 rounded text-center font-semibold ${scoreColor(e.score)}`}>
                      {e.score}
                    </span>
                    <span className="flex-1">
                      <span className="font-medium">{e.vendorName}</span>
                      <span className="text-sm text-zinc-500"> · {e.rfqId}</span>
                    </span>
                    <time className="text-xs text-zinc-500" suppressHydrationWarning>
                      {new Date(e.createdAt).toLocaleString()}
                    </time>
                  </summary>
                  <div className="mt-3 pl-15">
                    <ReasonsAndGaps evaluation={e} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
