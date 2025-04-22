const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    expensename: String,
    amount: Number,
    category: String,
    date: String,
    isRecurring: { type: Boolean, default: false } // 👈 new field

});

module.exports = mongoose.model("Expense", expenseSchema);
