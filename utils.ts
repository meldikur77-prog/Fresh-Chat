
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

/**
 * Compresses an image file to a smaller Base64 string.
 * Resizes to max 800px width/height and quality 0.7.
 */
export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const elem = document.createElement('canvas');
        const maxWidth = 800;
        const maxHeight = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        elem.width = width;
        elem.height = height;
        const ctx = elem.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 0.7 quality
        resolve(elem.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Calculates Level based on XP.
 * Formula: Level = floor(XP / 100) + 1
 */
export const calculateLevel = (xp: number = 0): number => {
  return Math.floor(xp / 100) + 1;
};

/**
 * Returns the progress (0-100) towards the next level.
 */
export const calculateLevelProgress = (xp: number = 0): number => {
  return xp % 100;
};

/**
 * Check if two timestamps are on consecutive days (for streaks)
 */
export const isConsecutiveDay = (lastTime: number, currentTime: number): boolean => {
  const oneDay = 24 * 60 * 60 * 1000;
  const lastDate = new Date(lastTime).setHours(0,0,0,0);
  const currentDate = new Date(currentTime).setHours(0,0,0,0);
  
  const diff = currentDate - lastDate;
  return diff === oneDay; // Exactly 1 day difference
};

export const isSameDay = (lastTime: number, currentTime: number): boolean => {
  const lastDate = new Date(lastTime).setHours(0,0,0,0);
  const currentDate = new Date(currentTime).setHours(0,0,0,0);
  return lastDate === currentDate;
};