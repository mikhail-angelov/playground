import express from 'express';
import { User } from '../models/User';
import { generateToken } from '../services/jwtUtils';
import nodemailer from 'nodemailer';

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
      user = await User.create({ email });
    }

    // Generate auth token
    const authToken = generateToken({ userId: user.id, email: user.email });

    // Store auth token in the database
    user.token = authToken;
    await user.save();

    // Send email with the auth token using Mailgun
    const transporter = nodemailer.createTransport({
      host: 'smtp.mailgun.org',
      port: 587,
      auth: {
        user: process.env.MAILGUN_SMTP_USER, // Mailgun SMTP username
        pass: process.env.MAILGUN_SMTP_PASS, // Mailgun SMTP password
      },
    });

    const authLink = `${process.env.FRONTEND_URL}/login?token=${authToken}`;
    await transporter.sendMail({
      from: process.env.MAILGUN_FROM_EMAIL, // Sender email address
      to: email,
      subject: 'Your Authentication Link',
      text: `Click the following link to log in to PLAYGROUND: ${authLink}`,
    });

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
    const user = await User.findOne({ where: { authToken: token } });
    if (!user) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    // Generate JWT for the user
    const jwtToken = generateToken({ userId: user.id, email: user.email });

    // Set JWT as an HTTP-only cookie
    res.cookie('auth', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000, // 1 hour
    });

    res.json({ message: 'Logged in successfully' });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

export default router;