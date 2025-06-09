// Static places service for loading and searching KC places data

export interface Place {
  id: string
  name: string
  type: string
  coordinates: [number, number]
  description: string
  address: string
}

let placesCache: Place[] | null = null;

export async function loadPlaces(): Promise<Place[]> {
  if (placesCache) {
    return placesCache;
  }

  try {
    // Import the static places data
    const placesModule = await import('../places.json');
    placesCache = placesModule.default as Place[];
    return placesCache;
  } catch (error) {
    console.error('Error loading places data:', error);
    return [];
  }
}

export async function getPlacesByTypes(types: string[]): Promise<Place[]> {
  const allPlaces = await loadPlaces();

  // Filter and deduplicate places
  const filteredPlaces = allPlaces.filter(place => {
    // Only include places that match the requested types
    if (!types.includes(place.type)) return false;

    // Filter out places with poor data quality
    if (!place.name || place.name.trim() === '' || place.name === 'Unknown') return false;
    if (!place.coordinates || place.coordinates.length !== 2) return false;
    if (!place.coordinates[0] || !place.coordinates[1]) return false;

    return true;
  });

  // Remove duplicates based on name and coordinates (within ~100m)
  const uniquePlaces: Place[] = [];
  for (const place of filteredPlaces) {
    const isDuplicate = uniquePlaces.some(existing => {
      if (existing.name === place.name) return true;

      // Check if coordinates are very close (roughly 100m)
      const latDiff = Math.abs(existing.coordinates[0] - place.coordinates[0]);
      const lngDiff = Math.abs(existing.coordinates[1] - place.coordinates[1]);
      return latDiff < 0.001 && lngDiff < 0.001;
    });

    if (!isDuplicate) {
      uniquePlaces.push(place);
    }
  }

  return uniquePlaces;
}

export async function searchPlaces(query: string, types?: string[]): Promise<Place[]> {
  if (!query.trim()) {
    return types ? await getPlacesByTypes(types) : await getPlacesByTypes(['playground', 'park', 'museum', 'gallery', 'science_center', 'planetarium']);
  }

  const basePlaces = types ? await getPlacesByTypes(types) : await getPlacesByTypes(['playground', 'park', 'museum', 'gallery', 'science_center', 'planetarium']);
  const searchQuery = query.toLowerCase();

  return basePlaces.filter(place =>
    place.name.toLowerCase().includes(searchQuery) ||
    place.description.toLowerCase().includes(searchQuery) ||
    place.address.toLowerCase().includes(searchQuery)
  );
}

// Map our app category names to the place types in the JSON
export const CATEGORY_TYPE_MAPPING = {
  playgrounds: 'playground',
  parks: 'park',
  museums: 'museum',
  galleries: 'gallery',
  science: 'science_center',
  planetariums: 'planetarium'
}; 