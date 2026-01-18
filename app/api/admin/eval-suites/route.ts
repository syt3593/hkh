import { NextResponse } from 'next/server'
import { requireEvalAdmin } from '../../../../lib/adminSupabase'

export async function GET(req: Request) {
  try {
    const { supabase } = await requireEvalAdmin(req, 'admin')
    const { data, error } = await supabase.from('eval_suites').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ items: data })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || '请求失败' }, { status: 403 })
  }
}

export async function POST(req: Request) {
  try {
    const { supabase, uid } = await requireEvalAdmin(req, 'admin')
    const body = await req.json()
    const name = String(body?.name || '').trim()
    const description = String(body?.description || '').trim()
    const tags = Array.isArray(body?.tags) ? body.tags.map((t: any) => String(t)) : []
    if (!name) return NextResponse.json({ message: 'name 不能为空' }, { status: 400 })

    const { data, error } = await supabase
      .from('eval_suites')
      .insert({ created_by: uid, name, description: description || null, tags })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || '请求失败' }, { status: 403 })
  }
}





