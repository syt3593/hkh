import { NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import { requireEvalAdmin } from '../../../../../lib/adminSupabase'

export const runtime = 'nodejs'

function sumEstimated(items: any[]) {
  return items.reduce((s, it) => s + (Number(it?.estimatedWeightGrams) || 0), 0)
}

async function analyzeWithGemini(params: { apiKey: string; modelName: string; base64Jpeg: string }) {
  const ai = new GoogleGenAI({ apiKey: params.apiKey })
  const prompt = `
请作为专业的营养师分析这张食物图片。
1. 识别图中所有不同的食物单品。
2. 估算每种食物的重量（克）和详细营养成分。
3. description: 提供这顿饭的简短中文描述。
4. insight: 提供一个“洞察”建议：基于该餐营养成分的一句话健康建议。

重要：请务必使用**简体中文**返回所有文本内容（包括 name, description, insight）。
请严格按照指定的 JSON 格式返回数据。
`.trim()

  const imagePart = { inlineData: { mimeType: 'image/jpeg', data: params.base64Jpeg } }
  const textPart = { text: prompt }

  const response = await ai.models.generateContent({
    model: params.modelName,
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
          description: { type: Type.STRING },
          insight: { type: Type.STRING },
        },
        required: ['items', 'description', 'insight'],
      },
    },
  })

  let jsonStr = response.text
  if (!jsonStr) throw new Error('AI 返回了空响应')
  jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(jsonStr)
  return { parsed, raw: jsonStr }
}

export async function POST(req: Request) {
  try {
    const { supabase, uid } = await requireEvalAdmin(req, 'admin')
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY
    if (!apiKey) return NextResponse.json({ message: '缺少 GEMINI_API_KEY（或 API_KEY）环境变量' }, { status: 500 })

    const body = await req.json()
    const suiteId = String(body?.suite_id || '')
    const modelName = String(body?.model_name || 'gemini-3-pro-preview')
    const promptVersion = String(body?.prompt_version || 'v1')
    if (!suiteId) return NextResponse.json({ message: 'suite_id 不能为空' }, { status: 400 })

    // 创建 run
    const { data: runRow, error: runErr } = await supabase
      .from('eval_runs')
      .insert({
        created_by: uid,
        suite_id: suiteId,
        status: 'running',
        model_name: modelName,
        prompt_version: promptVersion,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (runErr) throw runErr

    const runId = runRow.id as string

    // 拉取 cases
    const { data: cases, error: caseErr } = await supabase
      .from('eval_cases')
      .select('id, image_path, ground_truth')
      .eq('suite_id', suiteId)
      .order('created_at', { ascending: true })
    if (caseErr) throw caseErr

    const bucket = process.env.EVAL_IMAGES_BUCKET || 'food-images'
    let ok = 0
    let failed = 0

    for (const c of cases || []) {
      const caseId = c.id as string
      try {
        const { data: fileData, error: dlErr } = await supabase.storage.from(bucket).download(String(c.image_path))
        if (dlErr) throw dlErr
        const ab = await fileData.arrayBuffer()
        const b64 = Buffer.from(new Uint8Array(ab)).toString('base64')

        const { parsed, raw } = await analyzeWithGemini({ apiKey, modelName, base64Jpeg: b64 })
        const items = Array.isArray(parsed?.items) ? parsed.items : []
        const estimatedTotal = sumEstimated(items)
        const gtTotal = Number(c?.ground_truth?.total_weight_grams) || null
        const absErr = gtTotal ? Math.abs(estimatedTotal - gtTotal) : null
        const mape = gtTotal ? absErr! / gtTotal : null

        const metrics: any = { estimated_total_grams: estimatedTotal }
        if (gtTotal) {
          metrics.ground_truth_total_grams = gtTotal
          metrics.abs_error_grams = absErr
          metrics.mape = mape
        }

        const { error: resErr } = await supabase.from('eval_run_results').upsert(
          {
            created_by: uid,
            run_id: runId,
            case_id: caseId,
            ai_output: parsed,
            ai_raw_text: raw,
            metrics,
          },
          { onConflict: 'run_id,case_id' },
        )
        if (resErr) throw resErr
        ok++
      } catch (e: any) {
        failed++
        await supabase.from('eval_run_results').upsert(
          {
            created_by: uid,
            run_id: runId,
            case_id: caseId,
            ai_output: {},
            ai_raw_text: null,
            metrics: {},
            error_message: e?.message || 'unknown error',
          },
          { onConflict: 'run_id,case_id' },
        )
      }
    }

    await supabase
      .from('eval_runs')
      .update({ status: failed ? 'completed' : 'completed', finished_at: new Date().toISOString() })
      .eq('id', runId)

    return NextResponse.json({ run_id: runId, ok, failed, total: (cases || []).length })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || '执行失败' }, { status: 403 })
  }
}



