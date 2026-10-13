'use client'

import React from 'react'
import { Toaster as Sonner, ToasterProps } from 'sonner'
import { useTheme } from '@/contexts/theme-context'

const Toaster = ({ ...props }: ToasterProps) => {
  let themeMode: 'light' | 'dark' | 'system' = 'light'
  try {
    const themeContext = useTheme()
    themeMode = (themeContext.appearance?.theme as any) || 'light'
  } catch {
    themeMode = 'light'
  }

  return (
    <Sonner
      theme={themeMode}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
