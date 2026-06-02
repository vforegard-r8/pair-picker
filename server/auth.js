const passport = require('passport');
const authConfig = require('./auth-config');

// Check if email is authorized (for OAuth)
function isEmailAuthorized(email) {
  if (!email) return false;
  if (authConfig.allowedEmails.includes(email)) {
    return true;
  }
  const domain = email.split('@')[1];
  return authConfig.allowedDomains.includes(domain);
}

// Verify simple auth credentials
function verifySimpleAuth(username, password) {
  return username === authConfig.simpleAuth.username &&
         password === authConfig.simpleAuth.password;
}

// Configure passport
function setupPassport() {
  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  // Deserialize user from session
  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  // Only set up Google strategy if OAuth is enabled and credentials provided
  if (!authConfig.simpleAuth.enabled &&
      authConfig.google.clientID &&
      authConfig.google.clientSecret) {
    const GoogleStrategy = require('passport-google-oauth20').Strategy;

    passport.use(
      new GoogleStrategy(
        {
          clientID: authConfig.google.clientID,
          clientSecret: authConfig.google.clientSecret,
          callbackURL: authConfig.google.callbackURL,
        },
        (accessToken, refreshToken, profile, done) => {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

          if (!isEmailAuthorized(email)) {
            return done(null, false, { message: 'Unauthorized email domain or address' });
          }

          const user = {
            id: profile.id,
            email: email,
            name: profile.displayName,
            photo: profile.photos && profile.photos[0] ? profile.photos[0].value : null
          };

          return done(null, user);
        }
      )
    );
  }
}

// Middleware to check if user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized', message: 'Please log in' });
}

module.exports = {
  setupPassport,
  ensureAuthenticated,
  isEmailAuthorized,
  verifySimpleAuth
};
