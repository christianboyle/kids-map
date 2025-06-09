import { useState } from 'react'
import Sidebar from './components/Sidebar'
import MapView from './components/MapView'
import './App.css'

export interface ActivityCategory {
  id: string
  name: string
  icon: string
  color: string
  enabled: boolean
}

function App() {
  const [activities, setActivities] = useState<ActivityCategory[]>([
    { id: 'playgrounds', name: 'Playgrounds', icon: '🛝', color: '#ff6b6b', enabled: true },
    { id: 'parks', name: 'Parks', icon: '🌳', color: '#51cf66', enabled: true },
    { id: 'museums', name: 'Museums', icon: '🏛️', color: '#748ffc', enabled: true },
    { id: 'galleries', name: 'Galleries', icon: '🎨', color: '#ff8cc8', enabled: true },
    { id: 'science', name: 'Science Centers', icon: '🔬', color: '#69db7c', enabled: true },
    { id: 'planetariums', name: 'Planetariums', icon: '🌟', color: '#ffd43b', enabled: true },
  ])

  const [searchQuery, setSearchQuery] = useState('')

  const toggleActivity = (id: string) => {
    setActivities(prev => 
      prev.map(activity => 
        activity.id === id 
          ? { ...activity, enabled: !activity.enabled }
          : activity
      )
    )
  }

  const toggleAll = () => {
    const someEnabled = activities.some(activity => activity.enabled)
    setActivities(prev => 
      prev.map(activity => ({ ...activity, enabled: !someEnabled }))
    )
  }

  return (
    <div className="app">
      <Sidebar 
        activities={activities}
        searchQuery={searchQuery}
        onToggleActivity={toggleActivity}
        onToggleAll={toggleAll}
        onSearchChange={setSearchQuery}
      />
      <MapView 
        activities={activities.filter(a => a.enabled)}
        searchQuery={searchQuery}
      />
    </div>
  )
}

export default App
