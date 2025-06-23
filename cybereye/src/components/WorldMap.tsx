'use client'
import type { FeatureCollection, Geometry } from 'geojson'
import * as d3 from 'd3'
import { useEffect, useRef } from 'react'

type GeoIP = {
  ip: string
  lat: number
  lon: number
  city: string
  country: string
}

type PacketData = {
  type: 'packet'
  src: GeoIP
  dst: GeoIP
  timestamp: number
}

export default function WorldMap() {
  const ref = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()

    const width = 1000
    const height = 600

    const projection = d3.geoMercator().scale(150).translate([width / 2, height / 2])
    const path = d3.geoPath().projection(projection)

    const g = svg.append('g') // Base map
    const tracerGroup = svg.append('g') // Tracer lines

    // Load map
    d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
    .then((data: FeatureCollection<Geometry>) => {
        g.selectAll('path')
          .data(data.features)
          .enter()
          .append('path')
          .attr('d', path)
          .attr('fill', '#111')
          .attr('stroke', '#0ff')
          .attr('stroke-width', 0.3)
      })

    // Zoom behavior
    const zoom = d3.zoom().scaleExtent([0.5, 8]).on('zoom', (event) => {
      g.attr('transform', event.transform)
      tracerGroup.attr('transform', event.transform)
    })

    svg.call(zoom)

    // WebSocket connection to local backend
    const socket = new WebSocket('ws://localhost:8080')

    socket.onmessage = (event) => {
      const data: PacketData = JSON.parse(event.data)
      if (!data?.src || !data?.dst) return

      const srcCoord = projection([data.src.lon, data.src.lat])
      const dstCoord = projection([data.dst.lon, data.dst.lat])

      if (!srcCoord || !dstCoord) return

      const line = tracerGroup
        .append('line')
        .attr('x1', srcCoord[0])
        .attr('y1', srcCoord[1])
        .attr('x2', srcCoord[0])
        .attr('y2', srcCoord[1])
        .attr('stroke', '#ff00ff')
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round')
        .attr('opacity', 1)

      line
        .transition()
        .duration(600)
        .attr('x2', dstCoord[0])
        .attr('y2', dstCoord[1])
        .transition()
        .duration(600)
        .attr('opacity', 0)
        .remove()
    }

    socket.onerror = (e) => {
      console.error('WebSocket error:', e)
    }

    return () => {
      socket.close()
    }
  }, [])

  return (
    <div className="w-full h-full bg-black flex justify-center items-center">
      <svg
        ref={ref}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        viewBox="0 0 1000 600"
      />
    </div>
  )
}
