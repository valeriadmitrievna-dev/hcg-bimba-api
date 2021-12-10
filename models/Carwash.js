const { Schema, model } = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const schema = new Schema({
  coordinates: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  description: { type: String },
  address: { type: String, required: true },
  password: { type: String },
  phones: [{ type: String }],
  url: { type: String },
  companyID: { type: String, required: true },
  availabilities: [
    {
      weekday: { type: String },
      from: { type: String },
      to: { type: String },
    },
  ],
});

schema.pre("save", function (next) {
  if (this.isNew || this.isModified("password")) {
    const document = this;
    bcrypt.hash(document.password, saltRounds, function (err, hashedPassword) {
      if (err) {
        next(err);
      } else {
        document.password = hashedPassword;
        next();
      }
    });
  } else {
    next();
  }
});

module.exports = model("Carwash", schema);
