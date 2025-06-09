import { useState } from 'react'
import './LocationControl.css'

interface LocationControlProps {
  onLocationFound: (lat: number, lng: number) => void
}

export default function LocationControl({ onLocationFound }: LocationControlProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLocationRequest = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    setIsLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setIsLoading(false)
        onLocationFound(latitude, longitude)
      },
      (error) => {
        setIsLoading(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError('Location access denied by user')
            break
          case error.POSITION_UNAVAILABLE:
            setError('Location information unavailable')
            break
          case error.TIMEOUT:
            setError('Location request timed out')
            break
          default:
            setError('An unknown error occurred')
            break
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000 // 10 minutes
      }
    )
  }

  return (
    <div className="location-control">
      <button
        className={`location-button ${isLoading ? 'loading' : ''}`}
        onClick={handleLocationRequest}
        disabled={isLoading}
        title="Find my location"
      >
        {isLoading ? (
          <span className="loading-spinner">📍</span>
        ) : (
          <span className="location-icon">📍</span>
        )}
      </button>
      {error && (
        <div className="location-error">
          {error}
        </div>
      )}
    </div>
  )
} 