const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Verify Google ID token
async function verifyGoogleToken(idToken) {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      sub: payload.sub
    };
  } catch (error) {
    console.error('Google token verification failed:', error.message);
    return null;
  }
}

// Generate JWT token
function generateJWT(user) {
  return jwt.sign(
    {
      email: user.email,
      name: user.name,
      picture: user.picture
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify JWT token
function verifyJWT(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Middleware to require authentication
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyJWT(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

module.exports = {
  verifyGoogleToken,
  generateJWT,
  verifyJWT,
  requireAuth
};
