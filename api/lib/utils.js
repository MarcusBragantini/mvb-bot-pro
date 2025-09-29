// Utility functions for license management

function generateLicenseKey(type = 'FREE') {
  const prefix = type.toUpperCase().substring(0, 4);
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `${prefix}-${timestamp}-${random}`;
}

function validateLicenseFormat(licenseKey) {
  // Basic format validation: PREFIX-TIMESTAMP-RANDOM
  const pattern = /^[A-Z]{3,4}-[A-Z0-9]{6,}-[A-Z0-9]{6}$/;
  return pattern.test(licenseKey);
}

function calculateExpiryDate(durationDays) {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + durationDays);
  return expiry.toISOString();
}

function isLicenseExpired(expiresAt) {
  return new Date() > new Date(expiresAt);
}

function getDaysRemaining(expiresAt) {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

module.exports = {
  generateLicenseKey,
  validateLicenseFormat,
  calculateExpiryDate,
  isLicenseExpired,
  getDaysRemaining
};