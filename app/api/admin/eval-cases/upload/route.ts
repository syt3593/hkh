import { NextResponse } from 'next/server'
import { requireEvalAdmin } from '../../../../../lib/adminSupabase'

export const runtime = 'nodejs'

function guessExt(mime: string) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

function parseTotalWeightFromName(name: string): number | null {
  // 支持：134gxxx / 134 gxxx / 134Gxxx / 净重217g / xxx217g
  const m = name.match(/(\d{1,5})\s*[gG]\b/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function POST(req: Request) {
  try {
    const { supabase, uid } = await requireEvalAdmin(req, 'admin')

    const form = await req.formData()
    const suiteId = String(form.get('suite_id') || '')
    const source = String(form.get('source') || 'upload')
    const files = form.getAll('files')
    if (!suiteId) return NextResponse.json({ message: 'suite_id 不能为空' }, { status: 400 })
    if (!files.length) return NextResponse.json({ message: 'files 不能为空' }, { status: 400 })

    const bucket = process.env.EVAL_IMAGES_BUCKET || 'food-images'
    const inserted: any[] = []

    for (const f of files) {
      if (!(f instanceof File)) continue
      const arr = await f.arrayBuffer()
      const bytes = new Uint8Array(arr)
      const ext = guessExt(f.type)
      const safeName = (f.name || `upload.${ext}`).replace(/[^\w.\-()\u4e00-\u9fa5]+/g, '_')
      const path = `eval/${suiteId}/${Date.now()}_${Math.random().toString(16).slice(2)}_${safeName}`

      const { error: upErr } = await supabase.storage.from(bucket).upload(path, bytes, {
        contentType: f.type || 'image/jpeg',
        upsert: false,
      })
      if (upErr) throw upErr

      const gt = {}
      const total = parseTotalWeightFromName(f.name || '')
      const groundTruth = total ? { ...gt, total_weight_grams: total } : gt

      const { data: row, error: insErr } = await supabase
        .from('eval_cases')
        .insert({
          created_by: uid,
          suite_id: suiteId,
          image_path: path,
          source,
          ground_truth: groundTruth,
        })
        .select()
        .single()
      if (insErr) throw insErr
      inserted.push(row)
    }

    return NextResponse.json({ items: inserted, bucket })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || '上传失败' }, { status: 403 })
  }
}





