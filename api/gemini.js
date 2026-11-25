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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: systemInstruction || {
            parts: [{ text: "Bạn là trợ lý học tập môn Toán THPT Việt Nam." }]
          },
          contents: finalContents
        })
      }
    );

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Lỗi máy chủ trung gian", details: err.message });
  }
}
