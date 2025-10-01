import { getPublic, postPublic } from './base'

export type RedBlueListItem = {
  id: string
  name: string
  description?: string
}

export async function fetchRedBlueChallenges(): Promise<RedBlueListItem[]> {
  const res = await getPublic<{ result: string; data: RedBlueListItem[] }>('/red-blue-challenges')
  return res.data ?? []
}

export async function fetchRedBlueLeaderboard(id: string) {
  const res = await getPublic<{ result: string; data: any }>(`/red-blue-challenges/${id}/leaderboard`)
  return res.data
}

export async function submitRedBluePrompt(id: string, team: 'red' | 'blue', prompt: string) {
  const res = await postPublic<{ result: string; data: any }>(`/red-blue-challenges/${id}/submit`, {
    body: { team, prompt },
  })
  return res.data
}
