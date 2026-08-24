type TranslationInput = {
  subject: string;
  html: string;
  text: string;
};

type TranslationOutput = TranslationInput;

function stripCodeFence(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function translateEmailToEnglish(input: TranslationInput): Promise<TranslationOutput> {
  const lovableKey = process.env.LOVABLE_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();

  const endpoint = lovableKey
    ? "https://ai.gateway.lovable.dev/v1/chat/completions"
    : openAiKey
      ? "https://api.openai.com/v1/chat/completions"
      : null;
  const apiKey = lovableKey || openAiKey;
  const model = lovableKey
    ? process.env.LOVABLE_TRANSLATION_MODEL?.trim() || "google/gemini-2.5-flash"
    : process.env.OPENAI_TRANSLATION_MODEL?.trim() || "gpt-4o-mini";

  if (!endpoint || !apiKey) {
    throw new Error("No translation provider is configured. Set LOVABLE_API_KEY or OPENAI_API_KEY.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Translate transactional emails from German to natural, discreet English. Preserve all HTML tags, attributes, URLs, email addresses, amounts, dates, names, brand names and line breaks exactly. Translate only human-readable German text. Never add explanations or markdown. Return valid JSON only with the keys subject, html and text.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Translation provider failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const json = await response.json() as any;
  const raw = json?.choices?.[0]?.message?.content;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Translation provider returned no content.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    throw new Error("Translation provider returned invalid JSON.");
  }

  if (
    typeof parsed?.subject !== "string" ||
    typeof parsed?.html !== "string" ||
    typeof parsed?.text !== "string"
  ) {
    throw new Error("Translation provider returned an incomplete translation.");
  }

  return {
    subject: parsed.subject,
    html: parsed.html,
    text: parsed.text,
  };
}
