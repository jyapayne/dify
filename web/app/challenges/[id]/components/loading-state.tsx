'use client'

type LoadingStateProps = {
  message: string
}

export default function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className='flex min-h-screen items-center justify-center bg-components-panel-bg'>
      <div className='text-text-tertiary'>{message}</div>
    </div>
  )
}
