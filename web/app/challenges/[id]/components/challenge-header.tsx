'use client'

import type { ChallengeDetail } from './types'

type ChallengeHeaderProps = {
  challenge: ChallengeDetail
}

export default function ChallengeHeader({ challenge }: ChallengeHeaderProps) {
  return (
    <div className='mb-8'>
      <h1 className='mb-2 text-3xl font-bold text-text-primary'>{challenge.name}</h1>
      {challenge.description && (
        <p className='text-lg text-text-secondary'>{challenge.description}</p>
      )}
    </div>
  )
}
