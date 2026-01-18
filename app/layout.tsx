import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NutriLens - AI 智能膳食分析',
  description: '拍张照片，AI 帮你精准估算食物重量、热量及详细营养成分。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
      </body>
    </html>
  )
}




