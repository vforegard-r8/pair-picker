// Authentication configuration
module.exports = {
  // Multi-team support
  // Each team creates their own team name and password
  // Teams are isolated from each other - separate data files
  multiTeam: {
    enabled: true, // Enable multi-team mode
    requirePassword: true, // Require password for team access
    minPasswordLength: 4 // Minimum password length for new teams
  },

  // Simple username/password (legacy - for single team)
  simpleAuth: {
    enabled: false, // Set to true for single-team mode
    username: process.env.AUTH_USERNAME || 'rise8',
    password: process.env.AUTH_PASSWORD || 'pair-picker'
  },

  // Allowed email domains (for Google OAuth - when enabled)
  allowedDomains: ['rise8.us'],

  // Additional specific email addresses (for Google OAuth - when enabled)
  allowedEmails: [],

  // Session secret (should be set via environment variable in production)
  sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret',

  // Google OAuth credentials (only used when simpleAuth.enabled = false and multiTeam.enabled = false)
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback'
  }
};
