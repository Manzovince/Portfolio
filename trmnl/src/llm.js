//========================
// Local LLM — WebLLM over WebGPU
//========================
//
// The model runs inside this browser: no API key, and nothing typed on the
// board ever leaves the machine. The cost is a one-off download of the
// weights (~2.5 GB), which the browser then keeps in its cache — so the wait
// happens once per model per browser profile, not once per task.
//
// Everything here is loaded lazily. The library is only fetched the first
// time a plan is actually requested, so opening the start page stays as
// cheap as it was.

const CDN = 'https://esm.run/@mlc-ai/web-llm';

// Qwen2.5 1.5B, measured on this machine's integrated Intel GPU:
//
//                    first load    per plan    VRAM
//   Qwen2.5-1.5B       102 s         6.5 s     1630 MB
//   Qwen2.5-3B         193 s        ~15 s      2505 MB
//
// The 3B writes slightly better themes, but at this speed the difference is
// not worth doubling the wait and the download on integrated graphics. On a
// discrete GPU the 3B is the better default — swap the ids below.
// Qwen rather than Llama 3.2 because it holds non-English output far better,
// which matters when the board is used in French.
//
// f16 and f32 are the same weights; f32 is the fallback for GPUs that do not
// report the `shader-f16` feature.
const MODEL_F16 = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'; // ~1630 MB of VRAM
const MODEL_F32 = 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC'; // ~1889 MB of VRAM

/** WebGPU is the hard requirement — Firefox and older Safari do not have it. */
export function isSupported() {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

async function pickModel() {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error('No GPU available for WebLLM.');
    }
    return adapter.features.has('shader-f16') ? MODEL_F16 : MODEL_F32;
}

let enginePromise = null;

/**
 * Build the engine once and reuse it. A failed load clears the cache so the
 * next attempt can retry rather than replaying the same rejection forever.
 */
function getEngine(onProgress) {
    if (!enginePromise) {
        enginePromise = (async () => {
            const webllm = await import(/* @vite-ignore */ CDN);
            const model = await pickModel();
            return webllm.CreateMLCEngine(model, {
                initProgressCallback: ({ progress, text }) => onProgress?.(progress, text),
            });
        })().catch((err) => {
            enginePromise = null;
            throw err;
        });
    }
    return enginePromise;
}

/** True once the weights are in memory, so callers can skip the loading copy. */
export function isReady() {
    return enginePromise !== null;
}

/**
 * Run one prompt to completion.
 * @param {string} prompt
 * @param {(progress: number, text: string) => void} [onProgress] download progress, 0 to 1
 */
export async function complete(prompt, onProgress) {
    if (!isSupported()) {
        throw new Error('This browser has no WebGPU — try Chrome, Edge, or Safari 18.');
    }

    const engine = await getEngine(onProgress);
    const reply = await engine.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        // Low but not zero: the plan should vary between runs without the
        // model wandering off the requested format.
        temperature: 0.4,
        // Only a handful of short themes come back, and every extra token is
        // ~0.3 s on integrated graphics — so this is a ceiling, not a target.
        max_tokens: 200,
    });

    return (reply.choices?.[0]?.message?.content ?? '').trim();
}
