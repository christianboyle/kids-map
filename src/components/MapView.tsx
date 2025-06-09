import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'
import type { ActivityCategory } from '../App'
import { searchPlaces, CATEGORY_TYPE_MAPPING, type Place } from '../services/placesService'
import 'leaflet/dist/leaflet.css'
import './MapView.css'

interface MapViewProps {
  activities: ActivityCategory[]
  searchQuery: string
}

// Kansas City coordinates
const KC_CENTER: [number, number] = [39.0997, -94.5786]

// Create custom icons for different activity types
const createCustomIcon = (color: string, emoji: string) => {
  // Create SVG with emoji using proper Unicode encoding
  const svgString = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="16" y="22" text-anchor="middle" font-size="16" font-family="Arial, sans-serif">${emoji}</text>
  </svg>`
  
  return new Icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  })
}

export default function MapView({ activities, searchQuery }: MapViewProps) {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)

  const enabledActivityIds = activities.map(a => a.id)

  useEffect(() => {
    const loadPlaces = async () => {
      setLoading(true)
      try {
        // Map activity IDs to place types
        const placeTypes = enabledActivityIds.map(id => 
          CATEGORY_TYPE_MAPPING[id as keyof typeof CATEGORY_TYPE_MAPPING]
        ).filter(Boolean)
        
        const fetchedPlaces = await searchPlaces(searchQuery, placeTypes)
        setPlaces(fetchedPlaces)
      } catch (error) {
        console.error('Error loading places:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPlaces()
  }, [enabledActivityIds.join(','), searchQuery])

  return (
    <div className="map-view">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-message">Loading places...</div>
        </div>
      )}
      <MapContainer
        center={KC_CENTER}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
        />
        
        {places.map((place, index) => {
          // Find activity by matching place type to our category mapping
          const activity = activities.find(a => 
            CATEGORY_TYPE_MAPPING[a.id as keyof typeof CATEGORY_TYPE_MAPPING] === place.type
          )
          if (!activity) return null
          
          // Create a unique key combining place ID and coordinates to avoid duplicates
          const uniqueKey = `${place.id}-${place.coordinates[0]}-${place.coordinates[1]}-${index}`
          
          return (
            <Marker
              key={uniqueKey}
              position={[place.coordinates[0], place.coordinates[1]]}
              icon={createCustomIcon(activity.color, activity.icon)}
            >
              <Popup>
                <div>
                  <h3>{place.name}</h3>
                  {place.description && <p>{place.description}</p>}
                  <p><strong>Address:</strong> {place.address}</p>
                  <p><strong>Type:</strong> {activity.name}</p>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
} 