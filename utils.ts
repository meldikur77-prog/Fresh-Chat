import { Coordinates } from './types';

/**
 * Calculates the distance between two coordinates in kilometers using the Haversine formula.
 */
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(coord2.latitude - coord1.latitude);
  const dLon = deg2rad(coord2.longitude - coord1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(coord1.latitude)) *
      Math.cos(deg2rad(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return parseFloat(d.toFixed(2)); // Return rounded to 2 decimal places
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

// Generates a random coordinate near a center point (for simulation)
export const generateRandomCoordinate = (center: Coordinates, radiusKm: number): Coordinates => {
  const y0 = center.latitude;
  const x0 = center.longitude;
  const rd = radiusKm / 111.3; // Convert km to degrees roughly

  const u = Math.random();
  const v = Math.random();

  const w = rd * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);

  const newLat = y + y0;
  const newLon = x + x0;

  return {
    latitude: newLat,
    longitude: newLon,
  };
};