import { ElementType, UserData } from '../types';
import { formatLocalDateKey } from './astrologyEngine';

// Pseudo-random number generator seeded by a string
const seededRandom = (seed: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h >>>= 0;
  return () => {
    h = Math.imul(h, 0x48271); // simple LCG
    return ((h >>> 0) / 4294967296);
  };
};

export const getDailyEnergyLevels = (userData?: UserData): Record<ElementType, number> => {
  const today = new Date();
  const dateString = formatLocalDateKey(today);
  
  // Construct a complex seed using User Birth Data + Current Date
  // This simulates the "Astrological Calculation"
  let seed = dateString;
  
  if (userData) {
    seed += `-${formatLocalDateKey(userData.birthDate)}`;
    seed += `-${userData.birthTime}`;
    seed += `-${userData.gender}`;
    seed += `-${userData.location.toLowerCase().trim()}`;
    // Include Name Numerology influence if present
    if (userData.name) {
        seed += `-${userData.name.trim()}`;
    }
  } else {
    // Fallback seed if no user data (shouldn't happen in new flow)
    seed += "-default"; 
  }

  const rng = seededRandom(seed);

  // Base human energy usually hovers around 60-90%
  // We add fluctuation based on the "astrological" seed
  const generateLevel = () => Math.floor(45 + (rng() * 54)); // Range 45 - 99

  return {
    [ElementType.Wood]: generateLevel(),
    [ElementType.Fire]: generateLevel(),
    [ElementType.Earth]: generateLevel(),
    [ElementType.Metal]: generateLevel(),
    [ElementType.Water]: generateLevel(),
  };
};

export const getFormattedDate = (): string => {
  return new Date().toLocaleDateString('zh-CN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
