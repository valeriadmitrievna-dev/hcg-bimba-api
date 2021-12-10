const { Schema, model, Types } = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const schema = new Schema({
  email: { type: String, required: true, unic: true, trim: true },
  password: { type: String, required: true, trim: true },
  name: { type: String, required: true },
  phone: { type: String },
  carwashes: [{ type: Types.ObjectId, ref: "Carwash" }],
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

module.exports = model("Admin", schema);
