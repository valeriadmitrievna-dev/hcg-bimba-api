const Router = require("express");
const router = Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.length || !password?.length) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ error: "User with this email doesn't exist" });
    }
    const samePassword = await bcrypt.compare(password, user.password)
    if (!samePassword) {
      return res.status(400).json({ error: "Wrong password" });
    }
    const token = jwt.sign({ id: user._id }, process.env.SECRET, {
      expiresIn: "24h",
    });
    return res.status(200).json({
      token,
      user,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/signup", async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    if (
      !email?.length ||
      !password?.length ||
      !name?.length ||
      !phone?.length
    ) {
      return res.status(400).json({ error: "Fill all inputs" });
    }
    const candidate = await User.findOne({ email });
    if (!!candidate) {
      return res
        .status(404)
        .json({ error: "User with this email already exists" });
    }
    const user = new User({
      email,
      password,
      phone,
      name,
    });
    user.save(err => {
      if (err) {
        return res.status(500).json({ error: "Error on saving user" });
      }
    });
    const token = jwt.sign({ id: user._id }, process.env.SECRET, {
      expiresIn: "24h",
    });
    return res.status(200).json({
      token,
      user,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
