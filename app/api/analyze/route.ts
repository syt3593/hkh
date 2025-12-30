import { NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import type { FoodItem } from '../../../types'

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY
    if (!apiKey) {
      return NextResponse.json({ message: '缺少 GEMINI_API_KEY（或 API_KEY）环境变量' }, { status: 500 })
    }

    const body = await req.json()
    const base64Image = String(body?.base64Image || '')
    const additionalContext = String(body?.additionalContext || '')
    const modelName = String(body?.modelName || 'gemini-3-pro-preview')

    if (!base64Image) {
      return NextResponse.json({ message: 'base64Image 不能为空' }, { status: 400 })
    }

    const ai = new GoogleGenAI({ apiKey })

    const prompt = `
请作为专业的营养师分析这张食物图片。
1. 识别图中所有不同的食物单品。
2. 估算每种食物的重量（克）和详细营养成分。
3. description: 提供这顿饭的简短中文描述。
4. insight: 提供一个“洞察”建议：基于该餐营养成分的一句话健康建议（例如：“蛋白质含量高，适合肌肉恢复”或“建议加点绿叶菜以平衡碳水”）。

${additionalContext ? `用户补充背景信息: "${additionalContext}"。请根据此信息调整对隐形成分或烹饪方式的判断。` : ''}

重要：请务必使用**简体中文**返回所有文本内容（包括 name, description, insight）。
请严格按照指定的 JSON 格式返回数据。
`.trim()

    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image.includes(',') ? base64Image.split(',')[1] : base64Image,
      },
    }
    const textPart = { text: prompt }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: '食物名称，使用简体中文' },
                  estimatedWeightGrams: { type: Type.NUMBER },
                  nutrients: {
                    type: Type.OBJECT,
                    properties: {
                      calories: { type: Type.NUMBER },
                      protein: { type: Type.NUMBER },
                      carbs: { type: Type.NUMBER },
                      fat: { type: Type.NUMBER },
                      fiber: { type: Type.NUMBER },
                      sugar: { type: Type.NUMBER },
                    },
                    required: ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar'],
                  },
                },
                required: ['name', 'estimatedWeightGrams', 'nutrients'],
              },
            },
            description: { type: Type.STRING, description: '餐食描述，使用简体中文' },
            insight: { type: Type.STRING, description: '健康建议，使用简体中文' },
          },
          required: ['items', 'description', 'insight'],
        },
      },
    })

    let jsonStr = response.text
    if (!jsonStr) throw new Error('AI 返回了空响应，请检查图片或稍后重试。')
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim()

    let parsed: any
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      throw new Error('AI 数据解析失败，请重试。')
    }

    const validItems = Array.isArray(parsed.items)
      ? parsed.items.map((item: any) => {
          const nutrients = {
            calories: Number(item?.nutrients?.calories) || 0,
            protein: Number(item?.nutrients?.protein) || 0,
            carbs: Number(item?.nutrients?.carbs) || 0,
            fat: Number(item?.nutrients?.fat) || 0,
            fiber: Number(item?.nutrients?.fiber) || 0,
            sugar: Number(item?.nutrients?.sugar) || 0,
          }
          return {
            name: String(item?.name || '未知食物'),
            estimatedWeightGrams: Number(item?.estimatedWeightGrams) || 0,
            originalWeightGrams: Number(item?.estimatedWeightGrams) || 0,
            nutrients,
          } satisfies Omit<FoodItem, 'id' | 'consumedPercentage'>
        })
      : []

    return NextResponse.json({
      description: String(parsed.description || '无法获取描述'),
      insight: String(parsed.insight || '保持健康饮食！'),
      items: validItems,
    })
  } catch (error: any) {
    console.error('[api/analyze] error:', error)
    return NextResponse.json({ message: error?.message || '连接 AI 服务失败' }, { status: 500 })
  }
}



