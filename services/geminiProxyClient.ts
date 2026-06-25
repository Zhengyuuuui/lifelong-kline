import { GoogleGenAI as OriginalGoogleGenAI } from "@google/genai";
import { apiFetch, hasAuthTokens } from "./apiBase";

const shouldUseSecureAiEndpoint = () =>
  import.meta.env.VITE_ENABLE_LEGACY_AI_PROXY !== "true";

const responseFormatFor = (config?: any): "json" | "text" => {
  const mime = String(config?.responseMimeType || "").toLowerCase();
  return mime.includes("json") || config?.responseSchema ? "json" : "text";
};

const productionGenerateContent = async (params: { model: string; contents: any; config?: any }) => {
  if (!hasAuthTokens()) {
    const error = new Error("Authentication required");
    (error as any).status = 401;
    (error as any).code = "AUTH_REQUIRED";
    throw error;
  }

  const res = await apiFetch("/api/ai/generate", {
    method: "POST",
    body: JSON.stringify({
      feature: "chat",
      locale: "zh-CN",
      responseFormat: responseFormatFor(params.config),
      input: {
        source: "gemini_proxy",
        requestedModel: params.model,
        contents: params.contents,
        config: params.config || {},
      },
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const error = new Error(errData.error?.message || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).code = errData.error?.code || res.status;
    (error as any).error = errData.error;
    throw error;
  }

  const payload = await res.json();
  const generation = payload.generation || {};
  const result = generation.result || {};
  const text = typeof result.text === "string"
    ? result.text
    : typeof generation.text === "string"
      ? generation.text
      : JSON.stringify(result);
  return {
    text,
    ...result,
    _backendGeneration: generation,
  };
};

export class GoogleGenAI {
  constructor(config?: { apiKey?: string }) {
    // API Key is managed securely on the server side to protect user secrets.
  }

  get chats() {
    return {
      create: () => {
        throw new Error("Chat history is managed on client state. Use models.generateContent instead.");
      }
    };
  }

  get models() {
    return {
      generateContent: async (params: { model: string; contents: any; config?: any }) => {
        if (shouldUseSecureAiEndpoint()) {
          return await productionGenerateContent(params);
        }

        const res = await apiFetch("/api/gemini/generateContent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const error = new Error(errData.error?.message || `HTTP ${res.status}`);
          (error as any).status = res.status;
          (error as any).code = errData.error?.code || res.status;
          (error as any).error = errData.error;
          throw error;
        }

        return await res.json();
      },

      generateContentStream: async function* (params: { model: string; contents: any; config?: any }) {
        if (shouldUseSecureAiEndpoint()) {
          const response = await productionGenerateContent(params);
          yield { text: response.text };
          return;
        }

        const res = await apiFetch("/api/gemini/generateContentStream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const cleanLine = line.trim();
              if (cleanLine.startsWith("data: ")) {
                const rawJson = cleanLine.slice(6);
                if (rawJson === "[DONE]") return;
                try {
                  const chunk = JSON.parse(rawJson);
                  if (chunk.error) {
                    throw new Error(chunk.error);
                  }
                  yield chunk;
                } catch (e) {
                  // Ignore malformed partial stream lines; complete server errors are surfaced above.
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    };
  }
}

// Re-export Type, Schema and standard TS interfaces
export { Type } from "@google/genai";
export type { Schema, GenerateContentResponse } from "@google/genai";
