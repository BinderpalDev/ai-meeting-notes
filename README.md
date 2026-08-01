# Summarix — AI Meeting Notes & Action Item Platform

**Summarix** is a privacy-first, intelligent web application designed for recording meetings, transcribing multilingual audio (English, Hindi, Hinglish), automatically generating structured summaries and action items, and interacting with meeting context using both cloud AI models (Google Gemini) and local AI LLMs (Ollama + ONNX Runtime Web).

---

## 🚀 Key Features (A-Z)

### 🎙️ 1. Audio Recording & Waveform Playback
- **Live Recording**: High-quality in-browser microphone capture with visualizer waveform and duration tracking.
- **File Upload**: Upload existing audio files (`.webm`, `.mp3`, `.wav`, `.m4a`).
- **Interactive Player**: Smooth audio playback powered by `WaveSurfer.js`.

### 🌐 2. Multilingual AI Transcription & Diarization
- **Multilingual Support**: High-accuracy transcription for English, Hindi, and Hinglish (mixed English-Hindi speech).
- **Speaker Diarization**: Detects and labels different speakers (`Speaker 1:`, `Speaker 2:`).
- **Structured Outputs**: Generates full verbatim transcriptions, executive summaries, key topics, and action item lists.
- **Google Gemini Integration**: Uses `gemini-2.0-flash` for cloud-based transcription.
- **Offline Mock AI**: Built-in mock mode (`VITE_MOCK_AI=true`) for testing without API keys or during offline development.

### 🧠 3. In-Browser ML Classifier (ONNX Runtime Web)
- **Local AI Inference**: Uses a custom trained ONNX model (`model.onnx` + `vocab.txt`) running directly inside the browser using `@onnxruntime-web`.
- **Private Action Item Extraction**: Classifies and extracts action items without sending text to external servers.

### 🦙 4. Local LLM Integration (Ollama)
- **Ollama Status Checker**: Real-time detection of local Ollama server status at `http://localhost:11434`.
- **Model Support**: Chat with models like `llama3.2:1b`, `llama3.2`, `mistral`, `gemma`, etc.
- **Local Context Q&A**: Ask questions and query meeting transcripts locally for enhanced privacy.

### 🔐 5. Hybrid Authentication & Database Storage (Supabase + Local Storage)
- **Cloud Backend**: Full Supabase Auth (email/password) and Postgres tables (`recordings`, `notes`, `audio-recordings` storage bucket).
- **Resilient Fallback**: Automatically switches to `LocalStorage` for session state and data storage if Supabase credentials are not provided or network is offline.

### 📝 6. Quick Notes & Workspace Dashboard
- **Notes Scratchpad**: Create, edit, and organize meeting notes.
- **Dashboard Search & Filter**: Filter meeting history, search across transcripts, and toggle dark/light themes.

---

## 🛠️ Technology Stack

- **Frontend Core**: React 18, Vite 8, React Router v6
- **Styling & UI**: Tailwind CSS, PostCSS, Lucide React Icons
- **Audio Processing**: WaveSurfer.js, Web Audio API
- **AI & ML**: `@google/generative-ai`, `onnxruntime-web`, Ollama API API
- **Database & Auth**: `@supabase/supabase-js`, LocalStorage fallback

---

## 📁 Project Structure

```
ai-meeting-notes/
├── public/
│   └── models/
│       └── action-item-classifier/   # Trained ONNX model & vocab.txt
├── src/
│   ├── components/
│   │   ├── ActionItems.jsx           # Action items list component
│   │   ├── AIOutput.jsx              # Summary & transcription viewer
│   │   ├── AudioPlayer.jsx           # WaveSurfer player
│   │   ├── Chatbot.jsx               # Gemini Q&A chatbot
│   │   ├── OllamaChatbot.jsx         # Local Ollama Q&A chatbot
│   │   ├── OllamaStatus.jsx          # Ollama server connection indicator
│   │   ├── Recorder.jsx              # Audio recording interface
│   │   └── RecordingModal.jsx        # Recording details modal
│   ├── contexts/
│   │   └── AuthContext.jsx           # Hybrid Auth provider
│   ├── pages/
│   │   ├── Auth.jsx                  # Login / Signup page
│   │   └── Dashboard.jsx             # Main dashboard view
│   ├── services/
│   │   ├── databaseService.js        # Supabase + LocalStorage DB wrapper
│   │   ├── geminiService.js          # Google Gemini AI API wrapper
│   │   ├── groqService.js            # Groq SDK wrapper
│   │   ├── mlActionItemService.js    # ONNX Web local ML extractor
│   │   ├── ollamaService.js          # Local Ollama API wrapper
│   │   └── speechService.js          # Browser Web Speech API
│   ├── App.jsx                       # Routes & PrivateRoute logic
│   ├── main.jsx                      # Entry point
│   ├── index.css                     # Tailwind & global styles
│   └── supabaseClient.js             # Supabase client initializer
├── .env                              # Environment configuration
├── package.json                      # NPM dependencies & scripts
├── tailwind.config.js                # Tailwind configuration
└── vite.config.js                    # Vite bundler configuration
```

---

## ⚙️ Environment Configuration (`.env`)

Create or update the `.env` file in the root directory:

```env
# Optional: Supabase Credentials (If omitted, app runs in local offline storage mode)
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Gemini API Key (For cloud transcription & chat)
VITE_GEMINI_API_KEY=your-gemini-api-key

# Set to true to use mock AI transcription without calling Gemini API
VITE_MOCK_AI=true
```

---

## 🏁 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. (Optional) Run Local Ollama Server
If you want to use local LLM chat, ensure [Ollama](https://ollama.ai/) is installed and running:
```bash
ollama run llama3.2:1b
```

### 4. Build for Production
```bash
npm run build
```

---

## 📄 License

This project is open-source and built for intelligent meeting productivity.
