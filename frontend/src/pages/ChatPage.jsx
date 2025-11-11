// import React from "react";
// import { DeepChat } from "deep-chat-react";

// export default function ChatPage() {
//   const GEMINI_KEY = ""; // ⚠️ your Gemini key (unsafe in prod!)
//   const MODEL = "";

//   return (
//     <div style={{ padding: 20 }}>
//       <h1 style={{ textAlign: "center", marginBottom: 20 }}>
//         Deep Chat — Gemini 
//       </h1>

//       <DeepChat
//         style={{ height: 600, borderRadius: 12 }}
//         request={{
//           url: `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`,
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           // ✅ MUST include this so Deep Chat injects messages
//           body: { messages: "{{messages}}" }
//         }}
//         requestInterceptor={(body) => {
//           // body.messages will now exist
//           const msgs = body.messages || [];
//           if (!msgs.length) return body; // fallback

//           // Convert Deep Chat format → Gemini format
//           const contents = msgs.map((m) => ({
//             role: m.role === "user" ? "user" : "model",
//             parts: [{ text: m.content }]
//           }));

//           return { contents };
//         }}
//         responseInterceptor={(response) => {
//           // Extract Gemini reply
//           const reply =
//             response?.candidates?.[0]?.content?.parts?.[0]?.text ||
//             "No reply from Gemini";

//           // ✅ Return in Deep Chat’s expected format
//           return { messages: [{ role: "assistant", content: reply }] };
//         }}
//       />
//     </div>
//   );
// }
