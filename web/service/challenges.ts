import { getPublic, postPublic } from './base'
import { PUBLIC_API_PREFIX } from '@/config'
import { getInitialTokenV2, isTokenV1 } from '@/app/components/share/utils'
import { CONVERSATION_ID_INFO } from '@/app/components/base/chat/constants'

export type ChallengeListItem = {
  id: string
  name: string
  description?: string
  goal?: string
  app_id?: string
  workflow_id?: string
  app_mode?: string
  app_site_code?: string
}

export async function fetchChallenges(): Promise<ChallengeListItem[]> {
  const res = await getPublic<{ result: string; data: ChallengeListItem[] }>('/challenges')
  return res.data ?? []
}

export async function fetchChallengeDetail(id: string) {
  const res = await getPublic<{ result: string; data: any }>(`/challenges/${id}`)
  return res.data
}

export async function fetchChallengeLeaderboard(id: string) {
  const res = await getPublic<{ result: string; data: any[] }>(`/challenges/${id}/leaderboard`)
  return res.data ?? []
}

export async function submitChallengeAttempt(
  challengeId: string,
  appId: string,
  appSiteCode: string | undefined,
  appMode: string,
  userInput: string,
) {
  if (!appSiteCode)
    throw new Error('Challenge app is not published. Please enable the app site for this challenge.')

  const passportRes = await fetch(`${PUBLIC_API_PREFIX}/passport`, {
    method: 'GET',
    headers: {
      'X-App-Code': appSiteCode,
    },
    credentials: 'include',
  })

  if (!passportRes.ok) {
    let message = 'Unable to start challenge. Please try again.'
    try {
      const data = await passportRes.json()
      message = data?.message || message
    }
    catch { /* ignore json parse errors */ }
    throw new Error(message)
  }

  const passportData = await passportRes.json() as { access_token?: string }
  const accessToken = passportData?.access_token
  if (!accessToken)
    throw new Error('Challenge authorization failed. Please refresh and try again.')

  // Persist token using the same structure expected by getAccessToken(true)
  const storageKey = 'token'
  const userKey = 'DEFAULT'
  const rawTokenStore = localStorage.getItem(storageKey) || JSON.stringify(getInitialTokenV2())
  let tokenStore: Record<string, any>
  try {
    const parsed = JSON.parse(rawTokenStore)
    tokenStore = isTokenV1(parsed) ? getInitialTokenV2() : parsed
  }
  catch {
    tokenStore = getInitialTokenV2()
  }

  tokenStore[challengeId] = {
    ...(tokenStore[challengeId] || {}),
    [userKey]: accessToken,
  }
  localStorage.setItem(storageKey, JSON.stringify(tokenStore))
  localStorage.removeItem(CONVERSATION_ID_INFO)

  if (appMode === 'chat' || appMode === 'advanced-chat' || appMode === 'agent-chat') {
    return await postPublic<any>('/chat-messages', {
      body: {
        query: userInput,
        inputs: {},
        response_mode: 'blocking',
        conversation_id: '',
      },
    })
  }

  return await postPublic<any>('/workflows/run', {
    body: {
      inputs: {
        user_prompt: userInput,
      },
      response_mode: 'blocking',
    },
  })
}
