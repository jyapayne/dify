import { request } from '@/service/base'

export type ConsoleRedBlueChallenge = {
  id: string
  name: string
  description?: string
  is_active?: boolean
}

export async function listConsoleRedBlueChallenges() {
  const resp = await request<{ data: ConsoleRedBlueChallenge[] }>('/red-blue-challenges', {}, {})
  return resp.data
}

export async function createConsoleRedBlueChallenge(payload: {
  tenant_id: string
  app_id: string
  name: string
  description?: string
  judge_suite: Record<string, any>
}) {
  const resp = await request<{ data: { id: string } }>('/red-blue-challenges', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, {})
  return resp.data
}
