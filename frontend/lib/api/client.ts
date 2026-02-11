const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface IndexingPayload {
  video_filename: string
  video_db_id: string
}

interface JobProcessingPayload {
  job_id: string
}

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.detail || `Request failed with status ${response.status}`,
      }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

export async function triggerIndexing(payload: IndexingPayload): Promise<ApiResponse> {
  return apiRequest('/webhook/index', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function triggerJobProcessing(payload: JobProcessingPayload): Promise<ApiResponse> {
  return apiRequest('/webhook/process-job', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const apiClient = {
  triggerIndexing,
  triggerJobProcessing,
}
