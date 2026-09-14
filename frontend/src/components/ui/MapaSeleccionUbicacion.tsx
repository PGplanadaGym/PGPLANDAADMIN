import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const CENTRO_POR_DEFECTO: [number, number] = [-0.1807, -78.4678] // Quito, Ecuador

interface Props {
  valor: { lat: number; lng: number } | null
  onCambiar: (lat: number, lng: number) => void
  className?: string
}

export function MapaSeleccionUbicacion({ valor, onCambiar, className = '' }: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<L.Map | null>(null)
  const marcadorRef = useRef<L.Marker | null>(null)
  const onCambiarRef = useRef(onCambiar)
  onCambiarRef.current = onCambiar

  useEffect(() => {
    if (!contenedorRef.current || mapaRef.current) return

    const centroInicial: [number, number] = valor ? [valor.lat, valor.lng] : CENTRO_POR_DEFECTO
    const mapa = L.map(contenedorRef.current).setView(centroInicial, valor ? 15 : 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapa)

    const colocarMarcador = (lat: number, lng: number) => {
      if (marcadorRef.current) {
        marcadorRef.current.setLatLng([lat, lng])
      } else {
        marcadorRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapa)
        marcadorRef.current.on('dragend', () => {
          const pos = marcadorRef.current!.getLatLng()
          onCambiarRef.current(pos.lat, pos.lng)
        })
      }
    }

    if (valor) colocarMarcador(valor.lat, valor.lng)

    mapa.on('click', (e: L.LeafletMouseEvent) => {
      colocarMarcador(e.latlng.lat, e.latlng.lng)
      onCambiarRef.current(e.latlng.lat, e.latlng.lng)
    })

    mapaRef.current = mapa

    return () => {
      mapa.remove()
      mapaRef.current = null
      marcadorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <div
        ref={contenedorRef}
        className={`rounded-lg border border-[var(--color-border)] ${className}`}
        style={{ height: 300 }}
      />
      <p className="mt-1 text-xs text-[var(--color-text-faint)]">
        Haz clic en el mapa para marcar la ubicación (o arrastra el marcador para ajustarla).
      </p>
    </div>
  )
}
