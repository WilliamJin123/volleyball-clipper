const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface TriggerIndexResponse {
  status: string
}

interface TriggerJobResponse {
  status: string
}

export async function triggerVideoIndexing(videoFilename: string, videoDbId: string): Promise<TriggerIndexResponse> {
  const response = await fetch(`${API_URL}/webhook/index`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_filename: videoFilename,
      video_db_id: videoDbId,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to trigger indexing: ${response.statusText}`)
  }

  return response.json()
}

export async function triggerJobProcessing(jobId: string): Promise<TriggerJobResponse> {
  const response = await fetch(`${API_URL}/webhook/process-job`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      job_id: jobId,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to trigger job processing: ${response.statusText}`)
  }

  return response.json()
}
