import express from 'express';
import { User } from '../models/User';
import { generateToken, verifyToken } from '../services/jwtUtils';
import { sendMail } from '../services/mailService';

const router = express.Router();

// POST /auth - Generate auth token and send email
router.post('/', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Find or create user
    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({ email, });
    }

    // Generate auth token
    const authToken = generateToken({ userId: user.id, email: user.email });

    // Store auth token in the database
    user.token = authToken;
    await user.save();

    sendMail({
      to: email,
      subject: 'Your Authentication Link',
      text: `Click the following link to log in to PLAYGROUND: ${process.env.SERVER_URL}/api/auth/login?token=${authToken}`,
    })

    res.json({ message: 'Authentication email sent' });
  } catch (err) {
    console.error('Error sending authentication email:', err);
    res.status(500).json({ error: 'Failed to send authentication email' });
  }
});

// GET /login - Login with auth token
router.get('/login', async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token is required and must be a string' });
  }

  try {
    // Find user with the given auth token
    const user = await User.findOne({ where: { token } });
    if (!user) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    // Generate JWT for the user
    const jwtToken = generateToken({ userId: user.id, email: user.email });

    // Set JWT as an HTTP-only cookie
res.cookie('auth', jwtToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 864000000, // 10 days
});

    res.redirect(process.env.CLIENT_URL as string);
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

router.get('/validate', async (req, res) => {
  try {
    const token = req.cookies?.auth || req.headers?.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    // Verify the token
    const decoded = verifyToken(token);

    // Optionally, check if the user exists in the database
    const user = await User.findOne({ where: { id: (decoded as any).userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Authentication is valid', user: { email: user.email } });
  } catch (err) {
    console.error('Error validating token:', err);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
});

router.post('/logout', (req, res) => {
  try {
    // Clear the auth cookie
    res.clearCookie('auth', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Error during logout:', err);
    res.status(500).json({ error: 'Failed to log out' });
  }
});

export default router;