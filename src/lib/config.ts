// Configuration file to ensure correct API URL
export const API_CONFIG = {
  // Use absolute URL for production server
  BASE_URL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'http://100.100.48.54/api' : '/api'),
  TIMEOUT: 10000,
};

// Debug function to log API calls
export const debugApiCall = (endpoint: string, data: any) => {
  console.log('API Call Debug - Endpoint:', endpoint);
  console.log('API Call Debug - Data:', data);
  console.log('API Call Debug - Timestamp:', new Date().toISOString());
};
