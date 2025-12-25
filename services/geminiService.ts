
export async function analyzeFoodImage(
  base64Image: string, 
  additionalContext: string,
  modelName: string = "gemini-3-pro-preview"
): Promise<{
  items: any[];
  description: string;
  insight: string;
}> {
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image, additionalContext, modelName }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data?.message || '连接 AI 服务失败')
    }
    return data
  } catch (error: any) {
    console.error('Gemini API Error:', error)
    throw new Error(error.message || '连接 AI 服务失败')
  }
}
