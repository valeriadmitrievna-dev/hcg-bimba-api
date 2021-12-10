const Router = require("express");
const router = Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Carwash = require("../models/Carwash");

const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thirsday",
  "friday",
  "saturday",
  "sunday",
];

router.get("/", async (req, res) => {
  try {
    const { location } = req.body;
    const url_location = location || "38.89524795507812,47.22615523694117";
    const url = `https://search-maps.yandex.ru/v1/?apikey=086119b9-9e83-4e2e-9b39-c769c5bfb68f&text=автомойка&lang=ru_RU&type=biz&ll=${url_location}&spn=0.1737213134765625,0.06899380920912535`;
    const response = await axios.get(encodeURI(url));
    res.status(200).json(response.data.features);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/create/suggestions", async (req, res) => {
  try {
    const { address } = req.body;
    if (!address?.length) {
      return res.status(400).json({ error: "Address required" });
    }
    const response = await axios.get(
      encodeURI(
        `https://search-maps.yandex.ru/v1/?apikey=086119b9-9e83-4e2e-9b39-c769c5bfb68f&text=${address}&lang=ru_RU&type=biz`
      )
    );
    const suggestions = response.data.features
      .filter(r =>
        r.properties.CompanyMetaData.Categories.some(c => c.class === "auto")
      )
      .map(s => ({
        coordinates: s.geometry.coordinates.join(","),
        name: s.properties.name,
        address: s.properties.CompanyMetaData.address,
        companyID: s.properties.CompanyMetaData.id,
        phones: s.properties.CompanyMetaData.Phones?.map(p => p.formatted),
        url: s.properties.CompanyMetaData.url,
        availabilities: s.properties.CompanyMetaData.Hours?.Availabilities.map(
          a => {
            console.log(a);
            if (a[0]?.Everyday || a?.Everyday) {
              return weekdays.map(wd => ({
                weekday: wd.toLowerCase(),
                from:
                  a[0]?.TwentyFourHours || a?.TwentyFourHours
                    ? "00:00:00"
                    : a.Intervals[0].from,
                to:
                  a[0]?.TwentyFourHours || a?.TwentyFourHours
                    ? "23:59:59"
                    : a.Intervals[0].to,
              }));
            } else {
              return Object.keys(a)
                .filter(wd => wd !== "Intervals")
                .map(wd => ({
                  weekday: wd.toLowerCase(),
                  from: a.Intervals?.length && a.Intervals[0].from,
                  to: a.Intervals?.length && a.Intervals[0].to,
                }));
            }
          }
        ).flat(),
      }));
    if (!suggestions.length) {
      return res
        .status(400)
        .json({ error: "No car wash found at this address" });
    }
    res.status(200).json(suggestions);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/create", async (req, res) => {
  try {
    const { carwash, email, password } = req.body;
    if (!email.length || !password.length) {
      return res.status(400).json({ error: "Fill all inputs" });
    }
    if (!carwash) {
      return res.status(400).json({ error: "Choose car wash" });
    }
    const candidate = await Carwash.findOne({
      companyID: carwash.companyID,
    });
    if (!!candidate) {
      return res.status(400).json({
        error: "This car wash is already registered",
      });
    }
    const _carwash = new Carwash({
      ...carwash,
      email,
      password,
    });
    _carwash.save(err => {
      if (err) {
        return res.status(500).json({ error: "Error on saving car wash" });
      }
    });
    const token = jwt.sign({ id: _carwash._id }, process.env.SECRET, {
      expiresIn: "24h",
    });
    return res.status(200).json({ token, carwash: _carwash });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.length || !password?.length) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const carwash = await Carwash.findOne({ email });
    if (!carwash) {
      return res
        .status(404)
        .json({ error: "Carwash with this email doesn't exist" });
    }
    const samePassword = await bcrypt.compare(password, carwash.password);
    if (!samePassword) {
      return res.status(400).json({ error: "Wrong password" });
    }
    const token = jwt.sign({ id: carwash._id }, process.env.SECRET, {
      expiresIn: "24h",
    });
    return res.status(200).json({
      token,
      carwash,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
