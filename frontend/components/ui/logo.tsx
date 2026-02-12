import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  href?: string
}

const sizes = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-4xl',
}

export function Logo({ size = 'sm', href = '/' }: LogoProps) {
  const content = (
    <span className={`font-display font-bold tracking-tight select-none ${sizes[size]}`}>
      <span className="text-accent-primary">//</span> VOLLEYCLIP
    </span>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
