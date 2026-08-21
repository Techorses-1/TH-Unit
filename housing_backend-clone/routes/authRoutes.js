const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const nameExists = await User.findOne({ name });
    if (nameExists) {
      return res.status(400).json({
        field: "name",
        message: "Name already taken",
      });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        field: "email",
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { userId: user.userId },
      process.env.JWT_SECRET,
      { expiresIn: "10h" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

// POST /login - Authenticate user
router.post("/login", async (req, res) => {
  const loginTime = new Date().toISOString();
  const ip =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userAgent = req.headers["user-agent"];

  try {
    const { email, password } = req.body;

    // USER NOT FOUND
    const user = await User.findOne({ email });
    if (!user) {
      console.warn(`[LOGIN FAILED] Email not found`, {
        email,
        ip,
        userAgent,
        loginTime,
      });

      return res.status(401).json({
        field: "email",
        message: "Invalid credentials",
      });
    }

    // PASSWORD CHECK
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn(`[LOGIN FAILED] Wrong password`, {
        userId: user.userId,
        email,
        ip,
        userAgent,
        loginTime,
      });

      return res.status(401).json({
        field: "password",
        message: "Invalid credentials",
      });
    }

    // TOKEN
    const token = jwt.sign(
      { userId: user.userId },
      process.env.JWT_SECRET,
      { expiresIn: "10h" }
    );

    // SUCCESS LOG
    console.info(`[LOGIN SUCCESS]`, {
      userId: user.userId,
      name: user.name,
      email: user.email,
      ip,
      userAgent,
      loginTime,
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error(`[LOGIN ERROR]`, {
      error: error.message,
      ip,
      userAgent,
      loginTime,
    });

    res.status(500).json({
      message: "Login failed",
    });
  }
});

// GET /me - Get current user profile (protected route)
router.get("/me", async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ userId: decoded.userId });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        permissions: user.permissions || []
      }
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(401).json({ 
      message: "Invalid token", 
      error: error.message 
    });
  }
});

module.exports = router;