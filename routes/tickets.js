const Router = require("express");
const router = Router();
const withAuth = require("../middlewares/auth");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const Carwash = require("../models/Carwash");

router.post("/", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const { carwashID, datetime } = req.body;
    if (!carwashID) {
      return res.status(400).json({ error: "Choose car wash" });
    }
    if (!datetime) {
      return res.status(400).json({ error: "Choose ticket's expiration date" });
    }
    const owner = await User.findOne({ _id: id });
    if (!owner) {
      return res.status(500).json({ error: "User not found or invalid token" });
    }
    const carwash = await Carwash.findOne({ _id: carwashID });
    if (!carwash) {
      return res.status(500).json({ error: "Car wash not found, invalid id" });
    }
    const candidateTicket = await Ticket.findOne({ datetime, carwash });
    if (candidateTicket) {
      return res.status(400).json({ error: "Choose another time" });
    }
    const ticket = new Ticket({
      created: new Date(),
      owner,
      carwash,
      datetime,
    });
    ticket.save(err => {
      if (err) {
        return res.status(500).json({ error: "Error on saving ticket" });
      }
    });
    res.status(200).json({ success: true });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
