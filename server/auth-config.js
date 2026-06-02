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

  // Session secret (should be set via environment variable in production)
  sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret'
};
