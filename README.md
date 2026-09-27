# NEXORA — Full-Stack Agentic AI App Generator

> **NEXORA** is a full-stack, production-ready AI application generator built with Next.js 16, React 19, TypeScript, Tailwind CSS, Supabase, Clerk, and Sandpack. Users enter natural-language prompts to generate complete, interactive React web applications with real-time browser preview, instant code editing, multi-provider AI support, and automated error fixing.

---

## 🚀 Key Features

- 🤖 **Multi-Provider AI Engine**: Switch seamlessly between **Google Gemini**, **Groq**, and **OpenRouter** via a clean `AI_PROVIDER` server-side abstraction.
- ⚡ **Real-Time Live Preview**: Instant execution of generated React components inside an interactive Sandpack sandbox.
- 🛠️ **Fix with AI & Improve with AI**: Automated runtime/compile error detection and file-by-file agentic improvements powered by `@cline/sdk`.
- 📁 **Complete Project Structure**: Generates modular file trees (`/App.js`, subcomponents, utilities) and validates npm packages against the official npm registry.
- 🔒 **Enterprise-Grade Security**: Shielded by **Arcjet** for rate-limiting, bot detection, and prompt injection defense.
- 🔐 **Authentication & Credit System**: Managed via **Clerk** with automatic user syncing, plan-based credit limits, and credit deduction safeguards.
- 💾 **Database & Storage**: Persistent workspace sessions stored in **Supabase PostgreSQL** via **Prisma ORM**, with image attachment support via Supabase Storage.
- 📦 **One-Click Export**: Download complete, ready-to-run React projects as `.zip` archives.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Frontend** | React 19, TypeScript, Tailwind CSS, Lucide React, Sonner |
| **AI Providers** | Google Gemini (`@google/genai`), Groq API, OpenRouter API |
| **Agentic AI** | `@cline/sdk` Agent (Improve with AI) |
| **Validation & Repair** | Zod, `jsonrepair` |
| **Sandbox Preview** | Sandpack (`@codesandbox/sandpack-react`) |
| **Database & ORM** | Supabase PostgreSQL, Prisma ORM |
| **Authentication** | Clerk Auth (`@clerk/nextjs`) |
| **Security & Limits** | Arcjet (`@arcjet/next`) |
| **Storage** | Supabase Storage (workspace images) |

---

## 🧠 AI Provider Abstraction Architecture

NEXORA supports dynamic server-side AI provider switching. Select your active provider using the `AI_PROVIDER` environment variable:

```
                  POST /api/gen-ai-code
                            │
                            ▼
              Clerk Auth & Arcjet Guard
                            │
                            ▼
                     getAIProvider() 
     (Selected by AI_PROVIDER env: gemini | groq | openrouter)
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
 GeminiProvider       GroqProvider      OpenRouterProvider
(gemini-3.5-flash) (openai/gpt-oss-120b)(cohere/north-mini-code:free)
       │                    │                    │
       └────────────────────┼────────────────────┘
                            ▼
       parseAndValidateAIResponse() (jsonrepair + Zod)
                            │
                            ▼
             Validated Project Files & Dependencies
                            │
                            ▼
             Prisma Transaction + Credit Deduction
                            │
                            ▼
             SSE Stream ──► Sandpack Live Preview
```

---

## 📋 Getting Started

### Prerequisites

- **Node.js**: v20.x or v22.x+
- **Database**: Supabase PostgreSQL database
- **Auth**: Clerk application account
- **AI Keys**: Google Gemini API key, Groq API key, or OpenRouter API key

### Installation

1. **Clone the Repository**:
   ```bash
   git clone WRITE THIS REPO url
   cd ai-app-builder
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Fill in your API keys in `.env`:
   ```env
   # AI Provider Selection (gemini | groq | openrouter)
   AI_PROVIDER=gemini

   # AI Provider API Keys
   GEMINI_API_KEY=your_gemini_api_key
   GROQ_API_KEY=your_groq_api_key
   GROQ_MODEL=openai/gpt-oss-120b
   OPENROUTER_API_KEY=your_openrouter_api_key
   OPENROUTER_MODEL=cohere/north-mini-code:free

   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

   # Supabase & Database Connections
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   DATABASE_URL=postgresql://user:password@host:5432/dbname?pgbouncer=true
   DIRECT_URL=postgresql://user:password@host:5432/dbname

   # Arcjet Security
   ARCJET_KEY=your_arcjet_key
   ```

4. **Initialize Database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Building & Testing

- **Lint Code**:
  ```bash
  npm run lint
  ```
- **Production Build**:
  ```bash
  npm run build
  ```
- **Start Production Server**:
  ```bash
  npm run start
  ```

---

## 📂 Project Structure

```
├── app/
│   ├── api/
│   │   ├── gen-ai-code/    # Core AI code generation route (SSE stream)
│   │   └── improve/        # Agentic app improvement route (Cline SDK)
│   ├── projects/           # Saved workspaces project page
│   ├── workspace/          # Main split-panel IDE workspace
│   └── page.tsx            # Landing page & prompt interface
├── components/
│   ├── ChatPanel.tsx       # Interactive AI chat interface
│   ├── CodePanel.tsx       # Sandpack preview, code editor & export
│   └── WorkspaceClient.tsx # Client state orchestrator & stream handler
├── lib/
│   ├── ai/                 # Multi-provider AI abstraction layer
│   │   ├── gemini.ts       # Gemini provider implementation
│   │   ├── groq.ts         # Groq provider implementation
│   │   ├── openrouter.ts   # OpenRouter provider implementation
│   │   └── index.ts        # AI provider router factory
│   ├── ai-parser.ts        # JSON repair & Zod validation layer
│   ├── arcjet.ts           # Security & rate limiting rules
│   ├── env.ts              # Provider-aware environment validation
│   └── prisma.ts           # Prisma database client
├── prisma/
│   └── schema.prisma       # Database schema (User, Workspace)
└── types/
    └── workspace.ts        # Workspace data & state TypeScript definitions
```

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
