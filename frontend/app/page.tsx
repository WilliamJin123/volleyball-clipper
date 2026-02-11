import Link from 'next/link'

export default function HomePage() {
  return (
    <div>
      <h1>Volleyball Clipper</h1>
      <p>AI-powered volleyball video analysis and clip generation</p>
      <nav>
        <Link href="/signup">Get Started</Link>
        {' | '}
        <Link href="/login">Sign In</Link>
      </nav>
    </div>
  )
}
