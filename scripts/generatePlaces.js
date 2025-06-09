#!/usr/bin/env node

import fs from 'fs';
import https from 'https';

// Kansas City bounding box (tighter focus on metro area)
const KC_BBOX = {
  south: 39.0,
  west: -94.7,
  north: 39.2,
  east: -94.4
};

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
};

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function generateDescription(tags) {
  const descriptions = [];
  
  if (tags.leisure) {
    descriptions.push(`${tags.leisure.replace('_', ' ')}`);
  }
  if (tags.tourism) {
    descriptions.push(`${tags.tourism.replace('_', ' ')}`);
  }
  if (tags.amenity) {
    descriptions.push(`${tags.amenity.replace('_', ' ')}`);
  }
  if (tags.sport) {
    descriptions.push(`Sports: ${tags.sport}`);
  }
  if (tags.playground) {
    descriptions.push(`Playground type: ${tags.playground}`);
  }
  
  return descriptions.join(' • ') || '';
}

function generateAddress(tags) {
  const parts = [];
  
  if (tags['addr:housenumber'] && tags['addr:street']) {
    parts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`);
  } else if (tags['addr:street']) {
    parts.push(tags['addr:street']);
  }
  
  if (tags['addr:city']) {
    parts.push(tags['addr:city']);
  } else {
    parts.push('Kansas City');
  }
  
  if (tags['addr:state']) {
    parts.push(tags['addr:state']);
  } else {
    parts.push('MO');
  }
  
  if (tags['addr:postcode']) {
    parts.push(tags['addr:postcode']);
  }
  
  return parts.join(', ');
}

async function fetchPlacesByCategory(category) {
  const tags = ACTIVITY_TAG_MAPPING[category];
  if (!tags) return [];

  // Build Overpass query for multiple tags
  const tagQueries = tags.map(tag => {
    const [key, value] = tag.split('=');
    return `node["${key}"="${value}"](${KC_BBOX.south},${KC_BBOX.west},${KC_BBOX.north},${KC_BBOX.east});`;
  }).join('\n');

  const query = `
    [out:json][timeout:25];
    (
      ${tagQueries}
      way["leisure"="playground"](${KC_BBOX.south},${KC_BBOX.west},${KC_BBOX.north},${KC_BBOX.east});
      way["leisure"="park"](${KC_BBOX.south},${KC_BBOX.west},${KC_BBOX.north},${KC_BBOX.east});
      relation["leisure"="park"](${KC_BBOX.south},${KC_BBOX.west},${KC_BBOX.north},${KC_BBOX.east});
    );
    out center tags;
  `;

  return new Promise((resolve, reject) => {
    const postData = query;
    
    const options = {
      hostname: 'overpass-api.de',
      port: 443,
      path: '/api/interpreter',
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          let filteredElements = result.elements
            .filter((element) => element.tags && element.tags.name);

          // Special filtering for planetariums to reduce false positives
          if (category === 'planetariums') {
            filteredElements = filteredElements.filter((element) => {
              const name = element.tags.name?.toLowerCase() || '';
              const description = element.tags.description?.toLowerCase() || '';
              return name.includes('planetarium') || 
                     description.includes('planetarium') ||
                     element.tags.amenity === 'planetarium';
            });
          }

          console.log(`Found ${filteredElements.length} ${category} candidates`);

          const places = filteredElements
            .map((element) => ({
              id: element.id.toString(),
              name: element.tags.name || 'Unknown',
              type: category.replace(/s$/, ''), // Remove plural (museums -> museum)
              coordinates: [
                element.lat || element.center?.lat,
                element.lon || element.center?.lon
              ],
              description: generateDescription(element.tags),
              address: generateAddress(element.tags)
            }))
            .filter((place) => place.coordinates[0] && place.coordinates[1])
            .slice(0, 50); // Limit to 50 results per category

          console.log(`Returning ${places.length} ${category} places`);
          resolve(places);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function generateAllPlaces() {
  console.log('Fetching places data for Kansas City...');
  
  const allPlaces = [];
  const categories = Object.keys(ACTIVITY_TAG_MAPPING);
  
  for (const category of categories) {
    try {
      console.log(`\nFetching ${category}...`);
      const places = await fetchPlacesByCategory(category);
      allPlaces.push(...places);
      
      // Add delay between requests to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error fetching ${category}:`, error);
    }
  }
  
  console.log(`\nTotal places found: ${allPlaces.length}`);
  
  // Save to file
  const outputPath = './src/places.json';
  fs.writeFileSync(outputPath, JSON.stringify(allPlaces, null, 2));
  console.log(`Places data saved to ${outputPath}`);
}

// Run the script
generateAllPlaces().catch(console.error); 