import { createClient } from '@supabase/supabase-js'

export function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!supabaseUrl || !serviceKey) {
    throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 环境变量')
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function getBearerToken(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  return m?.[1] || ''
}

export async function requireEvalAdmin(req: Request, requiredRole: 'admin' | 'evaluator' = 'admin') {
  const token = getBearerToken(req)
  if (!token) throw new Error('未提供 Authorization Bearer token')

  const supabase = getServiceClient()

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr) throw userErr
  const uid = userData.user?.id
  if (!uid) throw new Error('无效登录态')

  const { data: row, error: rowErr } = await supabase
    .from('eval_admins')
    .select('role')
    .eq('user_id', uid)
    .maybeSingle()
  if (rowErr) throw rowErr

  const role = row?.role as 'admin' | 'evaluator' | undefined
  if (!role) throw new Error('权限不足：不在评测白名单')
  if (requiredRole === 'admin' && role !== 'admin') throw new Error('权限不足：需要 admin')

  return { supabase, uid, role }
}



