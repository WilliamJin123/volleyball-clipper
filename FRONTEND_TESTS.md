# Frontend Testing Plan

This document outlines a comprehensive testing strategy for the Volleyball Clipper frontend, progressing from simple unit tests to complex integration and end-to-end tests.

## Table of Contents

1. [Testing Stack](#testing-stack)
2. [Test Categories](#test-categories)
3. [Phase 1: Unit Tests](#phase-1-unit-tests)
4. [Phase 2: Component Integration Tests](#phase-2-component-integration-tests)
5. [Phase 3: API Integration Tests](#phase-3-api-integration-tests)
6. [Phase 4: End-to-End Tests](#phase-4-end-to-end-tests)
7. [Test Infrastructure](#test-infrastructure)
8. [CI/CD Integration](#cicd-integration)

---

## Testing Stack

### Recommended Tools

| Tool | Purpose | Why |
|------|---------|-----|
| **Vitest** | Unit & integration tests | Fast, ESM-native, Jest-compatible API |
| **React Testing Library** | Component testing | Tests behavior, not implementation |
| **MSW (Mock Service Worker)** | API mocking | Intercepts network requests at service worker level |
| **Playwright** | E2E testing | Cross-browser, reliable, great DX |
| **@testing-library/user-event** | User interaction simulation | Realistic event firing |

### Installation

```bash
cd frontend

# Unit & Integration Testing
bun add -d vitest @vitejs/plugin-react jsdom
bun add -d @testing-library/react @testing-library/jest-dom @testing-library/user-event
bun add -d msw

# E2E Testing
bun add -d @playwright/test
bunx playwright install
```

### Configuration Files

**vitest.config.ts**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

**tests/setup.ts**
```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:8080')
```

---

## Test Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                        E2E Tests (Playwright)                    │
│    Full user flows: signup → upload → job → view clips          │
├─────────────────────────────────────────────────────────────────┤
│                   API Integration Tests                          │
│    Real Supabase/Backend calls with test accounts               │
├─────────────────────────────────────────────────────────────────┤
│                 Component Integration Tests                      │
│    Multiple components together, mocked APIs (MSW)              │
├─────────────────────────────────────────────────────────────────┤
│                        Unit Tests                                │
│    Individual functions, hooks, components in isolation          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Unit Tests

Unit tests verify individual pieces in isolation with all dependencies mocked.

### 1.1 UI Components (`components/ui/`)

**File: `components/ui/__tests__/button.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button'

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('applies variant styles', () => {
    render(<Button variant="danger">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-red-600')
  })

  it('applies size styles', () => {
    render(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3')
  })

  it('shows loading spinner when loading', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument()
  })

  it('calls onClick handler', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(<Button onClick={handleClick}>Click</Button>)
    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(<Button onClick={handleClick} disabled>Click</Button>)
    await user.click(screen.getByRole('button'))

    expect(handleClick).not.toHaveBeenCalled()
  })
})
```

**File: `components/ui/__tests__/input.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '../input'

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<Input label="Email" error="Invalid email" />)
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveClass('border-red-500')
  })

  it('handles value changes', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<Input label="Name" onChange={handleChange} />)
    await user.type(screen.getByLabelText('Name'), 'John')

    expect(handleChange).toHaveBeenCalled()
  })

  it('generates id from label', () => {
    render(<Input label="First Name" />)
    expect(screen.getByLabelText('First Name')).toHaveAttribute('id', 'first-name')
  })
})
```

**File: `components/ui/__tests__/badge.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, StatusBadge } from '../badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it.each([
    ['success', 'bg-green-100'],
    ['warning', 'bg-yellow-100'],
    ['error', 'bg-red-100'],
    ['info', 'bg-blue-100'],
  ])('applies %s variant styles', (variant, expectedClass) => {
    render(<Badge variant={variant as any}>Status</Badge>)
    expect(screen.getByText('Status')).toHaveClass(expectedClass)
  })
})

describe('StatusBadge', () => {
  it.each([
    ['uploading', 'Uploading', 'info'],
    ['processing', 'Processing', 'warning'],
    ['ready', 'Ready', 'success'],
    ['completed', 'Completed', 'success'],
    ['pending', 'Pending', 'default'],
    ['failed', 'Failed', 'error'],
  ])('maps %s status correctly', (status, expectedLabel) => {
    render(<StatusBadge status={status} />)
    expect(screen.getByText(expectedLabel)).toBeInTheDocument()
  })
})
```

### 1.2 Custom Hooks (`lib/hooks/`)

**File: `lib/hooks/__tests__/use-videos.test.tsx`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useVideos } from '../use-videos'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  }),
}))

// Mock auth context
vi.mock('@/lib/context/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}))

describe('useVideos', () => {
  it('returns loading state initially', () => {
    const { result } = renderHook(() => useVideos())
    expect(result.current.loading).toBe(true)
    expect(result.current.videos).toEqual([])
  })

  it('returns empty array when no user', async () => {
    vi.mocked(require('@/lib/context/auth-context').useAuth).mockReturnValue({
      user: null,
    })

    const { result } = renderHook(() => useVideos())
    expect(result.current.videos).toEqual([])
  })
})
```

### 1.3 Utility Functions (`lib/api.ts`)

**File: `lib/__tests__/api.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { triggerVideoIndexing, triggerJobProcessing } from '../api'

describe('API utilities', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('triggerVideoIndexing', () => {
    it('calls correct endpoint with payload', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'queued' }),
      } as Response)

      await triggerVideoIndexing('video.mp4', 'video-123')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/webhook/index',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_filename: 'video.mp4',
            video_db_id: 'video-123',
          }),
        })
      )
    })

    it('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response)

      await expect(
        triggerVideoIndexing('video.mp4', 'video-123')
      ).rejects.toThrow('Failed to trigger indexing')
    })
  })

  describe('triggerJobProcessing', () => {
    it('calls correct endpoint with job ID', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'queued' }),
      } as Response)

      await triggerJobProcessing('job-456')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/webhook/process-job',
        expect.objectContaining({
          body: JSON.stringify({ job_id: 'job-456' }),
        })
      )
    })
  })
})
```

---

## Phase 2: Component Integration Tests

Integration tests verify multiple components working together with mocked APIs.

### 2.1 MSW Setup

**File: `tests/mocks/handlers.ts`**

```typescript
import { http, HttpResponse } from 'msw'

// Mock data
export const mockVideos = [
  {
    id: 'video-1',
    user_id: 'user-1',
    filename: 'game1.mp4',
    r2_path: 'raw/user-1/game1.mp4',
    status: 'ready',
    twelvelabs_index_id: 'idx-1',
    twelvelabs_video_id: 'vid-1',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'video-2',
    user_id: 'user-1',
    filename: 'game2.mp4',
    r2_path: 'raw/user-1/game2.mp4',
    status: 'processing',
    twelvelabs_index_id: null,
    twelvelabs_video_id: null,
    created_at: '2024-01-15T11:00:00Z',
  },
]

export const mockJobs = [
  {
    id: 'job-1',
    user_id: 'user-1',
    video_id: 'video-1',
    query: 'spikes and attacks',
    padding: 2,
    status: 'completed',
    created_at: '2024-01-15T12:00:00Z',
    videos: mockVideos[0],
  },
]

export const mockClips = [
  {
    id: 'clip-1',
    job_id: 'job-1',
    r2_path: 'clips/job-1/clip_1.mp4',
    public_url: 'https://r2.example.com/clips/job-1/clip_1.mp4',
    start_time: 10.5,
    end_time: 15.5,
    created_at: '2024-01-15T12:05:00Z',
  },
]

export const handlers = [
  // Supabase REST API mocks
  http.get('https://test.supabase.co/rest/v1/videos', () => {
    return HttpResponse.json(mockVideos)
  }),

  http.get('https://test.supabase.co/rest/v1/jobs', () => {
    return HttpResponse.json(mockJobs)
  }),

  http.get('https://test.supabase.co/rest/v1/clips', () => {
    return HttpResponse.json(mockClips)
  }),

  http.post('https://test.supabase.co/rest/v1/videos', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ ...body, id: 'new-video-id' })
  }),

  http.post('https://test.supabase.co/rest/v1/jobs', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ ...body, id: 'new-job-id' })
  }),

  // Backend API mocks
  http.post('http://localhost:8080/webhook/index', () => {
    return HttpResponse.json({ status: 'queued' })
  }),

  http.post('http://localhost:8080/webhook/process-job', () => {
    return HttpResponse.json({ status: 'queued' })
  }),

  // Upload URL mock
  http.post('/api/upload-url', () => {
    return HttpResponse.json({
      uploadUrl: 'https://r2.example.com/presigned-upload',
      r2Path: 'raw/user-1/1234_video.mp4',
      filename: 'video.mp4',
    })
  }),

  // R2 upload mock
  http.put('https://r2.example.com/presigned-upload', () => {
    return new HttpResponse(null, { status: 200 })
  }),
]
```

**File: `tests/mocks/server.ts`**

```typescript
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

### 2.2 Auth Flow Tests

**File: `app/login/__tests__/page.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '../page'

// Mock Supabase auth
const mockSignIn = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignIn,
    },
  }),
}))

describe('LoginPage', () => {
  it('renders login form', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('submits form with credentials', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValueOnce({ error: null })

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('shows error on failed login', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValueOnce({
      error: { message: 'Invalid credentials' }
    })

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })
})
```

### 2.3 Upload Tests

**File: `components/upload/__tests__/video-uploader.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoUploader } from '../video-uploader'

describe('VideoUploader', () => {
  it('renders drag and drop zone', () => {
    render(<VideoUploader />)
    expect(screen.getByText(/drop your video here/i)).toBeInTheDocument()
  })

  it('shows file info after selection', async () => {
    const user = userEvent.setup()
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' })

    render(<VideoUploader />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    expect(screen.getByText('test.mp4')).toBeInTheDocument()
  })

  it('handles drag and drop', () => {
    render(<VideoUploader />)

    const dropZone = screen.getByText(/drop your video here/i).parentElement!

    fireEvent.dragEnter(dropZone, { dataTransfer: { files: [] } })
    expect(dropZone).toHaveClass('border-blue-500')

    fireEvent.dragLeave(dropZone)
    expect(dropZone).not.toHaveClass('border-blue-500')
  })

  it('shows progress during upload', async () => {
    const user = userEvent.setup()
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' })

    render(<VideoUploader />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)
    await user.click(screen.getByRole('button', { name: /upload/i }))

    await waitFor(() => {
      expect(screen.getByText(/uploading/i)).toBeInTheDocument()
    })
  })

  it('rejects non-video files', async () => {
    const user = userEvent.setup()
    const file = new File(['text content'], 'test.txt', { type: 'text/plain' })

    render(<VideoUploader />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    expect(screen.queryByText('test.txt')).not.toBeInTheDocument()
  })
})
```

### 2.4 Clip Gallery Tests

**File: `components/clips/__tests__/clip-card.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClipCard } from '../clip-card'
import { mockClips } from '@/tests/mocks/handlers'

describe('ClipCard', () => {
  const clip = mockClips[0]

  it('renders video player', () => {
    render(<ClipCard clip={clip} index={1} />)
    const video = document.querySelector('video')
    expect(video).toHaveAttribute('src', clip.public_url)
  })

  it('displays time range', () => {
    render(<ClipCard clip={clip} index={1} />)
    expect(screen.getByText(/0:10/)).toBeInTheDocument()
    expect(screen.getByText(/0:15/)).toBeInTheDocument()
  })

  it('displays clip number', () => {
    render(<ClipCard clip={clip} index={3} />)
    expect(screen.getByText('Clip #3')).toBeInTheDocument()
  })

  it('has download button', () => {
    render(<ClipCard clip={clip} index={1} />)
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
  })

  it('shows error state when video fails to load', () => {
    render(<ClipCard clip={clip} index={1} />)
    const video = document.querySelector('video')!
    fireEvent.error(video)
    expect(screen.getByText(/video unavailable/i)).toBeInTheDocument()
  })
})
```

---

## Phase 3: API Integration Tests

These tests use real Supabase and backend connections with test accounts/data.

### 3.1 Test Environment Setup

**File: `tests/integration/setup.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL!
const TEST_SUPABASE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY!
const TEST_API_URL = process.env.TEST_API_URL || 'http://localhost:8080'

export const testSupabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_KEY)

export const TEST_USER = {
  email: 'test@volleyballclipper.test',
  password: 'test-password-123',
}

export async function cleanupTestData(userId: string) {
  await testSupabase.from('clips').delete().match({ job_id: userId })
  await testSupabase.from('jobs').delete().match({ user_id: userId })
  await testSupabase.from('videos').delete().match({ user_id: userId })
}

export async function setupTestUser() {
  const { data: existingUser } = await testSupabase.auth.admin.listUsers()
  const user = existingUser?.users.find(u => u.email === TEST_USER.email)

  if (!user) {
    const { data } = await testSupabase.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true,
    })
    return data.user
  }
  return user
}
```

### 3.2 Supabase Integration Tests

**File: `tests/integration/supabase.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { testSupabase, setupTestUser, cleanupTestData } from './setup'

describe('Supabase Integration', () => {
  let userId: string

  beforeAll(async () => {
    const user = await setupTestUser()
    userId = user!.id
  })

  afterAll(async () => {
    await cleanupTestData(userId)
  })

  describe('Videos table', () => {
    it('can create a video record', async () => {
      const { data, error } = await testSupabase
        .from('videos')
        .insert({
          user_id: userId,
          filename: 'test-video.mp4',
          r2_path: `raw/${userId}/test-video.mp4`,
          status: 'uploading',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toMatchObject({
        user_id: userId,
        filename: 'test-video.mp4',
        status: 'uploading',
      })
    })

    it('can update video status', async () => {
      const { data: video } = await testSupabase
        .from('videos')
        .insert({
          user_id: userId,
          filename: 'status-test.mp4',
          r2_path: `raw/${userId}/status-test.mp4`,
          status: 'uploading',
        })
        .select()
        .single()

      const { data, error } = await testSupabase
        .from('videos')
        .update({ status: 'ready' })
        .eq('id', video!.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data!.status).toBe('ready')
    })
  })

  describe('Jobs table', () => {
    let videoId: string

    beforeAll(async () => {
      const { data } = await testSupabase
        .from('videos')
        .insert({
          user_id: userId,
          filename: 'job-test-video.mp4',
          r2_path: `raw/${userId}/job-test-video.mp4`,
          status: 'ready',
        })
        .select()
        .single()
      videoId = data!.id
    })

    it('can create a job', async () => {
      const { data, error } = await testSupabase
        .from('jobs')
        .insert({
          user_id: userId,
          video_id: videoId,
          query: 'test query',
          padding: 2.0,
          status: 'pending',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toMatchObject({
        query: 'test query',
        padding: 2.0,
        status: 'pending',
      })
    })

    it('can fetch job with video relation', async () => {
      const { data: job } = await testSupabase
        .from('jobs')
        .insert({
          user_id: userId,
          video_id: videoId,
          query: 'relation test',
          padding: 1.5,
          status: 'pending',
        })
        .select()
        .single()

      const { data, error } = await testSupabase
        .from('jobs')
        .select('*, videos(*)')
        .eq('id', job!.id)
        .single()

      expect(error).toBeNull()
      expect(data!.videos).toMatchObject({ filename: 'job-test-video.mp4' })
    })
  })
})
```

### 3.3 Backend API Integration Tests

**File: `tests/integration/backend-api.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { testSupabase, setupTestUser, cleanupTestData } from './setup'

const API_URL = process.env.TEST_API_URL || 'http://localhost:8080'

describe('Backend API Integration', () => {
  let userId: string
  let videoId: string

  beforeAll(async () => {
    const user = await setupTestUser()
    userId = user!.id

    const { data } = await testSupabase
      .from('videos')
      .insert({
        user_id: userId,
        filename: 'api-test.mp4',
        r2_path: `raw/${userId}/api-test.mp4`,
        status: 'uploading',
      })
      .select()
      .single()
    videoId = data!.id
  })

  afterAll(async () => {
    await cleanupTestData(userId)
  })

  describe('Health check', () => {
    it('returns healthy status', async () => {
      const response = await fetch(`${API_URL}/`)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.status).toContain('running')
    })
  })

  describe('POST /webhook/index', () => {
    it('accepts valid indexing request', async () => {
      const response = await fetch(`${API_URL}/webhook/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_filename: `raw/${userId}/api-test.mp4`,
          video_db_id: videoId,
        }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.status).toBe('queued')
    })
  })

  describe('POST /webhook/process-job', () => {
    let jobId: string

    beforeAll(async () => {
      const { data: video } = await testSupabase
        .from('videos')
        .insert({
          user_id: userId,
          filename: 'job-api-test.mp4',
          r2_path: `raw/${userId}/job-api-test.mp4`,
          status: 'ready',
          twelvelabs_index_id: 'test-index-id',
          twelvelabs_video_id: 'test-video-id',
        })
        .select()
        .single()

      const { data: job } = await testSupabase
        .from('jobs')
        .insert({
          user_id: userId,
          video_id: video!.id,
          query: 'api test query',
          padding: 2.0,
          status: 'pending',
        })
        .select()
        .single()

      jobId = job!.id
    })

    it('accepts valid job processing request', async () => {
      const response = await fetch(`${API_URL}/webhook/process-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.status).toBe('queued')
    })
  })
})
```

---

## Phase 4: End-to-End Tests

E2E tests verify complete user flows in a real browser environment.

### 4.1 Playwright Configuration

**File: `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],

  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### 4.2 Authentication E2E Tests

**File: `tests/e2e/auth.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('can login with valid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    await page.waitForURL('/dashboard')
    await expect(page.getByText(/dashboard/i)).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel(/email/i).fill('wrong@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/invalid/i)).toBeVisible()
  })

  test('redirects unauthenticated users from protected routes', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('redirect=%2Fdashboard')
  })
})
```

### 4.3 Video Upload E2E Tests

**File: `tests/e2e/upload.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Video Upload', () => {
  const testVideoPath = path.join(__dirname, 'fixtures', 'test-video.mp4')

  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('/dashboard')
  })

  test('can upload video via file picker', async ({ page }) => {
    await page.goto('/upload')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testVideoPath)

    await expect(page.getByText(/test-video\.mp4/i)).toBeVisible()

    await page.getByRole('button', { name: /upload video/i }).click()

    await expect(page.getByText(/uploading/i)).toBeVisible()
    await expect(page.getByText(/complete/i)).toBeVisible({ timeout: 60000 })

    await page.waitForURL('/dashboard')
  })
})
```

### 4.4 Full Workflow E2E Test

**File: `tests/e2e/full-workflow.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Full Workflow', () => {
  test.setTimeout(300000) // 5 minutes

  test('complete flow: upload → index → job → clips', async ({ page }) => {
    const testVideoPath = path.join(__dirname, 'fixtures', 'volleyball-sample.mp4')

    // Login
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('/dashboard')

    // Step 1: Upload video
    await test.step('Upload video', async () => {
      await page.goto('/upload')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(testVideoPath)
      await page.getByRole('button', { name: /upload video/i }).click()
      await expect(page.getByText(/complete/i)).toBeVisible({ timeout: 60000 })
    })

    // Step 2: Wait for video to be ready
    await test.step('Wait for indexing', async () => {
      await page.goto('/dashboard')
      await expect(async () => {
        await page.reload()
        await expect(page.getByText('Ready').first()).toBeVisible()
      }).toPass({ timeout: 180000 })
    })

    // Step 3: Create job
    let jobUrl: string
    await test.step('Create clip job', async () => {
      await page.goto('/jobs/new')
      await page.getByRole('combobox').selectOption({ index: 1 })
      await page.getByLabel(/what moments/i).fill('volleyball spikes')
      await page.getByRole('button', { name: /create/i }).click()
      await page.waitForURL(/\/jobs\/[\w-]+/)
      jobUrl = page.url()
    })

    // Step 4: Wait for job completion
    await test.step('Wait for job processing', async () => {
      await expect(async () => {
        await page.goto(jobUrl)
        await expect(page.getByText('Completed')).toBeVisible()
      }).toPass({ timeout: 180000 })
    })

    // Step 5: Verify clips
    await test.step('Verify generated clips', async () => {
      await page.goto(jobUrl)
      const video = page.locator('video').first()
      await expect(video).toBeVisible()
      await expect(page.getByRole('button', { name: /download/i }).first()).toBeVisible()
    })
  })
})
```

---

## Test Infrastructure

### Running Tests

**package.json scripts:**

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui",
    "test:integration": "vitest --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

### Test Data Structure

```
tests/
├── fixtures/
│   ├── test-video.mp4          # Small video for upload tests
│   ├── volleyball-sample.mp4   # Real volleyball clip for E2E
│   └── mock-data.json          # Shared mock data
├── mocks/
│   ├── handlers.ts             # MSW handlers
│   └── server.ts               # MSW server setup
├── integration/
│   └── setup.ts                # Integration test setup
└── e2e/
    └── fixtures.ts             # Playwright fixtures
```

---

## CI/CD Integration

### GitHub Actions Workflow

**File: `.github/workflows/test.yml`**

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: cd frontend && bun install

      - name: Run unit tests
        run: cd frontend && bun test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./frontend/coverage

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: cd frontend && bun install

      - name: Run integration tests
        run: cd frontend && bun test:integration
        env:
          TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          TEST_SUPABASE_SERVICE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: cd frontend && bun install

      - name: Install Playwright browsers
        run: cd frontend && bunx playwright install --with-deps

      - name: Start backend
        run: |
          cd backend/video_clipping
          pip install -r requirements.txt
          uvicorn main:app --host 0.0.0.0 --port 8080 &
          sleep 5

      - name: Run E2E tests
        run: cd frontend && bun test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 30
```

---

## Summary

| Phase | Focus | Tools | Mocking |
|-------|-------|-------|---------|
| **1. Unit** | Functions, hooks, components | Vitest, RTL | Full mocking |
| **2. Component Integration** | Multiple components | Vitest, RTL, MSW | API mocking |
| **3. API Integration** | Real Supabase/Backend | Vitest | Test accounts |
| **4. E2E** | Full user flows | Playwright | Real services |

### Test Coverage Goals

| Area | Target |
|------|--------|
| UI Components | 90%+ |
| Custom Hooks | 85%+ |
| Utility Functions | 95%+ |
| Critical Flows (E2E) | 100% |

### Estimated Implementation Effort

| Phase | Effort |
|-------|--------|
| Phase 1 (Unit) | 2-3 days |
| Phase 2 (Component Integration) | 2-3 days |
| Phase 3 (API Integration) | 1-2 days |
| Phase 4 (E2E) | 2-3 days |
| CI/CD Setup | 1 day |

**Total: ~8-12 days**
