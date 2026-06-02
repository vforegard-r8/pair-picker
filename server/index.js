const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const fs = require('fs').promises;
const path = require('path');
const { setupPassport, ensureAuthenticated } = require('./auth');
const authConfig = require('./auth-config');
const { ensureTeamsFile, teamExists, createTeam, verifyTeam, sanitizeTeamName, getTeamDataFile } = require('./teams');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, '../data/pairs-history.json');

// Get data file based on auth mode
function getDataFile(req) {
  if (authConfig.multiTeam.enabled && req.user && req.user.team) {
    return getTeamDataFile(req.user.team);
  }
  return DATA_FILE;
}

// CORS configuration (only needed in development)
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }));
}
app.use(bodyParser.json());

// Session configuration
app.use(session({
  secret: authConfig.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());
setupPassport();

// Ensure data directory and file exist
async function ensureDataFile(filePath = DATA_FILE) {
  try {
    await fs.access(filePath);
  } catch {
    // Create data directory if it doesn't exist
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    // Create the file
    await fs.writeFile(filePath, JSON.stringify({ people: [], history: [] }, null, 2));
  }
}

// Read data
async function readData(filePath = DATA_FILE) {
  try {
    await ensureDataFile(filePath);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { people: [], history: [] };
  }
}

// Write data
async function writeData(data, filePath = DATA_FILE) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Smart pairing algorithm
function smartPair(people, history) {
  // Calculate pair frequency matrix
  const pairCount = {};
  history.forEach(session => {
    session.pairs.forEach(pair => {
      const key1 = [pair[0], pair[1]].sort().join('|');
      const key2 = [pair[1], pair[0]].sort().join('|');
      pairCount[key1] = (pairCount[key1] || 0) + 1;
    });
  });

  // Shuffle people for randomness
  const shuffled = [...people].sort(() => Math.random() - 0.5);
  const paired = [];
  const unpaired = [...shuffled];
  const result = [];

  // Greedy pairing: pair people who have worked together least
  while (unpaired.length >= 2) {
    const person1 = unpaired[0];
    let bestMatch = unpaired[1];
    let minPairCount = Infinity;

    // Find best match for person1
    for (let i = 1; i < unpaired.length; i++) {
      const person2 = unpaired[i];
      const key = [person1, person2].sort().join('|');
      const count = pairCount[key] || 0;
      if (count < minPairCount) {
        minPairCount = count;
        bestMatch = person2;
      }
    }

    result.push([person1, bestMatch]);
    unpaired.splice(unpaired.indexOf(person1), 1);
    unpaired.splice(unpaired.indexOf(bestMatch), 1);
  }

  // Handle odd person out
  if (unpaired.length === 1) {
    result.push([unpaired[0]]);
  }

  return result;
}

// Authentication Routes
const { verifySimpleAuth } = require('./auth');

// Multi-team login or create
app.post('/auth/team-login', async (req, res) => {
  const { teamName, password, createNew } = req.body;

  if (!authConfig.multiTeam.enabled) {
    return res.status(400).json({ error: 'Multi-team mode is disabled.' });
  }

  if (!teamName || !password) {
    return res.status(400).json({ error: 'Team name and password are required' });
  }

  if (password.length < authConfig.multiTeam.minPasswordLength) {
    return res.status(400).json({
      error: `Password must be at least ${authConfig.multiTeam.minPasswordLength} characters`
    });
  }

  const exists = await teamExists(teamName);

  // Create new team
  if (createNew) {
    if (exists) {
      return res.status(400).json({ error: 'Team name already taken. Choose a different name.' });
    }

    const result = await createTeam(teamName, password);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const user = {
      id: result.team,
      team: result.team,
      teamName: teamName,
      email: `${result.team}@team.local`
    };

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }
      res.json({ success: true, user, created: true });
    });
  }
  // Login to existing team
  else {
    if (!exists) {
      return res.status(401).json({ error: 'Team not found. Check the team name or create a new team.' });
    }

    const valid = await verifyTeam(teamName, password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid password for this team' });
    }

    const user = {
      id: sanitizeTeamName(teamName),
      team: sanitizeTeamName(teamName),
      teamName: teamName,
      email: `${sanitizeTeamName(teamName)}@team.local`
    };

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }
      res.json({ success: true, user });
    });
  }
});

// Simple username/password login (legacy single-team mode)
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!authConfig.simpleAuth.enabled) {
    return res.status(400).json({ error: 'Simple auth is disabled. Use team login.' });
  }

  if (verifySimpleAuth(username, password)) {
    const user = {
      id: '1',
      username: username,
      email: `${username}@rise8.us`,
      name: username
    };

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }
      res.json({ success: true, user });
    });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

// Google OAuth routes (only if OAuth is enabled)
if (!authConfig.simpleAuth.enabled) {
  app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login-failed' }),
    (req, res) => {
      res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
    }
  );
}

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

app.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});

app.get('/auth/config', (req, res) => {
  res.json({
    simpleAuthEnabled: authConfig.simpleAuth.enabled,
    multiTeamEnabled: authConfig.multiTeam.enabled
  });
});

// API Routes (Protected)
app.get('/api/people', ensureAuthenticated, async (req, res) => {
  const dataFile = getDataFile(req);
  const data = await readData(dataFile);
  res.json(data.people);
});

app.post('/api/people', ensureAuthenticated, async (req, res) => {
  const { people } = req.body;
  const dataFile = getDataFile(req);
  const data = await readData(dataFile);
  data.people = people;
  await writeData(data, dataFile);
  res.json({ success: true });
});

app.get('/api/history', ensureAuthenticated, async (req, res) => {
  const dataFile = getDataFile(req);
  const data = await readData(dataFile);
  res.json(data.history);
});

app.post('/api/pairs/smart', ensureAuthenticated, async (req, res) => {
  const dataFile = getDataFile(req);
  const data = await readData(dataFile);
  const pairs = smartPair(data.people, data.history);
  res.json(pairs);
});

app.post('/api/pairs/save', ensureAuthenticated, async (req, res) => {
  const { pairs } = req.body;
  const dataFile = getDataFile(req);
  const data = await readData(dataFile);

  const session = {
    id: Date.now(),
    date: new Date().toISOString(),
    pairs: pairs
  };

  data.history.push(session);
  await writeData(data, dataFile);
  res.json({ success: true, session });
});

app.delete('/api/history/:id', ensureAuthenticated, async (req, res) => {
  const { id } = req.params;
  const dataFile = getDataFile(req);
  const data = await readData(dataFile);
  data.history = data.history.filter(session => session.id !== parseInt(id));
  await writeData(data, dataFile);
  res.json({ success: true });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));

  // Catch-all route to serve React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Initialize and start server
async function initialize() {
  await ensureDataFile();
  if (authConfig.multiTeam.enabled) {
    await ensureTeamsFile();
  }
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Multi-team mode: ${authConfig.multiTeam.enabled ? 'ENABLED' : 'disabled'}`);
  });
}

initialize();
