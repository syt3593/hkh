'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'

type AdminRow = { user_id: string; role: 'admin' | 'evaluator'; created_at: string }

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [items, setItems] = useState<AdminRow[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [newUserId, setNewUserId] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'evaluator'>('evaluator')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_evt, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  async function refresh() {
    setErr(null)
    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        setIsAdmin(false)
        setItems([])
        return
      }
      const res = await fetch('/api/admin/eval-admins', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await res.json()
      if (!res.ok) {
        setIsAdmin(false)
        setItems([])
        setErr(json?.message || '无权限或请求失败')
        return
      }
      setIsAdmin(true)
      setItems(json.items || [])
    } catch (e: any) {
      setErr(e?.message || '请求失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [user?.id])

  async function addOrUpdate() {
    setErr(null)
    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error('请先登录')
      const res = await fetch('/api/admin/eval-admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ user_id: newUserId.trim(), role: newRole }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || '操作失败')
      setNewUserId('')
      await refresh()
    } catch (e: any) {
      setErr(e?.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  async function remove(userId: string) {
    if (!confirm(`确认移除该评测权限？\n${userId}`)) return
    setErr(null)
    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error('请先登录')
      const res = await fetch('/api/admin/eval-admins', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ user_id: userId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || '操作失败')
      await refresh()
    } catch (e: any) {
      setErr(e?.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">评测后台 · 管理员</h1>
      <p className="text-sm text-gray-600 mt-2">
        仅 <code>eval_admins.role=admin</code> 可管理评测白名单。普通用户不可见。
      </p>
      <div className="mt-3 text-sm">
        <a className="underline" href="/admin/eval">
          前往评测执行台（上传数据集 / 跑实验）
        </a>
      </div>

      {!user && (
        <div className="mt-4 p-3 border rounded bg-gray-50 text-sm">
          你尚未登录。请先在首页登录后再访问此页面。
        </div>
      )}

      {err && <div className="mt-4 p-3 border rounded bg-red-50 text-sm text-red-700">{err}</div>}

      {user && !isAdmin && !loading && (
        <div className="mt-4 p-3 border rounded bg-yellow-50 text-sm text-yellow-800">
          你不是管理员，无法管理评测权限。
        </div>
      )}

      {user && isAdmin && (
        <>
          <div className="mt-6 p-4 border rounded">
            <div className="font-medium mb-3">新增 / 更新评测权限</div>
            <div className="flex flex-col gap-2">
              <label className="text-sm">
                user_id（UUID）
                <input
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  placeholder="例如：2c0f...-....-...."
                />
              </label>
              <label className="text-sm">
                role
                <select
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                >
                  <option value="evaluator">evaluator（可跑实验/维护数据集）</option>
                  <option value="admin">admin（额外拥有删除/管理权限）</option>
                </select>
              </label>
              <button
                className="mt-2 border rounded px-3 py-2 bg-black text-white disabled:opacity-50"
                onClick={addOrUpdate}
                disabled={loading || !newUserId.trim()}
              >
                保存
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="font-medium">当前白名单</div>
            <button className="border rounded px-3 py-2 text-sm" onClick={refresh} disabled={loading}>
              刷新
            </button>
          </div>

          <div className="mt-3 border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">user_id</th>
                  <th className="text-left p-2">role</th>
                  <th className="text-left p-2">created_at</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td className="p-2 text-gray-600" colSpan={4}>
                      暂无数据
                    </td>
                  </tr>
                )}
                {items.map((it) => (
                  <tr key={it.user_id} className="border-t">
                    <td className="p-2 font-mono">{it.user_id}</td>
                    <td className="p-2">{it.role}</td>
                    <td className="p-2">{new Date(it.created_at).toLocaleString()}</td>
                    <td className="p-2 text-right">
                      <button className="border rounded px-2 py-1" onClick={() => remove(it.user_id)} disabled={loading}>
                        移除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}


