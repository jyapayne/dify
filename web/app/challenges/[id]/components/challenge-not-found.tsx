'use client'

type ChallengeNotFoundStateProps = {
  message: string
}

export default function ChallengeNotFoundState({ message }: ChallengeNotFoundStateProps) {
  return (
    <div className='flex min-h-screen items-center justify-center bg-components-panel-bg'>
      <div className='text-text-secondary'>{message}</div>
    </div>
  )
}
