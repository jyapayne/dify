import Link from 'next/link'
import { fetchRedBlueChallenges } from '@/service/redBlueChallenges'

export default async function RedBlueChallengesPage() {
  const items = await fetchRedBlueChallenges()
  return (
    <div className="px-6 py-8">
      <h1 className="mb-4 text-xl font-semibold">Red / Blue Challenges</h1>
      <ul className="space-y-2">
        {items.map(i => (
          <li key={i.id} className="rounded border p-3">
            <Link href={`/red-blue-challenges/${i.id}`} className="text-primary hover:underline">
              {i.name}
            </Link>
            {i.description && (
              <p className="mt-1 text-sm text-gray-500">{i.description}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
