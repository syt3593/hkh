import { NextResponse } from 'next/server'
import { requireEvalAdmin } from '../../../../../lib/adminSupabase'

export async function GET(req: Request) {
  try {
    const { supabase } = await requireEvalAdmin(req, 'admin')
    const url = new URL(req.url)
    const runId = String(url.searchParams.get('run_id') || '')
    if (!runId) return NextResponse.json({ message: 'run_id 不能为空' }, { status: 400 })

    const { data, error } = await supabase
      .from('eval_run_results')
      .select('id, case_id, metrics, error_message, created_at')
      .eq('run_id', runId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return NextResponse.json({ items: data })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || '请求失败' }, { status: 403 })
  }
}



