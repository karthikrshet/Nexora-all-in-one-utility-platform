## 🧩 Overview  

**Nexora** is a multi-utility productivity portal that bundles several useful web tools into one seamless interface — complete with real-time usage tracking and AI integration.  

The goal is to create a unified workspace where users can **convert, generate, track, and chat with AI — all in one place**.

---

## ✨ Features  

- 🔐 **User Authentication** — Secure login & registration using JWT  
- 💬 **AI Assistant** — Powered by OpenAI API  
- ⏱️ **Real-Time Tracking** — Monitor usage across tools live  
- 🧠 **Multiple Utilities** — QR Generator, Notes, To-Do, Converters, Password Generator, etc.  
- 📊 **Analytics Dashboard** — Visualize real-time app usage  
- 💻 **Responsive UI** — Optimized for all screen sizes  
- ⚙️ **Modular Architecture** — Add new utilities with minimal setup  

---

## 🛠️ Tech Stack  

| Layer | Technology |
|:------|:------------|
| **Frontend** | React, Tailwind CSS, Vite |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Mongoose) |
| **AI Integration** | OpenAI API |
| **Real-Time** | Socket.IO |
| **Auth** | JSON Web Tokens (JWT) |
| **Deployment** | Docker / Render / Vercel |

---

## 📁 Folder Structure  

```

Nexora/
│
├── frontend/           # React + Tailwind client
│   ├── src/
│   └── package.json
│
├── backend/            # Node.js + Express API
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   └── server.js
│
├── chatbot_server/     # AI assistant service
│   ├── app.js
│   └── routes/
│
├── .env.example
└── README.md

````

---

## ⚙️ Installation  

### 1️⃣ Clone the Repository  
```bash
git clone https://github.com/karthikrshet/Nexora-A-Multi-Utility-Web-Portal-with-Real-Time-Usage-Tracking-and-AI-Integration.git
cd Nexora-A-Multi-Utility-Web-Portal-with-Real-Time-Usage-Tracking-and-AI-Integration
````

### 2️⃣ Install Dependencies

#### Backend

```bash
cd backend
npm install
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

#### Chatbot Server

```bash
cd chatbot_server
npm install
npm run dev
```

### 3️⃣ Open

Visit 👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Environment Variables

### `backend/.env`

```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/nexora
JWT_SECRET=<your_jwt_secret>
FRONTEND_URL=http://localhost:3000
```

### `frontend/.env`

```
VITE_API_URL=http://localhost:5000
VITE_CHATBOT_URL=http://localhost:9000
```

### `chatbot_server/.env`

```
PORT=9000
OPENAI_API_KEY=<your_openai_api_key>
MODEL=gpt-4-turbo
```

---

## 🧠 Architecture

```
[Frontend: React + Tailwind]
        │
        ▼
[Backend: Node + Express] ⇄ [MongoDB]
        │
        ▼
[Chatbot Server: OpenAI API Integration]
```

---

## 🧪 Debugging Tips

* 🧩 **Check .env Files** → Most startup issues are caused by missing variables.
* 🔥 **Backend Not Starting?** → Ensure MongoDB URI & port are correct.
* 💡 **CORS Issues?** → Match `FRONTEND_URL` with your actual frontend domain.
* 🤖 **AI Not Responding?** → Validate `OPENAI_API_KEY` and internet access.

---

## 🤝 Contributing

Contributions are always welcome!

1. Fork this repo
2. Create a new branch → `git checkout -b feature/your-feature`
3. Commit changes → `git commit -m "Add feature: your-feature"`
4. Push → `git push origin feature/your-feature`
5. Open a Pull Request 🎉

---

## 🪪 License

This project is licensed under the **Apache License 2.0** — see the [LICENSE](LICENSE) file.

---

## 👨‍💻 Author

**Karthik R Shet**
🌐 [GitHub](https://github.com/karthikrshet) · 🎥 [YouTube](https://youtube.com/@Karthik_Shet)

---

## ⭐ Support

If you like this project, please give it a **⭐ star** on GitHub — it motivates me to build more awesome projects!

<p align="center">
  <a href="https://github.com/karthikrshet/Nexora-A-Multi-Utility-Web-Portal-with-Real-Time-Usage-Tracking-and-AI-Integration">
    <img src="https://img.shields.io/github/stars/karthikrshet/Nexora-A-Multi-Utility-Web-Portal-with-Real-Time-Usage-Tracking-and-AI-Integration?style=social" alt="GitHub Stars">
  </a>
</p>
```

---
