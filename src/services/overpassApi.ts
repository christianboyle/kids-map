// OpenStreetMap Overpass API service for fetching kid-friendly places

export interface OSMPlace {
  id: number
  name: string
  lat: number
  lng: number
  type: string
  tags: Record<string, string>
  description?: string
}

// Mapping of our activity categories to OSM tags
const ACTIVITY_TAG_MAPPING = {
  playgrounds: [
    'leisure=playground'
  ],
  parks: [
    'leisure=park',
    'leisure=water_park',
    'leisure=swimming_pool',
    'tourism=picnic_site',
    'natural=beach'
  ],
  museums: [
    'tourism=museum',
    'amenity=library'
  ],
  galleries: [
    'tourism=gallery'
  ],
  science: [
    'amenity=science_center',
    'tourism=science_center'
  ],
  planetariums: [
    'amenity=planetarium'
  ]
}

// Kansas City bounding box (tighter focus on metro area)
const KC_BBOX = {
  south: 39.0,
  west: -94.7,
  north: 39.2,
  east: -94.4
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

export async function fetchPlacesByCategory(category: string): Promise<OSMPlace[]> {
  const tags = ACTIVITY_TAG_MAPPING[category as keyof typeof ACTIVITY_TAG_MAPPING]
  if (!tags) return []

  // Build Overpass query for multiple tags
  const tagQueries = tags.map(tag => {
    const [key, value] = tag.split('=')
    return `node["${key}"="${value}"](${KC_BBOX.south},${KC_BBOX.west},${KC_BBOX.north},${KC_BBOX.east});`
  }).join('\n')

  const query = `
    [out:json][timeout:25];
    (
      ${tagQueries}
      way["leisure"="playground"](${KC_BBOX.south},${KC_BBOX.west},${KC_BBOX.north},${KC_BBOX.east});
      way["leisure"="park"](${KC_BBOX.south},${KC_BBOX.west},${KC_BBOX.north},${KC_BBOX.east});
      relation["leisure"="park"](${KC_BBOX.south},${KC_BBOX.west},${KC_BBOX.north},${KC_BBOX.east});
    );
    out center tags;
  `

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: query
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    const filteredElements = data.elements
      .filter((element: any) => element.tags && element.tags.name)
      .filter((element: any) => {
        // Special filtering for planetariums to reduce false positives
        if (category === 'planetariums') {
          const name = element.tags.name?.toLowerCase() || ''
          const description = element.tags.description?.toLowerCase() || ''
          return name.includes('planetarium') ||
            description.includes('planetarium') ||
            element.tags.amenity === 'planetarium'
        }
        return true
      })

    // Debug logging for all categories
    console.log(`Found ${filteredElements.length} ${category} candidates:`,
      filteredElements.slice(0, 5).map((e: any) => ({ name: e.tags.name, tags: e.tags })))

    const places = filteredElements
      .map((element: any) => ({
        id: `${category}-${element.id}`, // Make ID unique per category
        name: element.tags.name || 'Unknown',
        lat: element.lat || element.center?.lat,
        lng: element.lon || element.center?.lon,
        type: category,
        tags: element.tags,
        description: generateDescription(element.tags)
      }))
      .filter((place: OSMPlace) => place.lat && place.lng)
      .slice(0, 50) // Limit to 50 results per category

    console.log(`Returning ${places.length} ${category} places`)
    return places
  } catch (error) {
    console.error(`Error fetching ${category} places:`, error)
    return []
  }
}

export async function fetchAllPlaces(enabledCategories: string[]): Promise<OSMPlace[]> {
  const promises = enabledCategories.map(category => fetchPlacesByCategory(category))
  const results = await Promise.all(promises)
  return results.flat()
}

function generateDescription(tags: Record<string, string>): string {
  const descriptions: string[] = []

  if (tags.leisure) {
    descriptions.push(`${tags.leisure.replace('_', ' ')}`)
  }
  if (tags.tourism) {
    descriptions.push(`${tags.tourism.replace('_', ' ')}`)
  }
  if (tags.amenity) {
    descriptions.push(`${tags.amenity.replace('_', ' ')}`)
  }
  if (tags.sport) {
    descriptions.push(`Sports: ${tags.sport}`)
  }
  if (tags.playground) {
    descriptions.push(`Playground type: ${tags.playground}`)
  }

  return descriptions.join(' • ') || 'Kid-friendly location'
} 