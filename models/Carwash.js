const { Schema, model } = require("mongoose");

const schema = new Schema({
  coordinates: { type: String, required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  phones: [{ type: String }],
  url: { type: String },
  type: { type: String },
  companyID: { type: String, required: true },
  availabilities: [
    {
      weekday: { type: String },
      from: { type: String },
      to: { type: String },
    },
  ],
});

module.exports = model("Carwash", schema);
