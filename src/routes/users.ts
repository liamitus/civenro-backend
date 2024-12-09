// src/routes/users.ts

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get user profile by ID
router.get('/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        createdAt: true,
        // Include any other public fields
      },
    });
    console.log(user);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update username
router.put('/username', authenticateToken, async (req, res) => {
  const userId = req.user!.userId;
  const { username } = req.body;

  try {
    // Check if the username is already taken
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { username },
    });

    res.json({ message: 'Username updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).json({ error: 'Failed to update username' });
  }
});

// Update email
router.put('/email', authenticateToken, async (req, res) => {
  const userId = req.user!.userId;
  const { email } = req.body;

  try {
    // Check if the email is already taken
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already in use' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { email },
    });

    res.json({ message: 'Email updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// Update password
router.put('/password', authenticateToken, async (req, res) => {
  const userId = req.user!.userId;
  const { currentPassword, newPassword } = req.body;

  try {
    // Fetch the user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
