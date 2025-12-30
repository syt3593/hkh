import { NextResponse } from 'next/server'
import { requireEvalAdmin } from '../../../../lib/adminSupabase'

export async function GET(req: Request) {
  try {
    const { supabase } = await requireEvalAdmin(req, 'admin')
    const { data, error } = await supabase
      .from('eval_admins')
      .select('user_id, role, created_at')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ items: data })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || '请求失败' }, { status: 403 })
  }
}

export async function POST(req: Request) {
  try {
    const { supabase } = await requireEvalAdmin(req, 'admin')
    const body = await req.json()
    const userId = String(body?.user_id || '')
    const role = String(body?.role || 'evaluator')
    if (!userId) return NextResponse.json({ message: 'user_id 不能为空' }, { status: 400 })
    if (!['admin', 'evaluator'].includes(role)) {
      return NextResponse.json({ message: 'role 必须是 admin 或 evaluator' }, { status: 400 })
    }

    const { error } = await supabase
      .from('eval_admins')
      .upsert({ user_id: userId, role }, { onConflict: 'user_id' })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || '请求失败' }, { status: 403 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { supabase } = await requireEvalAdmin(req, 'admin')
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.user_id || '')
    if (!userId) return NextResponse.json({ message: 'user_id 不能为空' }, { status: 400 })

    const { error } = await supabase.from('eval_admins').delete().eq('user_id', userId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || '请求失败' }, { status: 403 })
  }
}


