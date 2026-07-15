import { createLocalVerdict } from "../../shared/verdict-engine";
import type { VerdictAnalysis, VerdictResult } from "../../shared/contracts";
import { MODEL_TIMEOUT_MS, type ModelMode } from "./model-config";

interface WorkerSuccess {
  id: string;
  mode: Exclude<ModelMode, "fallback">;
  embedding: number[];
}

interface WorkerFailure {
  id: string;
  error: string;
}

export interface LocalAnalysisResult {
  analysis: VerdictAnalysis;
  verdict: VerdictResult;
  modelMode: ModelMode;
}

function analyzeWithWorker(text: string): Promise<{ mode: Exclude<ModelMode, "fallback">; embedding: number[] }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./verdict.worker.ts", import.meta.url), { type: "module" });
    const id = crypto.randomUUID();
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error("Local model timed out"));
    }, MODEL_TIMEOUT_MS);
    const finish = () => {
      window.clearTimeout(timeout);
      worker.terminate();
    };
    worker.addEventListener("message", (event: MessageEvent<WorkerSuccess | WorkerFailure>) => {
      if (event.data.id !== id) return;
      finish();
      if ("error" in event.data) reject(new Error(event.data.error));
      else resolve({ mode: event.data.mode, embedding: event.data.embedding });
    });
    worker.addEventListener("error", (event) => {
      finish();
      reject(new Error(event.message || "Local model failed"));
    });
    worker.postMessage({ id, text });
  });
}

export async function analyzeLocally(text: string): Promise<LocalAnalysisResult> {
  const modelDisabled = new URLSearchParams(window.location.search).get("model") === "off";
  const browserIsOffline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (!modelDisabled && !browserIsOffline && typeof Worker !== "undefined") {
    try {
      const { mode, embedding } = await analyzeWithWorker(text);
      return { ...createLocalVerdict(text, embedding), modelMode: mode };
    } catch {
      // A deterministic result keeps the private local flow available offline.
    }
  }
  return { ...createLocalVerdict(text), modelMode: "fallback" };
}
