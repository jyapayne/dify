import { getPublic, ssePost } from './base'
import { PUBLIC_API_PREFIX } from '@/config'
import { getInitialTokenV2, isTokenV1 } from '@/app/components/share/utils'
import { CONVERSATION_ID_INFO } from '@/app/components/base/chat/constants'
import type { WorkflowFinishedResponse } from '@/types/workflow'

type ChatMessageEnd = {
  metadata?: {
    outputs?: Record<string, any>
    answer?: string
    message?: string
    judge_feedback?: string
    judge_rating?: number
  }
}

export type ChallengeAttemptResult = {
  success: boolean
  message: string
  rating?: number
  outputs: Record<string, any>
  rawText: string
}

export type ChallengeAttemptCallbacks = {
  onStreamUpdate?: (text: string) => void
  onError?: (message: string) => void
  onAbortController?: (abortController: AbortController | null) => void
}

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
  _appId: string,
  appSiteCode: string | undefined,
  appMode: string,
  userInput: string,
  callbacks?: ChallengeAttemptCallbacks,
): Promise<ChallengeAttemptResult> {
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

  const isChatApp = appMode === 'chat' || appMode === 'advanced-chat' || appMode === 'agent-chat'

  return await new Promise<ChallengeAttemptResult>((resolve, reject) => {
    let aggregatedText = ''
    let finalOutputs: Record<string, any> | undefined
    let finalMessage: string | undefined
    let isSettled = false
    const releaseAbortController = () => {
      callbacks?.onAbortController?.(null)
    }

    const emitStreamUpdate = () => {
      callbacks?.onStreamUpdate?.(aggregatedText)
    }

    const settleError = (message: string) => {
      if (isSettled)
        return
      isSettled = true
      releaseAbortController()
      const normalizedMessage = message || 'Submission failed'
      const error = new Error(normalizedMessage)
      if (callbacks?.onError)
        (error as any).__handled = true

      callbacks?.onError?.(normalizedMessage)
      reject(error)
    }

    const buildResult = (): ChallengeAttemptResult => {
      const outputs = finalOutputs || {}
      const successFlag = Boolean(outputs.challenge_succeeded)
      const rating = outputs.judge_rating ?? outputs.rating
      const feedback = outputs.judge_feedback || outputs.message || finalMessage || aggregatedText
      const message = feedback || (successFlag ? 'Challenge passed!' : 'Challenge not passed.')
      return {
        success: successFlag,
        rating,
        message,
        outputs,
        rawText: aggregatedText,
      }
    }

    const settleSuccess = () => {
      if (isSettled)
        return
      isSettled = true
      releaseAbortController()
      resolve(buildResult())
    }

    const commonOptions = {
      isPublicAPI: true,
      getAbortController: (abortController: AbortController) => {
        callbacks?.onAbortController?.(abortController)
      },
      onError: (error: string) => {
        const errorMessage = typeof error === 'string' ? error : 'Submission failed'
        settleError(errorMessage)
      },
      onCompleted: (hasError?: boolean, errorMessage?: string) => {
        if (hasError) {
          settleError(errorMessage || 'Submission failed')
          return
        }
        settleSuccess()
      },
    }

    if (isChatApp) {
      ssePost(
        '/chat-messages',
        {
          body: {
            query: userInput,
            inputs: {},
            response_mode: 'streaming',
            conversation_id: '',
          },
        },
        {
          ...commonOptions,
          onData: (message: string) => {
            aggregatedText += message
            emitStreamUpdate()
          },
          onMessageReplace: (messageReplace) => {
            aggregatedText = messageReplace.answer
            emitStreamUpdate()
          },
          onMessageEnd: (messageEnd) => {
            const metadata = (messageEnd as ChatMessageEnd).metadata
            if (metadata?.outputs)
              finalOutputs = metadata.outputs
            const endMessage = metadata?.answer || metadata?.message || metadata?.judge_feedback
            if (endMessage) {
              aggregatedText = endMessage
              emitStreamUpdate()
            }
            if (metadata?.judge_feedback)
              finalMessage = metadata.judge_feedback
            else if (metadata?.answer || metadata?.message)
              finalMessage = metadata.answer || metadata.message
          },
        },
      )
      return
    }

    ssePost(
      '/workflows/run',
      {
        body: {
          inputs: {
            user_prompt: userInput,
          },
          response_mode: 'streaming',
        },
      },
      {
        ...commonOptions,
        onTextChunk: (chunk) => {
          const text = (chunk as any)?.data?.text || ''
          if (text) {
            aggregatedText += text
            emitStreamUpdate()
          }
        },
        onWorkflowFinished: ({ data }) => {
          const resultData = (data as WorkflowFinishedResponse['data']) || {}
          if (resultData.outputs)
            finalOutputs = resultData.outputs
          const message = resultData.outputs?.judge_feedback || resultData.outputs?.message
          if (message) {
            aggregatedText = message
            emitStreamUpdate()
          }
          finalMessage = message || finalMessage
        },
      },
    )
  })
}
