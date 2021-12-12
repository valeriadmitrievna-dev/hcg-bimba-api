const { Schema, model, Types } = require("mongoose");

const schema = new Schema({
  created: { type: Date, required: true },
  owner: { type: Types.ObjectId, ref: "User", required: true },
  carwash: { type: Types.ObjectId, ref: "Carwash", required: true },
  datetime: { type: Date, required: true, unique: true },
});

module.exports = model("Ticket", schema);
