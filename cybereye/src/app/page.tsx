import WorldMap from '@/components/WorldMap'
import AttackDashboard from '@/components/AttackDashboard'

export default function Home() {
  return (
    <main className="flex flex-col h-screen bg-black text-white">
      {/* World Map takes up remaining space */}
      <div className="flex-1 relative overflow-hidden">
        <WorldMap />
      </div>

      {/* Dashboard is fixed-height and scrollable if needed */}
      <div className="h-[300px] shrink-0">
        <AttackDashboard />
      </div>
    </main>
  )
}
