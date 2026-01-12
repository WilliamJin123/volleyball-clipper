volleyball-clipper/
├── frontend/                  # Next.js App (UI, Auth, DB logic, Payments)
│   ├── app/                   # App Router pages
│   ├── components/            # UI Components (Buttons, Forms)
│   ├── lib/                   # The "Glue" code
│   │   ├── supabase.ts        # Supabase Client connection
│   │   ├── twelvelabs.ts      # (Optional) Direct API calls if needed
│   │   └── r2.ts              # Cloudflare R2 Upload logic
│   ├── .env.local             # Keys: NEXT_PUBLIC_SUPABASE_URL, etc.
│   ├── bun.lockb              # Bun lockfile
│   └── package.json
│
├── backend/                   # The "Heavy Lifting" (Cloud Run Worker)
│   └── video-clipping/
│       ├── main.py            # FastAPI entry point
│       ├── services/
│       │   ├── slicer.py      # FFmpeg logic
│       │   └── indexer.py     # Twelve Labs logic
│       ├── Dockerfile         # Instructions for Google Cloud Run
│       ├── requirements.txt   # Python deps
│       └── .env               # Keys: TWELVE_LABS_API_KEY, R2_KEYS
│
├── supabase/                  # Supabase Configuration (Optional but recommended)
│   ├── migrations/            # SQL files to set up your tables
│   └── config.toml            # Local dev config
│
└── README.md