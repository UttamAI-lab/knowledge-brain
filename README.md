# 🧠 Knowledge Brain

An industry-ready RAG (Retrieval-Augmented Generation) chatbot 
that lets employees ask questions about company documents.

## ✨ Features

- 📄 PDF & DOCX document upload
- 🔍 Hybrid Search (BM25 + Embedding + Re-ranking)
- 💬 Streaming chat with citations
- 🔐 JWT Authentication + Role-based access
- 📊 Admin Dashboard
- ✅ RAG Evaluation System
- 🧠 Conversation Memory

## 🛠️ Tech Stack

**Backend:** FastAPI, LangChain, ChromaDB, PostgreSQL  
**Frontend:** Next.js 16, Tailwind CSS  
**LLM:** Groq (Llama 3.3)  
**Embeddings:** BAAI/bge-small-en-v1.5  

## 🚀 Quick Start

### Backend
```bash
cd backend
uv sync
cp ../.env.example ../.env
# .env এ তোমার credentials দাও
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## 📁 Project Structure
knowledge-brain/
├── backend/
│   ├── api/          # FastAPI routes
│   ├── rag/          # RAG pipeline
│   ├── embeddings/   # HuggingFace embeddings
│   ├── loaders/      # Document loaders
│   ├── database/     # PostgreSQL models
│   ├── auth/         # JWT authentication
│   └── evaluation/   # RAG evaluation
└── frontend/
└── src/
├── app/      # Next.js pages
├── components/
├── hooks/
└── lib/

## 👥 User Roles

| Role | Upload | Chat | Admin |
|------|--------|------|-------|
| Admin | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ❌ |
| Employee | ❌ | ✅ | ❌ |

## 📊 Evaluation Scores

| Metric | Score |
|--------|-------|
| Faithfulness | 0.90 |
| Answer Relevancy | 0.95 |
| Completeness | 0.925 |