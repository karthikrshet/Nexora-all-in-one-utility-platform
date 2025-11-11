// chatbot_server/server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) console.warn("GEMINI_API_KEY not set");

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages required" });

    // Collect all system messages into one instruction
    const systemTexts = messages
      .filter(m => m.role === "system" && m.content && m.content.trim())
      .map(m => m.content.trim());

    const systemInstruction = systemTexts.join("\n\n").trim(); // may be empty

    // Convert remaining messages to Gemini 'contents' format, but avoid sending system role directly.
    // Strategy: prepend the systemInstruction to the first user message's text (if exists),
    // otherwise create a user message containing the instruction.
    const nonSystem = messages.filter(m => m.role !== "system");

    const contents = [];

    if (nonSystem.length === 0) {
      // No non-system messages — send the system instruction as a user message
      if (systemInstruction.length === 0) {
        return res.status(400).json({ error: "no usable messages" });
      }
      contents.push({ role: "user", parts: [{ text: systemInstruction }] });
    } else {
      // If the first non-system message is a user message, prepend system instruction to it.
      const first = nonSystem[0];
      if (systemInstruction.length > 0) {
        // Prepend instruction to the first user message's text (or to its content regardless of role)
        const original = first.content || (first.parts && first.parts.map(p => p.text).join("\n")) || "";
        const combined = systemInstruction + "\n\n" + original;
        contents.push({ role: "user", parts: [{ text: combined }] });
        // push the rest (skip the original first)
        for (let i = 1; i < nonSystem.length; i++) {
          const m = nonSystem[i];
          contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] });
        }
      } else {
        // No system instruction — convert messages straightforwardly
        for (const m of nonSystem) {
          contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] });
        }
      }
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
    console.log("REQUEST ->", endpoint);
    console.log("REQUEST BODY ->", JSON.stringify({ contents }, null, 2));

    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    const data = await r.json();
    console.log("RESPONSE <-", JSON.stringify(data, null, 2));

    // Try common spots for text
    const candidateText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.text ||
      data?.candidates?.[0]?.text ||
      data?.output?.[0]?.content?.text ||
      data?.result?.output?.[0]?.content?.parts?.[0]?.text ||
      null;

    if (candidateText) {
      return res.json({ choices: [{ message: { role: "assistant", content: candidateText } }], raw: data });
    }

    // If there's an error in response, return it
    if (data?.error) return res.status(200).json({ debug: true, error: data.error, raw: data });

    // Fallback: return raw response for inspection
    return res.status(200).json({ debug: true, message: "No textual candidate found; see raw", raw: data });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: "server error", details: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Gemini proxy server running on ${PORT}`));
