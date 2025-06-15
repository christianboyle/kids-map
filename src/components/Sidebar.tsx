import { useEffect, useState } from 'react'
import type { ActivityCategory } from '../App'
import { getPlacesByTypes, CATEGORY_TYPE_MAPPING } from '../services/placesService'
import './Sidebar.css'

interface SidebarProps {
  activities: ActivityCategory[]
  searchQuery: string
  onToggleActivity: (id: string) => void
  onToggleAll: () => void
  onSearchChange: (query: string) => void
}

interface ActivityCounts {
  [key: string]: number
}

export default function Sidebar({ 
  activities, 
  searchQuery, 
  onToggleActivity,
  onToggleAll,
  onSearchChange 
}: SidebarProps) {
  const [activityCounts, setActivityCounts] = useState<ActivityCounts>({})
  const someEnabled = activities.some(activity => activity.enabled)

  // Load place counts for each activity type
  useEffect(() => {
    const loadCounts = async () => {
      const counts: ActivityCounts = {}
      
      for (const activity of activities) {
        const placeType = CATEGORY_TYPE_MAPPING[activity.id as keyof typeof CATEGORY_TYPE_MAPPING]
        if (placeType) {
          const places = await getPlacesByTypes([placeType])
          counts[activity.id] = places.length
        }
      }
      
      setActivityCounts(counts)
    }

    loadCounts()
  }, [activities])
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>KC Kids Map</h1>
        <p className="subtitle">Save your favorite places • Log in</p>
      </div>
      
      <div className="activities-section">
        <div className="activities-header">
          <h3>Activities</h3>
          <div className="master-toggle">
            <label className="activity-label master-toggle-label">
              <input
                type="checkbox"
                checked={someEnabled}
                onChange={onToggleAll}
                className="activity-checkbox"
              />
            </label>
          </div>
        </div>
        {activities.map(activity => (
          <div key={activity.id} className="activity-item">
            <label className="activity-label">
              <div className="activity-left">
                <span className="activity-icon">{activity.icon}</span>
                <span className="activity-name">{activity.name}</span>
                {activityCounts[activity.id] !== undefined && (
                  <span className="activity-count-badge">
                    {activityCounts[activity.id]}
                  </span>
                )}
              </div>
              <input
                type="checkbox"
                checked={activity.enabled}
                onChange={() => onToggleActivity(activity.id)}
                className="activity-checkbox"
              />
            </label>
          </div>
        ))}
      </div>

      <div className="search-section">
        <input
          type="text"
          placeholder="Search places..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="about-section">
        <h3>About This Map</h3>
        <p>
          This map shows kid-friendly places in Kansas City. 
          Filter locations by type using the checkboxes above. 
          Click on a marker to see more details about the location.
        </p>
      </div>

      <div className="attribution">
        <p>Data from OpenStreetMap</p>
        <p>Powered by Leaflet & Overpass API</p>
      </div>
    </div>
  )
} 