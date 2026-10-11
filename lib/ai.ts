// Claude API(Anthropic Messages API)を直接 fetch で呼び出す軽量ヘルパー。
// ANTHROPIC_API_KEY は Vercel の環境変数に既に設定済み。
// SDKは依存追加せず、既存の stripe.ts などと同じ「未設定なら機能オフ」のパターンに合わせる。

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-3-5-haiku-20241022";

export function isAiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function callClaude(params: {
  system?: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("AI機能は現在準備中です。");
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: params.maxTokens ?? 600,
      system: params.system,
      messages: [{ role: "user", content: params.prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AIリクエストに失敗しました(${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b: { type?: string }) => b?.type === "text")
    .map((b: { text?: string }) => b.text || "")
    .join("\n")
    .trim();
}

// Claudeの応答からJSON部分だけを抱き出してパースする。
// コードフェンス(```json ... ```)付きで返ってくることがあるため、
// 最初の `{` または `[` から最後の `}` / `]` までを緩く抽出する。
export function extractJson<T>(raw: string): T | null {
  const trimmed = raw.trim();
  const firstObj = trimmed.indexOf("{");
  const firstArr = trimmed.indexOf("[");
  let start = -1;
  if (firstObj === -1) start = firstArr;
  else if (firstArr === -1) start = firstObj;
  else start = Math.min(firstObj, firstArr);
  if (start === -1) return null;

  const lastObj = trimmed.lastIndexOf("}");
  const lastArr = trimmed.lastIndexOf("]");
  const end = Math.max(lastObj, lastArr);
  if (end === -1 || end < start) return null;

  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
