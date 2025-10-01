import { submitChallengeAttempt } from '@/service/challenges'
import { PUBLIC_API_PREFIX } from '@/config'

const originalFetch = globalThis.fetch
let fetchMock: jest.Mock
let ssePostMock: jest.SpyInstance

jest.mock('@/service/base', () => {
  const actual = jest.requireActual('@/service/base')
  return {
    ...actual,
    ssePost: jest.fn(),
  }
})

jest.mock('@/app/components/share/utils', () => ({
  ...jest.requireActual('@/app/components/share/utils'),
  getInitialTokenV2: () => ({ version: 2 }),
  isTokenV1: () => false,
}))

describe('submitChallengeAttempt', () => {
  beforeEach(() => {
    fetchMock = jest.fn()
    globalThis.fetch = fetchMock as unknown as typeof fetch

    ssePostMock = jest.spyOn(require('@/service/base'), 'ssePost').mockImplementation((_url: string, _options: any, handlers: any) => {
      handlers.onCompleted?.()
      return Promise.resolve()
    })

    localStorage.clear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it('throws when challenge web app is not published', async () => {
    await expect(
      submitChallengeAttempt('challenge-id', 'app-id', undefined, 'chat', 'hello'),
    ).rejects.toThrow('Challenge app is not published')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(ssePostMock).not.toHaveBeenCalled()
  })

  it('requests a passport token and submits chat attempts through /chat-messages', async () => {
    const passportToken = 'chat-passport-token'
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ access_token: passportToken }),
    })

    ssePostMock.mockImplementation((_url, _options, handlers) => {
      handlers.getAbortController?.(new AbortController())
      handlers.onData?.('Hello', true, { messageId: 'msg-1' } as any)
      handlers.onMessageEnd?.({ metadata: { outputs: { challenge_succeeded: true }, answer: 'All good' } } as any)
      handlers.onCompleted?.()
      return Promise.resolve()
    })

    await submitChallengeAttempt('challenge-123', 'app-abc', 'site-code-xyz', 'chat', 'solve this')

    expect(fetchMock).toHaveBeenCalledWith(`${PUBLIC_API_PREFIX}/passport`, {
      method: 'GET',
      headers: {
        'X-App-Code': 'site-code-xyz',
      },
      credentials: 'include',
    })

    expect(ssePostMock).toHaveBeenCalledWith('/chat-messages', expect.objectContaining({
      body: {
        query: 'solve this',
        inputs: {},
        response_mode: 'streaming',
        conversation_id: '',
      },
    }), expect.any(Object))

    const storedToken = JSON.parse(localStorage.getItem('token') || '{}')
    expect(storedToken.version).toBe(2)
    expect(storedToken['challenge-123'].DEFAULT).toBe(passportToken)
  })

  it('requests a passport token and submits workflow attempts through /workflows/run', async () => {
    const passportToken = 'workflow-passport-token'
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ access_token: passportToken }),
    })

    ssePostMock.mockImplementation((_url, _options, handlers) => {
      handlers.getAbortController?.(new AbortController())
      handlers.onTextChunk?.({ data: { text: 'partial' } } as any)
      handlers.onWorkflowFinished?.({ data: { outputs: { challenge_succeeded: false, message: 'nope' } } } as any)
      handlers.onCompleted?.()
      return Promise.resolve()
    })

    await submitChallengeAttempt('challenge-456', 'app-def', 'site-code-xyz', 'workflow', 'my answer')

    expect(fetchMock).toHaveBeenCalledWith(`${PUBLIC_API_PREFIX}/passport`, {
      method: 'GET',
      headers: {
        'X-App-Code': 'site-code-xyz',
      },
      credentials: 'include',
    })

    expect(ssePostMock).toHaveBeenCalledWith('/workflows/run', expect.objectContaining({
      body: {
        inputs: {
          user_prompt: 'my answer',
        },
        response_mode: 'streaming',
      },
    }), expect.any(Object))

    const storedToken = JSON.parse(localStorage.getItem('token') || '{}')
    expect(storedToken['challenge-456'].DEFAULT).toBe(passportToken)
  })
})
