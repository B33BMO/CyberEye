const WebSocket = require('ws')
const { spawn } = require('child_process')
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))

const wss = new WebSocket.Server({ port: 8080 })
console.log('[+] WebSocket running at ws://localhost:8080')

// In-memory cache + cooldown maps
const ipCache = new Map()
const cooldown = new Map()

function isBogusIP(ip) {
  return (
    !ip ||
    ip === '127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.') ||
    ip.startsWith('224.') || // multicast
    ip.startsWith('0.') ||
    ip.split('.').length !== 4
  )
}

function isOnCooldown(ip) {
  const now = Date.now()
  const last = cooldown.get(ip) || 0
  if (now - last < 3000) return true // 3 second cooldown
  cooldown.set(ip, now)
  return false
}

async function geoLookup(ip) {
  if (isBogusIP(ip)) {
    console.warn(`GeoIP lookup skipped for ${ip}: private/multicast/bogus`)
    return null
  }

  if (isOnCooldown(ip)) return null
  if (ipCache.has(ip)) return ipCache.get(ip)

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}`)
    if (!res.ok) {
      console.warn(`GeoIP lookup failed for ${ip}: HTTP ${res.status}`)
      return null
    }

    const text = await res.text()

    if (!text || !text.trim().startsWith('{')) {
      console.warn(`Empty or invalid response from GeoIP for IP ${ip}`)
      return null
    }

    const data = JSON.parse(text)

    if (data.status !== 'success') {
      console.warn(`GeoIP lookup failed for ${ip}: ${data.message || 'Unknown error'}`)
      return null
    }

    const geo = {
      ip,
      lat: data.lat,
      lon: data.lon,
      city: data.city,
      country: data.country,
    }

    ipCache.set(ip, geo)
    return geo

  } catch (e) {
    console.error('GeoIP error:', e)
    return null
  }
}

function broadcast(obj) {
  const json = JSON.stringify(obj)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json)
    }
  })
}

// Start tshark on Wi-Fi (en0)
const tshark = spawn('tshark', [
  '-i', 'en0',
  '-T', 'fields',
  '-e', 'ip.src',
  '-e', 'ip.dst',
  '-Y', 'ip'
])

tshark.stdout.on('data', async (data) => {
  const lines = data.toString().split('\n')

  for (const line of lines) {
    const [src, dst] = line.trim().split('\t')
    if (!src || !dst) continue

    const srcGeo = await geoLookup(src)
    const dstGeo = await geoLookup(dst)

    if (!srcGeo || !dstGeo) continue

    broadcast({
      type: 'packet',
      src: srcGeo,
      dst: dstGeo,
      timestamp: Date.now(),
    })
  }
})
