import React, { useState } from 'react'

export interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string
  alt: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  fallbackText?: string
}

export function Avatar({
  src,
  alt,
  size = 'md',
  fallbackText,
  className = '',
  ...props
}: AvatarProps) {
  const [hasError, setHasError] = useState(false)

  const sizeClasses = {
    xs: 'w-4 h-4 text-[10px]',
    sm: 'w-5 h-5 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }[size]

  const initial = fallbackText ? fallbackText.slice(0, 2).toUpperCase() : alt.slice(0, 1).toUpperCase()

  if (!src || hasError) {
    return (
      <div
        className={`inline-flex items-center justify-center font-semibold rounded-full bg-canvas-subtle text-fg-default border border-border-default select-none ${sizeClasses} ${className}`}
        aria-label={alt}
      >
        {initial}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={`rounded-full object-cover border border-border-default/50 ${sizeClasses} ${className}`}
      {...props}
    />
  )
}
