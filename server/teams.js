const crypto = require('crypto');
const { getDb } = require('./db');

// Hash password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Sanitize team name for use as identifier
function sanitizeTeamName(teamName) {
  return teamName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

// Initialize collections (called on startup)
async function ensureTeamsCollection() {
  const db = await getDb();
  // Collections are created automatically, but we ensure indexes exist
  await db.collection('teams').createIndex({ team: 1 }, { unique: true });
}

// Check if team exists
async function teamExists(teamName) {
  const db = await getDb();
  const sanitized = sanitizeTeamName(teamName);
  const team = await db.collection('teams').findOne({ team: sanitized });
  return !!team;
}

// Create new team
async function createTeam(teamName, password) {
  const db = await getDb();
  const sanitized = sanitizeTeamName(teamName);

  // Check if team already exists
  const existing = await db.collection('teams').findOne({ team: sanitized });
  if (existing) {
    return { success: false, error: 'Team already exists' };
  }

  // Create team document
  const teamDoc = {
    team: sanitized,
    name: teamName,
    passwordHash: hashPassword(password),
    createdAt: new Date()
  };

  try {
    await db.collection('teams').insertOne(teamDoc);
    return { success: true, team: sanitized };
  } catch (error) {
    console.error('[TEAMS] Error creating team:', error);
    return { success: false, error: 'Failed to create team' };
  }
}

// Verify team credentials
async function verifyTeam(teamName, password) {
  const db = await getDb();
  const sanitized = sanitizeTeamName(teamName);
  const team = await db.collection('teams').findOne({ team: sanitized });

  if (!team) {
    return false;
  }

  return team.passwordHash === hashPassword(password);
}

// Get team data collection name
function getTeamCollection(teamName) {
  const sanitized = sanitizeTeamName(teamName);
  return `team_data_${sanitized}`;
}

module.exports = {
  ensureTeamsCollection,
  teamExists,
  createTeam,
  verifyTeam,
  sanitizeTeamName,
  getTeamCollection
};
