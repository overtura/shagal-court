import { MODEL_ID, MODEL_REVISION, type ModelMode } from "./model-config";

interface AnalyzeMessage {
  id: string;
  text: string;
}

interface WorkerResponse {
  id: string;
  mode: Exclude<ModelMode, "fallback">;
  embedding: number[];
}

interface FeatureTensor {
  tolist(): unknown;
}

type FeatureExtractor = (text: string, options: { pooling: "mean"; normalize: true }) => Promise<FeatureTensor>;

const extractors = new Map<"webgpu" | "wasm", FeatureExtractor>();

async function loadExtractor(mode: "webgpu" | "wasm"): Promise<FeatureExtractor> {
  const cached = extractors.get(mode);
  if (cached) return cached;
  const { pipeline } = await import("@huggingface/transformers");
  const created = await pipeline("feature-extraction", MODEL_ID, {
    device: mode,
    revision: MODEL_REVISION,
    dtype: mode === "webgpu" ? "fp16" : "q8",
  });
  const extractor = created as unknown as FeatureExtractor;
  extractors.set(mode, extractor);
  return extractor;
}

function flattenEmbedding(value: unknown): number[] {
  if (!Array.isArray(value)) throw new Error("The local model returned an unsupported tensor");
  const first = Array.isArray(value[0]) ? value[0] : value;
  if (!Array.isArray(first)) throw new Error("The local model returned an empty tensor");
  return first.filter((item): item is number => typeof item === "number" && Number.isFinite(item)).slice(0, 384);
}

async function embed(text: string): Promise<{ mode: "webgpu" | "wasm"; embedding: number[] }> {
  const modes: Array<"webgpu" | "wasm"> = ["webgpu", "wasm"];
  let latestError: unknown;
  for (const mode of modes) {
    try {
      const extractor = await loadExtractor(mode);
      const tensor = await extractor(text, { pooling: "mean", normalize: true });
      const embedding = flattenEmbedding(tensor.tolist());
      if (embedding.length > 0) return { mode, embedding };
    } catch (error) {
      latestError = error;
    }
  }
  throw latestError instanceof Error ? latestError : new Error("Local model unavailable");
}

globalThis.addEventListener("message", (event: MessageEvent<AnalyzeMessage>) => {
  const { id, text } = event.data;
  void embed(text)
    .then(({ mode, embedding }) => globalThis.postMessage({ id, mode, embedding } satisfies WorkerResponse))
    .catch((error: unknown) => globalThis.postMessage({ id, error: error instanceof Error ? error.message : "Local model unavailable" }));
});
