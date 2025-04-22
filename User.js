const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    budget: { type: Number, default: 0 },
    expenses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Expense" }]
});

module.exports = mongoose.model("User", userSchema);
