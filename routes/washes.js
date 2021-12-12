const Router = require("express");
const router = Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Carwash = require("../models/Carwash");
const Admin = require("../models/Admin");
const withAuth = require("../middlewares/auth");

const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

router.post("/", async (req, res) => {
  try {
    // const { location } = req.body;
    // const url =
    //   "https://search-maps.yandex.ru/v1/?apikey=" +
    //   process.env.YANDEX_API_KEY +
    //   "&text=автомойка&lang=ru_RU&type=biz&ll=" +
    //   location +
    //   "&spn=0.5,0.3&results=50";
    // const response = await axios.get(encodeURI(url));
    // const types = [
    //   "contact wash",
    //   "hand wash",
    //   "self-service car wash",
    //   "steam wash",
    //   "robot washing",
    // ];
    // const data = response.data.features
    //   .filter(r =>
    //     r.properties.CompanyMetaData.Categories.some(c => c.class === "auto")
    //   )
    //   .map(s => ({
    //     coordinates: s.geometry.coordinates.join(","),
    //     name: s.properties.name,
    //     address: s.properties.CompanyMetaData.address.replace(
    //       "Россия, Ростовская область, Таганрог, ",
    //       ""
    //     ),
    //     // _id: s.properties.CompanyMetaData.id,
    //     companyID: s.properties.CompanyMetaData.id,
    //     phones: s.properties.CompanyMetaData.Phones?.map(p => p.formatted),
    //     url: s.properties.CompanyMetaData.url,
    //     availabilities: s.properties.CompanyMetaData.Hours?.Availabilities.map(
    //       a => {
    //         if (a[0]?.Everyday || a?.Everyday) {
    //           return weekdays.map(wd => ({
    //             weekday: wd.toLowerCase(),
    //             from:
    //               a[0]?.TwentyFourHours || a?.TwentyFourHours
    //                 ? "00:00:00"
    //                 : a.Intervals[0].from,
    //             to:
    //               a[0]?.TwentyFourHours || a?.TwentyFourHours
    //                 ? "23:59:59"
    //                 : a.Intervals[0].to,
    //           }));
    //         } else {
    //           return Object.keys(a)
    //             .filter(wd => wd !== "Intervals")
    //             .map(wd => ({
    //               weekday: wd.toLowerCase(),
    //               from: a.Intervals?.length && a.Intervals[0].from,
    //               to: a.Intervals?.length && a.Intervals[0].to,
    //             }));
    //         }
    //       }
    //     ).flat(),
    //     type: types[Math.floor(Math.random() * types.length)],
    //   }));
    // for (const c of data) {
    //   const carwash = new Carwash({ ...c });
    //   await carwash.save();
    // }
    const data = await Carwash.find()
    res.status(200).json(data);
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
    const { carwash, email, password, name, phone } = req.body;
    if (
      !email?.length ||
      !password?.length ||
      !name?.length ||
      !phone?.length
    ) {
      return res.status(400).json({ error: "Fill all inputs" });
    }

    if (!carwash) {
      return res.status(400).json({ error: "Choose car wash" });
    }

    const candidate_admin = await Admin.findOne({
      email,
    });
    if (!!candidate_admin) {
      return res.status(400).json({
        error: "Admin with this email already registered",
      });
    }

    const candidate_carwash = await Carwash.findOne({
      companyID: carwash.companyID,
    });
    if (!!candidate_carwash) {
      return res.status(400).json({
        error: "This car wash is already registered",
      });
    }

    const _carwash = new Carwash({
      ...carwash,
    });
    const admin = new Admin({
      email,
      name,
      password,
      carwashes: [_carwash],
    });

    await _carwash.save();
    await admin.save();

    const token = jwt.sign({ id: admin._id }, process.env.SECRET, {
      expiresIn: "24h",
    });
    return res.status(200).json({ token, admin });
  } catch (error) {
    console.log(error);
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

router.post("/add", withAuth, async (req, res) => {
  try {
    const { carwash } = req.body;
    const { id } = req.decoded;

    const admin = await Admin.findOne({ _id: id });
    if (!admin) {
      return res.status(404).json({ error: "User not found or invalid token" });
    }

    if (!carwash) {
      return res.status(400).json({ error: "Choose car wash" });
    }

    const candidate_carwash = await Carwash.findOne({
      companyID: carwash.companyID,
    });
    if (!!candidate_carwash) {
      return res.status(400).json({
        error: "This car wash is already registered",
      });
    }

    const _carwash = new Carwash({
      ...carwash,
    });
    admin.carwashes = [...admin.carwashes, _carwash];

    await _carwash.save();
    await admin.save();

    return res.status(200).json({ carwash: _carwash });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
