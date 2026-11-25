const MODELS = ["gemini-3.6-flash", "gemini-3.8-flash"];

async function callGeminiWithRetry(model, apiKey, payload, retries = 2) {
  let lastData = null;
  let lastStatus = 500;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    lastStatus = response.status;
    lastData = await response.json();

    if (response.ok) {
      return { ok: true, status: response.status, data: lastData };
    }

    const isHighDemand =
      response.status === 429 ||
      response.status === 503 ||
      /high demand|overloaded|unavailable/i.test(JSON.stringify(lastData));

    if (!isHighDemand || attempt === retries) {
      return { ok: false, status: lastStatus, data: lastData };
    }

    await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
  }

  return { ok: false, status: lastStatus, data: lastData };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Chỉ hỗ trợ phương thức POST" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Chưa cấu hình GEMINI_API_KEY trên server" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { prompt, systemInstruction, contents } = body;

    const finalContents = Array.isArray(contents)
      ? contents
      : [{ role: "user", parts: [{ text: String(prompt || "") }] }];

    const payload = {
      systemInstruction: systemInstruction || {
        parts: [{ text: "Bạn là trợ lý học tập môn Toán THPT Việt Nam." }]
      },
      contents: finalContents
    };

    let result = null;
    for (const model of MODELS) {
      result = await callGeminiWithRetry(model, apiKey, payload, 1);
      if (result.ok) {
        return res.status(200).json(result.data);
      }
    }

    return res.status(result?.status || 503).json(
      result?.data || { error: "Hệ thống AI đang quá tải, vui lòng thử lại sau." }
    );
  } catch (err) {
    return res.status(500).json({ error: "Lỗi máy chủ trung gian", details: err.message });
  }
}
