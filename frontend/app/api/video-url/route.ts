import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { r2Path } = await request.json()

    if (!r2Path) {
      return NextResponse.json(
        { error: 'r2Path is required' },
        { status: 400 }
      )
    }

    // Verify the user owns this video
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id')
      .eq('user_id', user.id)
      .eq('r2_path', r2Path)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: r2Path,
    })

    const videoUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return NextResponse.json({ videoUrl })
  } catch (error) {
    console.error('Error generating video URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate video URL' },
      { status: 500 }
    )
  }
}
