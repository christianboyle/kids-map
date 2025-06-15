import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Icon, DivIcon } from 'leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import type { ActivityCategory } from '../App'
import { searchPlaces, CATEGORY_TYPE_MAPPING, type Place } from '../services/placesService'
import LocationControl from './LocationControl'
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

// User location icon
const createUserLocationIcon = () => {
  const svgString = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="8" fill="#2196f3" stroke="white" stroke-width="3"/>
    <circle cx="12" cy="12" r="3" fill="white"/>
  </svg>`
  
  return new Icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  })
}

// Simple cluster icon creation using DivIcon with custom CSS
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount()
  let size = 32
  let className = 'custom-cluster-small'
  
  // Progressive sizing based on count
  if (count < 10) {
    size = 32
    className = 'custom-cluster-small'
  } else if (count < 100) {
    size = 38
    className = 'custom-cluster-medium'
  } else {
    size = 44
    className = 'custom-cluster-large'
  }
  
  return new DivIcon({
    html: `<div class="custom-cluster-inner">${count}</div>`,
    className: className,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  })
}

// Map controller component to handle programmatic map operations
function MapController({ userLocation }: { userLocation: [number, number] | null }) {
  const map = useMap()
  
  useEffect(() => {
    if (userLocation) {
      map.setView(userLocation, 15, { animate: true })
    }
  }, [map, userLocation])
  
  return null
}

export default function MapView({ activities, searchQuery }: MapViewProps) {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)

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

  const handleLocationFound = (lat: number, lng: number) => {
    setUserLocation([lat, lng])
  }

  return (
    <div className="map-view">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-message">Loading places...</div>
        </div>
      )}
      
      <LocationControl onLocationFound={handleLocationFound} />
      
      <MapContainer
        center={KC_CENTER}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <MapController userLocation={userLocation} />
        
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
        />
        
        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={createUserLocationIcon()}
          >
            <Popup>
              <div>
                <h3>📍 Your Location</h3>
                <p>You are here!</p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Enhanced cluster group for all place markers */}
        <MarkerClusterGroup
          iconCreateFunction={createClusterCustomIcon}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
          spiderfyOnMaxZoom={true}
          removeOutsideVisibleBounds={true}
          animate={true}
          animateAddingMarkers={false}
          disableClusteringAtZoom={18}
          maxClusterRadius={function(zoom: number) {
            // Dynamic clustering radius based on zoom level
            // Wider radius at lower zoom levels, tighter at higher zoom
            return zoom < 10 ? 120 : zoom < 15 ? 80 : 40;
          }}
          spiderfyDistanceMultiplier={1.5}
          chunkedLoading={true}
        >
          {places.map((place) => {
            // Find activity by matching place type to our category mapping
            const activity = activities.find(a => 
              CATEGORY_TYPE_MAPPING[a.id as keyof typeof CATEGORY_TYPE_MAPPING] === place.type
            )
            if (!activity) return null
            
            // Validate coordinates to prevent clustering issues
            const lat = place.coordinates[0]
            const lng = place.coordinates[1]
            if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
              console.warn('Invalid coordinates for place:', place.name, place.coordinates)
              return null
            }
            
            // Create a more robust unique key
            const uniqueKey = `marker-${place.id}-${activity.id}-${Math.round(lat * 10000)}-${Math.round(lng * 10000)}`
            
            return (
              <Marker
                key={uniqueKey}
                position={[lat, lng]}
                icon={createCustomIcon(activity.color, activity.icon)}
                riseOnHover={true}
              >
                <Popup closeButton={true} autoClose={false}>
                  <div style={{ minWidth: '200px' }}>
                    <h3 style={{ margin: '0 0 8px 0', color: activity.color }}>
                      {activity.icon} {place.name}
                    </h3>
                    {place.description && (
                      <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                        {place.description}
                      </p>
                    )}
                    <p style={{ margin: '0 0 4px 0', fontSize: '13px' }}>
                      <strong>📍 Address:</strong> {place.address}
                    </p>
                    <p style={{ margin: '0', fontSize: '13px' }}>
                      <strong>🏷️ Type:</strong> {activity.name}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  )
} 