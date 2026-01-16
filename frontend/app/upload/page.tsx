import { Header } from '@/components/layout'
import { VideoUploader } from '@/components/upload/video-uploader'

export default function UploadPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Upload Video
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Upload a volleyball video to analyze and create clips from
          </p>
        </div>

        <VideoUploader />

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-medium text-blue-900 dark:text-blue-100">
            What happens next?
          </h3>
          <ol className="mt-2 text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1">
            <li>Your video will be uploaded to our secure storage</li>
            <li>AI will analyze the video content (this may take a few minutes)</li>
            <li>Once ready, you can create clip jobs with natural language queries</li>
            <li>The AI will find matching moments and generate clips automatically</li>
          </ol>
        </div>
      </main>
    </div>
  )
}
