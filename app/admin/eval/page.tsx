'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { User } from '@supabase/supabase-js'

type Suite = { id: string; name: string; description: string | null; created_at: string }

export default function AdminEvalPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [suites, setSuites] = useState<Suite[]>([])
  const [suiteId, setSuiteId] = useState<string>('')

  const [newSuiteName, setNewSuiteName] = useState('')
  const [newSuiteDesc, setNewSuiteDesc] = useState('')

  const [files, setFiles] = useState<FileList | null>(null)
  const [source, setSource] = useState('food-test')

  const [modelName, setModelName] = useState('gemini-3-pro-preview')
  const [promptVersion, setPromptVersion] = useState('v1')
  const [runResult, setRunResult] = useState<any>(null)
  const [results, setResults] = useState<any[]>([])

  const accessToken = useMemo(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }, [user?.id])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_evt, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  async function fetchToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }

  async function loadSuites() {
    setErr(null)
    setLoading(true)
    try {
      const token = await fetchToken()
      if (!token) throw new Error('请先登录')
      const res = await fetch('/api/admin/eval-suites', { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || '无权限或请求失败')
      setIsAdmin(true)
      setSuites(json.items || [])
      if (!suiteId && (json.items || []).length) setSuiteId(json.items[0].id)
    } catch (e: any) {
      setIsAdmin(false)
      setSuites([])
      setErr(e?.message || '请求失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) loadSuites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function createSuite() {
    setErr(null)
    setLoading(true)
    try {
      const token = await fetchToken()
      if (!token) throw new Error('请先登录')
      const res = await fetch('/api/admin/eval-suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newSuiteName.trim(), description: newSuiteDesc.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || '创建失败')
      setNewSuiteName('')
      setNewSuiteDesc('')
      await loadSuites()
    } catch (e: any) {
      setErr(e?.message || '创建失败')
    } finally {
      setLoading(false)
    }
  }

  async function uploadCases() {
    setErr(null)
    setLoading(true)
    try {
      if (!suiteId) throw new Error('请先选择数据集')
      if (!files || files.length === 0) throw new Error('请选择图片')
      const token = await fetchToken()
      if (!token) throw new Error('请先登录')
      const fd = new FormData()
      fd.set('suite_id', suiteId)
      fd.set('source', source)
      Array.from(files).forEach((f) => fd.append('files', f))
      const res = await fetch('/api/admin/eval-cases/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || '上传失败')
      alert(`上传成功：${(json.items || []).length} 张`)
    } catch (e: any) {
      setErr(e?.message || '上传失败')
    } finally {
      setLoading(false)
    }
  }

  async function runSuite() {
    setErr(null)
    setRunResult(null)
    setResults([])
    setLoading(true)
    try {
      if (!suiteId) throw new Error('请先选择数据集')
      const token = await fetchToken()
      if (!token) throw new Error('请先登录')
      const res = await fetch('/api/admin/eval-runs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ suite_id: suiteId, model_name: modelName, prompt_version: promptVersion }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || '执行失败')
      setRunResult(json)

      const res2 = await fetch(`/api/admin/eval-runs/results?run_id=${encodeURIComponent(json.run_id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json2 = await res2.json()
      if (res2.ok) setResults(json2.items || [])
    } catch (e: any) {
      setErr(e?.message || '执行失败')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold">评测后台 · 执行台</h1>
        <div className="mt-4 p-3 border rounded bg-gray-50 text-sm">请先在首页登录后再访问。</div>
      </div>
    )
  }

  if (!isAdmin && err) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold">评测后台 · 执行台</h1>
        <div className="mt-4 p-3 border rounded bg-yellow-50 text-sm text-yellow-800">{err}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">评测后台 · 执行台</h1>
      <p className="text-sm text-gray-600 mt-2">创建数据集 → 批量上传测试图 → 一键跑实验（落库 metrics）。</p>
      {err && <div className="mt-4 p-3 border rounded bg-red-50 text-sm text-red-700">{err}</div>}

      <div className="mt-6 p-4 border rounded">
        <div className="font-medium mb-3">数据集（Suite）</div>
        <div className="flex gap-2 items-center">
          <select className="border rounded px-3 py-2 w-full" value={suiteId} onChange={(e) => setSuiteId(e.target.value)}>
            <option value="">请选择</option>
            {suites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button className="border rounded px-3 py-2 text-sm" onClick={loadSuites} disabled={loading}>
            刷新
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <input className="border rounded px-3 py-2" value={newSuiteName} onChange={(e) => setNewSuiteName(e.target.value)} placeholder="新数据集名称" />
          <input className="border rounded px-3 py-2" value={newSuiteDesc} onChange={(e) => setNewSuiteDesc(e.target.value)} placeholder="描述（可选）" />
          <button className="border rounded px-3 py-2 bg-black text-white disabled:opacity-50" onClick={createSuite} disabled={loading || !newSuiteName.trim()}>
            创建数据集
          </button>
        </div>
      </div>

      <div className="mt-6 p-4 border rounded">
        <div className="font-medium mb-3">批量上传测试图片（Case）</div>
        <div className="grid grid-cols-1 gap-2">
          <input className="border rounded px-3 py-2" value={source} onChange={(e) => setSource(e.target.value)} placeholder="source（例如 food-test）" />
          <input className="border rounded px-3 py-2" type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} />
          <button className="border rounded px-3 py-2 bg-black text-white disabled:opacity-50" onClick={uploadCases} disabled={loading || !suiteId}>
            上传
          </button>
          <div className="text-xs text-gray-600">
            会把文件名中的 <code>xxxg</code> 自动解析为 <code>ground_truth.total_weight_grams</code>（如有）。
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 border rounded">
        <div className="font-medium mb-3">跑实验（Run）</div>
        <div className="grid grid-cols-1 gap-2">
          <input className="border rounded px-3 py-2" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="model_name" />
          <input className="border rounded px-3 py-2" value={promptVersion} onChange={(e) => setPromptVersion(e.target.value)} placeholder="prompt_version" />
          <button className="border rounded px-3 py-2 bg-green-600 text-white disabled:opacity-50" onClick={runSuite} disabled={loading || !suiteId}>
            一键执行（顺序跑，耗时取决于图片数）
          </button>
        </div>

        {runResult && (
          <div className="mt-3 text-sm border rounded p-3 bg-gray-50">
            run_id: <code>{runResult.run_id}</code>，成功 {runResult.ok} / 失败 {runResult.failed} / 总计 {runResult.total}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-3 border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">case_id</th>
                  <th className="text-left p-2">mape</th>
                  <th className="text-left p-2">abs_error(g)</th>
                  <th className="text-left p-2">error</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 font-mono">{r.case_id}</td>
                    <td className="p-2">{r.metrics?.mape != null ? Number(r.metrics.mape).toFixed(3) : '-'}</td>
                    <td className="p-2">{r.metrics?.abs_error_grams != null ? Math.round(Number(r.metrics.abs_error_grams)) : '-'}</td>
                    <td className="p-2 text-red-700">{r.error_message || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}



