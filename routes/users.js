const Router = require("express");
const router = Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const withAuth = require("../middlewares/auth");

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
    const samePassword = await bcrypt.compare(password, user.password);
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

    const uploadAvatar = async () => {
      if (!!req.files?.avatar) {
        const fileContent = Buffer.from(req.files.avatar.data, "binary");
        const params = {
          Bucket: process.env.S3_BUCKET,
          Key: req.files.avatar.name,
          Body: fileContent,
        };
        const stored = await req.app
          .get("s3")
          .upload(params, (err, data) => {
            if (err) {
              console.log(err.message);
              return res.status(500).json({
                error: "Problems with uploading avatar",
              });
            }
            return data;
          })
          .promise();
        const url = await stored.Location;
        return url;
      }
    };
    const avatar = await uploadAvatar();

    const candidate = await User.findOne({ email });
    if (!!candidate) {
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }
    const user = new User({
      email,
      password,
      phone,
      name,
      avatar,
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

router.get("/check", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const user = await User.findOne({ _id: id });
    if (!user) {
      return res.status(400).json({ error: "User doen't exist" });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const { email, name, phone } = req.body;
    const user = await User.findOne({ _id: id });
    if (!user) {
      return res.status(400).json({ error: "User doen't exist" });
    }
    const uploadAvatar = async () => {
      if (!!req.files?.avatar) {
        const fileContent = Buffer.from(req.files.avatar.data, "binary");
        const params = {
          Bucket: process.env.S3_BUCKET,
          Key: req.files.avatar.name,
          Body: fileContent,
        };
        const stored = await req.app
          .get("s3")
          .upload(params, (err, data) => {
            if (err) {
              console.log(err.message);
              return res.status(500).json({
                error: "Problems with updating avatar",
              });
            }
            return data;
          })
          .promise();
        const url = await stored.Location;
        return url;
      } else return user.avatar;
    };
    user.avatar = await uploadAvatar();
    user.name = name;
    user.email = email;
    user.phone = phone;
    await user.save();
    return res.status(200).json(user);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
