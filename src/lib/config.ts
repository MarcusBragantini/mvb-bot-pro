// Configuration file to ensure correct API URL
export const API_CONFIG = {
  // Use relative URL to avoid CORS issues
  BASE_URL: '/api',
  TIMEOUT: 10000,
};

// Debug function to log API calls
export const debugApiCall = (endpoint: string, data: any) => {
  console.log('API Call Debug - Endpoint:', endpoint);
  console.log('API Call Debug - Data:', data);
  console.log('API Call Debug - Timestamp:', new Date().toISOString());
};
