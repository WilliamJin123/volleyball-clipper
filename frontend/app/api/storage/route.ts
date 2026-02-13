import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

function getS3Client(): S3Client {
  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY
  const secretAccessKey = process.env.R2_SECRET_KEY

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 storage credentials are not configured (R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY)')
  }

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

async function listPrefixSize(s3Client: S3Client, bucket: string, prefix: string): Promise<number> {
  let totalSize = 0
  let continuationToken: string | undefined

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    })

    const response = await s3Client.send(command)

    if (response.Contents) {
      for (const obj of response.Contents) {
        totalSize += obj.Size ?? 0
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined
  } while (continuationToken)

  return totalSize
}

export async function GET() {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bucket = process.env.R2_BUCKET_NAME
    if (!bucket) {
      return NextResponse.json(
        { error: 'R2_BUCKET_NAME is not configured' },
        { status: 500 }
      )
    }

    const s3Client = getS3Client()

    // 1. Calculate raw video storage: raw/{user_id}/
    const rawPrefix = `raw/${user.id}/`
    const rawSize = await listPrefixSize(s3Client, bucket, rawPrefix)

    // 2. Get all job IDs for the user to calculate clips storage
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('user_id', user.id)

    let clipsSize = 0
    if (!jobsError && jobs && jobs.length > 0) {
      // List objects for each job's clips prefix in parallel
      const clipSizePromises = jobs.map((job) =>
        listPrefixSize(s3Client, bucket, `clips/${job.id}/`)
      )
      const clipSizes = await Promise.all(clipSizePromises)
      clipsSize = clipSizes.reduce((sum, size) => sum + size, 0)
    }

    const totalBytes = rawSize + clipsSize

    return NextResponse.json({
      totalBytes,
      rawBytes: rawSize,
      clipsBytes: clipsSize,
    })
  } catch (error) {
    console.error('Error calculating storage:', error)
    const message = error instanceof Error ? error.message : 'Failed to calculate storage'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
