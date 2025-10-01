import { request } from '@/service/base'

export type ConsoleChallenge = {
  id: string
  name: string
  description?: string
  goal?: string
  is_active?: boolean
  success_type?: string
  success_pattern?: string
  scoring_strategy?: string
  app_id?: string
  workflow_id?: string
}

export async function listConsoleChallenges() {
  const resp = await request<{ data: ConsoleChallenge[] }>('/challenges', {}, {})
  return resp.data
}

export async function createConsoleChallenge(payload: {
  app_id: string
  workflow_id?: string
  name: string
  description?: string
  goal?: string
  success_type?: string
  success_pattern?: string
  scoring_strategy?: string
  is_active?: boolean
}) {
  const resp = await request<{ data: { id: string } }>('/challenges', {
    method: 'POST',
    body: payload,
  }, {})
  return resp.data
}

export async function updateConsoleChallenge(id: string, payload: Partial<ConsoleChallenge>) {
  const resp = await request<{ data: ConsoleChallenge }>(`/challenges/${id}`, {
    method: 'PATCH',
    body: payload,
  }, {})
  return resp.data
}

export async function deleteConsoleChallenge(id: string) {
  await request(`/challenges/${id}`, {
    method: 'DELETE',
  }, {})
}

export type RedBlueChallenge = {
  id: string
  name: string
  description?: string
  judge_suite?: string[]
  defense_selection_policy?: string
  attack_selection_policy?: string
  scoring_strategy?: string
  is_active?: boolean
}

export async function listRedBlueChallenges() {
  const resp = await request<{ data: RedBlueChallenge[] }>('/red-blue-challenges', {}, {})
  return resp.data
}

export async function createRedBlueChallenge(payload: {
  app_id: string
  workflow_id?: string
  name: string
  description?: string
  judge_suite?: string[]
  defense_selection_policy?: string
  attack_selection_policy?: string
  scoring_strategy?: string
  is_active?: boolean
}) {
  const resp = await request<{ data: { id: string } }>('/red-blue-challenges', {
    method: 'POST',
    body: payload,
  }, {})
  return resp.data
}

export async function updateRedBlueChallenge(id: string, payload: Partial<RedBlueChallenge>) {
  const resp = await request<{ data: RedBlueChallenge }>(`/red-blue-challenges/${id}`, {
    method: 'PATCH',
    body: payload,
  }, {})
  return resp.data
}

export async function deleteRedBlueChallenge(id: string) {
  await request(`/red-blue-challenges/${id}`, {
    method: 'DELETE',
  }, {})
}
