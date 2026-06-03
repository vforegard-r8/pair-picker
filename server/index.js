const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const path = require('path');
const { connect, getDb, getClient, getClientPromise } = require('./db');
const { setupPassport, ensureAuthenticated } = require('./auth');
const authConfig = require('./auth-config');
const { ensureTeamsCollection, teamExists, createTeam, verifyTeam, sanitizeTeamName, getTeamCollection } = require('./teams');

const app = express();

// Trust proxy - required for secure cookies on Render/Heroku
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3001;

// Get collection name based on auth mode
function getDataCollection(req) {
  if (authConfig.multiTeam.enabled && req.user && req.user.team) {
    return getTeamCollection(req.user.team);
  }
  return 'default_team_data';
}

// CORS configuration (only needed in development)
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }));
}
app.use(bodyParser.json());

// Session middleware - must be set up before routes
// Uses clientPromise to share MongoDB connection with application
app.use(session({
  secret: authConfig.sessionSecret,
  resave: false,
  saveUninitialized: false,
  proxy: true, // Required when behind Render's proxy
  store: MongoStore.create({
    clientPromise: getClientPromise(),
    collectionName: 'sessions',
    touchAfter: 24 * 3600, // lazy session update (seconds)
    crypto: {
      secret: authConfig.sessionSecret
    }
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax', // Use lax for same-site requests
    path: '/'
  }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());
setupPassport();

// Read data from MongoDB
async function readData(collectionName) {
  try {
    const db = await getDb();
    const doc = await db.collection(collectionName).findOne({ _id: 'team_data' });

    if (!doc) {
      // Return default structure if no data exists
      return { people: [], history: [] };
    }

    return {
      people: doc.people || [],
      history: doc.history || []
    };
  } catch (error) {
    console.error('[DATA] Error reading data:', error);
    return { people: [], history: [] };
  }
}

// Write data to MongoDB
async function writeData(data, collectionName) {
  try {
    const db = await getDb();
    await db.collection(collectionName).updateOne(
      { _id: 'team_data' },
      {
        $set: {
          people: data.people || [],
          history: data.history || [],
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('[DATA] Error writing data:', error);
    throw error;
  }
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

// Setup routes after middleware is initialized
function setupRoutes() {
  // Authentication Routes

  // Multi-team login or create
  app.post('/auth/team-login', async (req, res) => {
  console.log('[AUTH] Team login attempt:', { teamName: req.body.teamName, createNew: req.body.createNew });
  const { teamName, password, createNew } = req.body;

  if (!authConfig.multiTeam.enabled) {
    console.log('[AUTH] Multi-team disabled');
    return res.status(400).json({ error: 'Multi-team mode is disabled.' });
  }

  if (!teamName || !password) {
    console.log('[AUTH] Missing credentials');
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
        console.error('[AUTH] Login error:', err);
        return res.status(500).json({ error: 'Login failed' });
      }
      // Save session before responding
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[AUTH] Session save error:', saveErr);
          return res.status(500).json({ error: 'Session save failed' });
        }
        console.log('[AUTH] Team created and logged in:', result.team);
        res.json({ success: true, user, created: true });
      });
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
        console.error('[AUTH] Login error:', err);
        return res.status(500).json({ error: 'Login failed' });
      }
      // Save session before responding
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[AUTH] Session save error:', saveErr);
          return res.status(500).json({ error: 'Session save failed' });
        }
        console.log('[AUTH] User logged in:', user.team);
        res.json({ success: true, user });
      });
    });
    }
  });


  app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  app.get('/auth/user', (req, res) => {
    console.log('[AUTH] Check user, authenticated:', req.isAuthenticated(), 'session:', !!req.session);
    if (req.isAuthenticated()) {
      console.log('[AUTH] User:', req.user);
      res.json({ user: req.user });
    } else {
      console.log('[AUTH] No user logged in');
      res.json({ user: null });
    }
  });

  app.get('/auth/config', (req, res) => {
    res.json({
      multiTeamEnabled: authConfig.multiTeam.enabled
    });
  });

  // API Routes (Protected)
  app.get('/api/people', ensureAuthenticated, async (req, res) => {
    const collection = getDataCollection(req);
    const data = await readData(collection);
    res.json(data.people);
  });

  app.post('/api/people', ensureAuthenticated, async (req, res) => {
    const { people } = req.body;
    const collection = getDataCollection(req);
    const data = await readData(collection);
    data.people = people;
    await writeData(data, collection);
    res.json({ success: true });
  });

  app.get('/api/history', ensureAuthenticated, async (req, res) => {
    const collection = getDataCollection(req);
    const data = await readData(collection);
    res.json(data.history);
  });

  app.post('/api/pairs/smart', ensureAuthenticated, async (req, res) => {
    const collection = getDataCollection(req);
    const data = await readData(collection);
    const pairs = smartPair(data.people, data.history);
    res.json(pairs);
  });

  app.post('/api/pairs/save', ensureAuthenticated, async (req, res) => {
    const { pairs } = req.body;
    const collection = getDataCollection(req);
    const data = await readData(collection);

    const session = {
      id: Date.now(),
      date: new Date().toISOString(),
      pairs: pairs
    };

    data.history.push(session);
    await writeData(data, collection);
    res.json({ success: true, session });
  });

  app.delete('/api/history/:id', ensureAuthenticated, async (req, res) => {
    const { id } = req.params;
    const collection = getDataCollection(req);
    const data = await readData(collection);
    data.history = data.history.filter(session => session.id !== parseInt(id));
    await writeData(data, collection);
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
}

// Initialize and start server
async function initialize() {
  try {
    // Connect to MongoDB first - this resolves the clientPromise for the session store
    await connect();
    console.log('[INIT] MongoDB connection established');
    console.log('[SESSION] Session store shares MongoDB client via clientPromise');

    // Initialize teams collection if multi-team is enabled
    if (authConfig.multiTeam.enabled) {
      await ensureTeamsCollection();
      console.log('[INIT] Teams collection initialized');
    }

    // Setup routes after session/passport middleware is ready
    setupRoutes();
    console.log('[INIT] Routes initialized');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Multi-team mode: ${authConfig.multiTeam.enabled ? 'ENABLED' : 'disabled'}`);
      console.log(`MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'Using default localhost'}`);
    });
  } catch (error) {
    console.error('[INIT] Failed to initialize server:', error);
    process.exit(1);
  }
}

initialize();
