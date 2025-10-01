import { submitChallengeAttempt } from '@/service/challenges'
import { postPublic } from '@/service/base'
import { PUBLIC_API_PREFIX } from '@/config'

jest.mock('@/service/base', () => ({
  getPublic: jest.fn(),
  postPublic: jest.fn(),
}))

const mockedPostPublic = postPublic as jest.MockedFunction<typeof postPublic>
const originalFetch = globalThis.fetch
let fetchMock: jest.Mock

describe('submitChallengeAttempt', () => {
  beforeEach(() => {
    fetchMock = jest.fn()
    globalThis.fetch = fetchMock as unknown as typeof fetch

    mockedPostPublic.mockReset()
    mockedPostPublic.mockResolvedValue({ result: 'success' } as any)

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
    expect(mockedPostPublic).not.toHaveBeenCalled()
  })

  it('requests a passport token and submits chat attempts through /chat-messages', async () => {
    const passportToken = 'chat-passport-token'
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ access_token: passportToken }),
    })

    await submitChallengeAttempt('challenge-123', 'app-abc', 'site-code-xyz', 'chat', 'solve this')

    expect(fetchMock).toHaveBeenCalledWith(`${PUBLIC_API_PREFIX}/passport`, {
      method: 'GET',
      headers: {
        'X-App-Code': 'site-code-xyz',
      },
      credentials: 'include',
    })

    expect(mockedPostPublic).toHaveBeenCalledWith('/chat-messages', expect.objectContaining({
      body: {
        query: 'solve this',
        inputs: {},
        response_mode: 'blocking',
        conversation_id: '',
      },
    }))

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

    await submitChallengeAttempt('challenge-456', 'app-def', 'site-code-xyz', 'workflow', 'my answer')

    expect(fetchMock).toHaveBeenCalledWith(`${PUBLIC_API_PREFIX}/passport`, {
      method: 'GET',
      headers: {
        'X-App-Code': 'site-code-xyz',
      },
      credentials: 'include',
    })

    expect(mockedPostPublic).toHaveBeenCalledWith('/workflows/run', expect.objectContaining({
      body: {
        inputs: {
          user_prompt: 'my answer',
        },
        response_mode: 'blocking',
      },
    }))

    const storedToken = JSON.parse(localStorage.getItem('token') || '{}')
    expect(storedToken['challenge-456'].DEFAULT).toBe(passportToken)
  })
})
