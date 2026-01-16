# Frontend Implementation Report

This document details the implementation of the Volleyball Clipper frontend, including architectural decisions, design choices, and alternatives considered.

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Component Structure](#component-structure)
5. [Authentication](#authentication)
6. [State Management](#state-management)
7. [API Integration](#api-integration)
8. [Design Decisions](#design-decisions)
9. [Setup Instructions](#setup-instructions)

---

## Overview

The frontend is a Next.js 16 application that provides a user interface for:
- User authentication (signup/login)
- Video upload with progress tracking
- Job creation with natural language queries
- Real-time job status monitoring
- Clip gallery with video playback

### Pages Implemented

| Route | Description |
|-------|-------------|
| `/` | Landing page with feature overview |
| `/login` | User login page |
| `/signup` | User registration page |
| `/dashboard` | Main dashboard with stats and recent activity |
| `/upload` | Video upload page with drag-and-drop |
| `/jobs` | List of all user's jobs |
| `/jobs/new` | Create new clip job |
| `/jobs/[id]` | Job detail with clips |
| `/clips` | Gallery of all generated clips |

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.1 | React framework with App Router |
| React | 19.2.3 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Utility-first styling |
| Supabase | 2.90.1 | Auth & database |
| @supabase/ssr | 0.8.0 | Server-side auth |
| AWS SDK | 3.970.0 | R2 presigned URLs |

### Justification

**Next.js 16 with App Router**
- *Chosen*: Server components, streaming, and modern React patterns
- *Alternative*: Pages Router (more stable but less flexible)
- *Reasoning*: App Router provides better layouts, loading states, and server-side data fetching patterns

**Supabase for Auth & Database**
- *Chosen*: Integrated auth with PostgreSQL, RLS policies, and Realtime
- *Alternatives*:
  - Auth0 + separate database (more complex setup)
  - Firebase (vendor lock-in, different query paradigm)
- *Reasoning*: Supabase was already used in the backend; consistency reduces complexity

**Tailwind CSS**
- *Chosen*: Utility-first CSS for rapid development
- *Alternatives*:
  - CSS Modules (more verbose)
  - Styled Components (runtime overhead)
  - shadcn/ui (considered but adds dependency complexity)
- *Reasoning*: Fast iteration, consistent design system, no runtime cost

---

## Architecture

### Directory Structure

```
frontend/
├── app/                        # Next.js App Router pages
│   ├── api/                    # API routes
│   │   └── upload-url/         # R2 presigned URL generation
│   ├── auth/                   # Auth callback route
│   ├── clips/                  # Clips gallery page
│   ├── dashboard/              # Main dashboard
│   ├── jobs/                   # Jobs list and detail
│   │   ├── [id]/               # Job detail page
│   │   └── new/                # Create job page
│   ├── login/                  # Login page
│   ├── signup/                 # Signup page
│   ├── upload/                 # Video upload page
│   ├── layout.tsx              # Root layout with providers
│   └── page.tsx                # Landing page
├── components/
│   ├── clips/                  # Clip-related components
│   ├── dashboard/              # Dashboard components
│   ├── jobs/                   # Job-related components
│   ├── layout/                 # Layout components (Header)
│   ├── ui/                     # Reusable UI primitives
│   └── upload/                 # Upload components
├── lib/
│   ├── context/                # React contexts (auth)
│   ├── hooks/                  # Custom React hooks
│   ├── supabase/               # Supabase client setup
│   ├── types/                  # TypeScript types
│   └── api.ts                  # Backend API utilities
└── middleware.ts               # Auth middleware
```

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Components    │────▶│     Hooks       │────▶│    Supabase     │
│                 │     │ (useJobs, etc.) │     │    Client       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         │                      │                       │
         ▼                      ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   API Utils     │────▶│  Backend API    │     │   PostgreSQL    │
│ (triggerJob)    │     │  (FastAPI)      │     │   (Supabase)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Component Structure

### UI Components (`components/ui/`)

Base components built from scratch for maximum control and minimal dependencies:

| Component | Purpose | Features |
|-----------|---------|----------|
| `Button` | Action triggers | Variants, sizes, loading state |
| `Input` | Text inputs | Label, error state, accessibility |
| `Textarea` | Multi-line input | Auto-resize, error state |
| `Card` | Content containers | Header, content, footer slots |
| `Badge` | Status indicators | Color variants for different states |
| `Spinner` | Loading states | Size variants |

**Design Decision: Custom UI vs Component Library**

*Chosen*: Custom components with Tailwind
*Alternatives*:
- shadcn/ui (popular, well-designed)
- Radix UI primitives (accessibility-first)
- Headless UI (Tailwind Labs)

*Reasoning*:
1. Full control over styling and behavior
2. No external dependencies to maintain
3. Smaller bundle size
4. Components are simple enough to not need complex accessibility primitives
5. Easy to customize for specific design requirements

### Feature Components

**Dashboard Components**
- `StatsCards`: Overview metrics (videos, jobs, clips)
- `VideoList`: Recent videos with status
- `RecentJobs`: Job activity feed

**Job Components**
- `CreateJobForm`: Video selection + query input
- `JobList`: Paginated job listing
- `JobDetail`: Full job view with clips

**Clip Components**
- `ClipCard`: Video player with download
- `ClipGallery`: Grid layout of all clips

**Upload Components**
- `VideoUploader`: Drag-and-drop with XHR progress

---

## Authentication

### Implementation

Authentication uses Supabase Auth with the `@supabase/ssr` package for proper cookie handling in Next.js App Router.

**Files:**
- `lib/supabase/client.ts` - Browser client
- `lib/supabase/server.ts` - Server client
- `lib/supabase/middleware.ts` - Session refresh
- `lib/context/auth-context.tsx` - React context
- `middleware.ts` - Route protection

### Auth Flow

```
1. User visits /login or /signup
2. Credentials submitted to Supabase Auth
3. On success, session stored in cookies
4. Middleware validates session on each request
5. Protected routes redirect to /login if no session
6. Auth context provides user state to components
```

### Protected Routes

Routes prefixed with `/dashboard`, `/upload`, `/jobs`, `/clips` require authentication. The middleware handles:
- Redirecting unauthenticated users to `/login`
- Redirecting authenticated users away from `/login` and `/signup`
- Preserving the intended redirect URL

**Design Decision: Middleware vs Layout-based Protection**

*Chosen*: Middleware-based protection
*Alternatives*:
- Layout-based checks (server components)
- Higher-order components (client-side)

*Reasoning*:
1. Middleware runs before page load, preventing flash of content
2. Centralized authentication logic
3. Automatic session refresh on each request

---

## State Management

### Approach: Custom Hooks + React Context

**Design Decision: No External State Library**

*Chosen*: Custom hooks with Supabase Realtime
*Alternatives*:
- Redux Toolkit (overkill for this app)
- Zustand (simpler but another dependency)
- TanStack Query (powerful but complex)

*Reasoning*:
1. Supabase client handles caching and subscriptions
2. Data is mostly server-driven
3. Hooks provide clean, composable API
4. No learning curve for contributors

### Custom Hooks

| Hook | Purpose | Features |
|------|---------|----------|
| `useAuth` | Auth state | User, session, signOut |
| `useVideos` | Video list | CRUD, auto-refresh |
| `useVideo` | Single video | Realtime updates |
| `useJobs` | Job list | Realtime updates |
| `useJob` | Single job | With clips, realtime |
| `useClips` | All clips | Across all jobs |

### Realtime Subscriptions

Jobs and videos subscribe to Postgres changes via Supabase Realtime:

```typescript
supabase
  .channel(`job:${id}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'jobs',
    filter: `id=eq.${id}`,
  }, callback)
  .subscribe()
```

This provides live updates without polling, improving UX for long-running jobs.

---

## API Integration

### Backend Endpoints

The frontend interacts with two backend endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/webhook/index` | POST | Trigger video indexing |
| `/webhook/process-job` | POST | Trigger job processing |

### Upload Flow

1. Frontend requests presigned URL from `/api/upload-url`
2. Next.js API route generates R2 presigned PUT URL
3. Frontend uploads directly to R2 using XHR (for progress)
4. Frontend creates video record in Supabase
5. Frontend calls backend `/webhook/index` to start indexing

**Design Decision: Presigned URLs vs Proxy Upload**

*Chosen*: Direct upload to R2 with presigned URLs
*Alternatives*:
- Stream through backend (simpler but bandwidth-intensive)
- Supabase Storage (different bucket, migration needed)

*Reasoning*:
1. Direct upload reduces server load
2. Progress tracking works with XHR
3. R2 already configured for backend storage
4. Keeps credentials server-side only

---

## Design Decisions

### 1. App Router vs Pages Router

**Decision**: App Router

**Pros**:
- Server components reduce JavaScript bundle
- Streaming and Suspense support
- Better layouts and nested routing
- Future-proof (Pages Router in maintenance mode)

**Cons**:
- Newer, some edge cases
- Different mental model from Pages Router

### 2. Database Types Strategy

**Decision**: Manual TypeScript types matching Supabase schema

**Alternative**: Auto-generated types with `supabase gen types`

**Reasoning**:
- No Supabase CLI dependency in frontend
- Types can be maintained alongside schema changes
- Relationship types (JobWithVideo) easier to define manually

### 3. Styling Approach

**Decision**: Tailwind with inline classes

**Alternative**: CSS Modules, separate style files

**Reasoning**:
- Faster development with co-located styles
- Easy to understand component appearance
- Design consistency through utility classes
- Dark mode via `dark:` variants

### 4. Form Handling

**Decision**: Controlled components with useState

**Alternative**: React Hook Form, Formik

**Reasoning**:
- Forms are simple (2-4 fields)
- No complex validation needed
- Less abstraction = easier debugging
- Could upgrade to RHF later if forms grow complex

### 5. Video Player

**Decision**: Native HTML5 `<video>` element

**Alternative**: Video.js, Plyr, ReactPlayer

**Reasoning**:
- Clips are short, simple playback needs
- No DRM or adaptive streaming required
- Smaller bundle size
- Built-in controls work well

---

## Setup Instructions

### Prerequisites

- Node.js 18+ or Bun
- Supabase project
- R2 bucket configured
- Backend running

### Environment Variables

Create `.env.local` from `.env.local.example`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8080

# R2 Storage (server-side only)
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY=your-r2-access-key
R2_SECRET_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name
```

### Running Locally

```bash
cd frontend
bun install
bun dev
```

### Building for Production

```bash
bun run build
bun start
```

---

## Future Improvements

1. **Error Boundaries**: Add React error boundaries for graceful failure handling
2. **Optimistic Updates**: Update UI before server confirms for snappier feel
3. **Pagination**: Add pagination for large video/job lists
4. **Search/Filter**: Filter jobs by status, date, or query
5. **Bulk Operations**: Download multiple clips, delete multiple jobs
6. **Video Thumbnails**: Generate and display video thumbnails
7. **Progress Webhooks**: Replace polling with webhooks for job progress
8. **PWA Support**: Add service worker for offline support
9. **Analytics**: Track user engagement and feature usage
10. **Accessibility Audit**: Full WCAG compliance review

---

## File Summary

### New Files Created

```
frontend/
├── middleware.ts
├── .env.local.example
├── app/
│   ├── api/upload-url/route.ts
│   ├── auth/callback/route.ts
│   ├── clips/page.tsx
│   ├── dashboard/page.tsx
│   ├── jobs/
│   │   ├── [id]/page.tsx
│   │   ├── new/page.tsx
│   │   └── page.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── upload/page.tsx
├── components/
│   ├── clips/
│   │   ├── clip-card.tsx
│   │   └── clip-gallery.tsx
│   ├── dashboard/
│   │   ├── recent-jobs.tsx
│   │   ├── stats-cards.tsx
│   │   └── video-list.tsx
│   ├── jobs/
│   │   ├── create-job-form.tsx
│   │   ├── job-detail.tsx
│   │   └── job-list.tsx
│   ├── layout/
│   │   ├── header.tsx
│   │   └── index.ts
│   ├── ui/
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── index.ts
│   │   ├── input.tsx
│   │   └── spinner.tsx
│   └── upload/
│       └── video-uploader.tsx
└── lib/
    ├── api.ts
    ├── context/
    │   └── auth-context.tsx
    ├── hooks/
    │   ├── index.ts
    │   ├── use-clips.ts
    │   ├── use-jobs.ts
    │   └── use-videos.ts
    ├── supabase/
    │   ├── client.ts
    │   ├── middleware.ts
    │   └── server.ts
    └── types/
        └── database.ts
```

### Modified Files

```
frontend/
├── app/
│   ├── layout.tsx          # Added AuthProvider
│   └── page.tsx            # Replaced with landing page
└── package.json            # Added dependencies (via bun)
```

---

## Conclusion

The frontend implementation provides a complete user interface for the Volleyball Clipper application. Key design decisions prioritized:

1. **Simplicity**: Custom hooks and components over external libraries
2. **Performance**: Server components, direct R2 uploads, minimal JavaScript
3. **Real-time UX**: Supabase Realtime for live job status updates
4. **Type Safety**: Full TypeScript coverage with manual database types
5. **Developer Experience**: Clear structure, documented patterns

The architecture is designed to be maintainable and extensible for future features while keeping the initial implementation focused and functional.
