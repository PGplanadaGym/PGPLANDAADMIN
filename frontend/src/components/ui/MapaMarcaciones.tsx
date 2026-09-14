import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Vite no resuelve bien las rutas relativas del ícono por defecto de Leaflet
// dentro de un bundle; se reemplazan explícitamente por las importadas.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const CENTRO_POR_DEFECTO: [number, number] = [-0.1807, -78.4678] // Quito, Ecuador

export interface PuntoMapa {
  id: string
  lat: number
  lng: number
  titulo: string
  subtitulo?: string
}

function construirPopup(punto: PuntoMapa): HTMLElement {
  const contenedor = document.createElement('div')

  const titulo = document.createElement('strong')
  titulo.textContent = punto.titulo
  contenedor.appendChild(titulo)

  if (punto.subtitulo) {
    contenedor.appendChild(document.createElement('br'))
    const subtitulo = document.createElement('span')
    subtitulo.textContent = punto.subtitulo
    contenedor.appendChild(subtitulo)
  }

  return contenedor
}

interface Props {
  puntos: PuntoMapa[]
  seleccionadoId?: string | null
  onSeleccionar?: (id: string) => void
  className?: string
}

export function MapaMarcaciones({ puntos, seleccionadoId, onSeleccionar, className = '' }: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<L.Map | null>(null)
  const capaMarcadoresRef = useRef<L.LayerGroup | null>(null)
  const marcadoresPorIdRef = useRef<Map<string, L.Marker>>(new Map())

  useEffect(() => {
    if (!contenedorRef.current || mapaRef.current) return

    const mapa = L.map(contenedorRef.current).setView(CENTRO_POR_DEFECTO, 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapa)

    mapaRef.current = mapa
    capaMarcadoresRef.current = L.layerGroup().addTo(mapa)

    return () => {
      mapa.remove()
      mapaRef.current = null
      capaMarcadoresRef.current = null
    }
  }, [])

  useEffect(() => {
    const mapa = mapaRef.current
    const capaMarcadores = capaMarcadoresRef.current
    if (!mapa || !capaMarcadores) return

    capaMarcadores.clearLayers()
    marcadoresPorIdRef.current.clear()

    puntos.forEach((punto) => {
      const marcador = L.marker([punto.lat, punto.lng])
        .addTo(capaMarcadores)
        .bindPopup(construirPopup(punto))
      if (onSeleccionar) {
        marcador.on('click', () => onSeleccionar(punto.id))
      }
      marcadoresPorIdRef.current.set(punto.id, marcador)
    })

    if (puntos.length > 0) {
      const bounds = L.latLngBounds(puntos.map((p) => [p.lat, p.lng]))
      mapa.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 })
    } else {
      mapa.setView(CENTRO_POR_DEFECTO, 12)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puntos])

  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa || !seleccionadoId) return

    const marcador = marcadoresPorIdRef.current.get(seleccionadoId)
    if (!marcador) return

    mapa.setView(marcador.getLatLng(), 17)
    marcador.openPopup()
  }, [seleccionadoId])

  return (
    <div
      ref={contenedorRef}
      className={`rounded-lg border border-[var(--color-border)] ${className}`}
      style={{ height: 360 }}
    />
  )
}
