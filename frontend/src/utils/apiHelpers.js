// frontend/src/utils/apiHelpers.js

export const unwrapArray = (response, key = null) => {
  // Grab the data envelope
  const payload = response.data.data;
  
  // 1. If it's already an array, perfect, return it.
  if (Array.isArray(payload)) return payload;
  
  // 2. If we passed a specific key (like 'restaurants'), use that.
  if (key && payload[key] && Array.isArray(payload[key])) return payload[key];
  
  // 3. Fallbacks just in case the backend uses generic names
  if (payload?.rows && Array.isArray(payload.rows)) return payload.rows;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  if (payload?.items && Array.isArray(payload.items)) return payload.items;
  
  // 4. If all else fails, return an empty array so the app doesn't crash
  return [];
};

export const unwrapObject = (response, key = null) => {
  const payload = response.data.data;
  if (key && payload[key]) return payload[key];
  return payload;
};
