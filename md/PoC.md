# Rapid Backend Proof of Concept (PoC)

## Objective
To validate that **Twelve Labs** can accurately find specific volleyball actions and that **Google Cloud Run** can download, slice, and re-upload clips efficiently without building a frontend or database yet.

## Prerequisites
1.  **Twelve Labs API Key** (Sign up at dashboard.twelvelabs.io).
2.  **Cloudflare R2 Bucket** (Create bucket `vball-poc`, generate Access Key & Secret).
3.  **Google Cloud Account** (Project created, Billing enabled - required for Cloud Run even if free tier).
4.  **Raw Video File** (Manually upload one `test_game.mp4` to your R2 bucket for testing).

---

## 1. The Directory Structure
```text
/backend-poc
├── main.py            # The FastAPI application
├── requirements.txt   # Python dependencies
├── Dockerfile         # Instructions to build the container
└── .env               # API Keys (Local testing only)