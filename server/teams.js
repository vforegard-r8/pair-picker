const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const TEAMS_FILE = path.join(__dirname, '../data/teams.json');

// Ensure teams file exists
async function ensureTeamsFile() {
  try {
    await fs.access(TEAMS_FILE);
  } catch {
    // Create data directory if it doesn't exist
    const dir = path.dirname(TEAMS_FILE);
    await fs.mkdir(dir, { recursive: true });
    // Create the file
    await fs.writeFile(TEAMS_FILE, JSON.stringify({ teams: {} }, null, 2));
  }
}

// Read teams data
async function readTeams() {
  try {
    await ensureTeamsFile();
    const data = await fs.readFile(TEAMS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { teams: {} };
  }
}

// Write teams data
async function writeTeams(data) {
  await fs.writeFile(TEAMS_FILE, JSON.stringify(data, null, 2));
}

// Hash password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Sanitize team name for file system
function sanitizeTeamName(teamName) {
  return teamName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

// Check if team exists
async function teamExists(teamName) {
  const data = await readTeams();
  const sanitized = sanitizeTeamName(teamName);
  return !!data.teams[sanitized];
}

// Create new team
async function createTeam(teamName, password) {
  const data = await readTeams();
  const sanitized = sanitizeTeamName(teamName);

  if (data.teams[sanitized]) {
    return { success: false, error: 'Team already exists' };
  }

  data.teams[sanitized] = {
    name: teamName,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };

  await writeTeams(data);

  return { success: true, team: sanitized };
}

// Verify team credentials
async function verifyTeam(teamName, password) {
  const data = await readTeams();
  const sanitized = sanitizeTeamName(teamName);
  const team = data.teams[sanitized];

  if (!team) {
    return false;
  }

  return team.passwordHash === hashPassword(password);
}

// Get team data file path
function getTeamDataFile(teamName) {
  const sanitized = sanitizeTeamName(teamName);
  return path.join(__dirname, `../data/team-${sanitized}.json`);
}

module.exports = {
  ensureTeamsFile,
  teamExists,
  createTeam,
  verifyTeam,
  sanitizeTeamName,
  getTeamDataFile
};
