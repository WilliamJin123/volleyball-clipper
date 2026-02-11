import { Header } from '@/components/layout'
import { VideoUploader } from '@/components/upload/video-uploader'

export default function UploadPage() {
  return (
    <div>
      <Header />
      <main>
        <h1>Upload Video</h1>
        <VideoUploader />
      </main>
    </div>
  )
}
