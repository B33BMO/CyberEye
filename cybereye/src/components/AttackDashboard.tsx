'use client'

import { useEffect, useState } from 'react'

type Attack = {
  timestamp: string
  attacker: string
  attackerIP: string
  attackerGeo: string
  targetGeo: string
  attackType: string
  port: number
}

export default function AttackDashboard() {
  const [liveAttacks, setLiveAttacks] = useState<Attack[]>([])

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080')

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data)
        if (data.type === 'packet') {
          const now = new Date().toLocaleTimeString('en-US', { hour12: false })

          const newAttack: Attack = {
            timestamp: now,
            attacker: data.src.country || 'Unknown',
            attackerIP: data.src.ip,
            attackerGeo: `${data.src.city}, ${data.src.country}`,
            targetGeo: `${data.dst.city}, ${data.dst.country}`,
            attackType: 'unknown',
            port: Math.floor(Math.random() * 65535),
          }

          setLiveAttacks((prev) => [newAttack, ...prev.slice(0, 49)])
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e)
      }
    }

    ws.onerror = (e) => {
      console.error('WebSocket error:', e)
    }

    return () => ws.close()
  }, [])

  return (
    <div className="w-full bg-black text-teal-300 px-4 py-3 font-mono text-sm grid grid-cols-4 gap-4 border-t border-teal-800">
      <div>
        <h3 className="text-lg font-bold text-teal-500 mb-2">Attack Origins</h3>
        <div className="italic text-gray-600">Live data coming soon...</div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-teal-500 mb-2">Attack Types</h3>
        <div className="italic text-gray-600">Live data coming soon...</div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-teal-500 mb-2">Attack Targets</h3>
        <div className="italic text-gray-600">Live data coming soon...</div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-teal-500 mb-2">Live Attacks</h3>
        <div className="overflow-y-auto max-h-64 pr-1">
          {liveAttacks.map((a, i) => (
            <div key={i} className="mb-2 border-b border-teal-800 pb-1">
              <div className="flex justify-between">
                <span className="text-yellow-300">{a.timestamp}</span>
                <span className="text-pink-400">{a.attackerIP}</span>
              </div>
              <div>
                {a.attackerGeo} ➜ {a.targetGeo}
              </div>
              <div className="text-sm italic">{a.attackType} on port {a.port}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
