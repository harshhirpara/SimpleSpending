const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const User = require("./models/User");
const Expense = require("./models/Expense");

const app = express();
const hbs = require("hbs");

hbs.registerHelper("eq", function (a, b) {
    return a === b;
});

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "hbs");

// Session Middleware
app.use(
    session({
        secret: "mysecret",
        resave: false,
        saveUninitialized: true,
    })
);

// MongoDB Connection
mongoose.connect("mongodb+srv://hhirpara3:harsh@userdata.sh70a.mongodb.net/?retryWrites=true&w=majority&appName=UserData", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB"))
.catch((err) => console.error("MongoDB connection error:", err));

// Route: Home
app.get("/", (req, res) => {
    res.redirect("/login");
});

// Signup
app.get("/signup", (req, res) => {
    res.render("signup");
});

app.post("/signup", async (req, res) => {
    const { name, password } = req.body;
    const existingUser = await User.findOne({ name });

    if (existingUser) {
        return res.send("User already exists!");
    }

    const user = new User({ name, password, budget: 0, expenses: [] });
    await user.save();

    res.redirect("/login");
});

// Login
app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", async (req, res) => {
    const { name, password } = req.body;
    const user = await User.findOne({ name, password });

    if (!user) {
        return res.send("Invalid credentials");
    }

    req.session.userId = user._id;
    res.redirect("/home");
});

// Home
app.get("/home", async (req, res) => {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    const categoryFilter = req.query.category || "All";

    const user = await User.findById(req.session.userId).populate("expenses");

    const displayedExpenses =
        categoryFilter === "All"
            ? user.expenses
            : user.expenses.filter(exp => exp.category === categoryFilter);

    const totalExpenses = user.expenses.reduce((acc, expense) => acc + expense.amount, 0);
    const budgetLeftover = user.budget - totalExpenses;

    

    let alert = null;
        const threshold = 0.8;  // 80% threshold for warning

        if (user.budget > 0) {
            const percentageSpent = totalExpenses / user.budget;

            if (percentageSpent >= 1) {
                alert = { type: "danger", message: "🔥 You have exceeded your budget!" };
            } else if (percentageSpent >= threshold) {
                alert = { type: "warning", message: "⚠️ You are close to exceeding your budget!" };
            }
        }

    res.render("home", {
        name: user.name,
        budget: user.budget,
        expenses: displayedExpenses,
        totalExpenses,
        budgetLeftover,
        alert,
        selectedCategory: categoryFilter
    });
});

// Set Budget
app.post("/set-budget", async (req, res) => {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    const { budget } = req.body;
    const user = await User.findById(req.session.userId);
    user.budget = budget;

    await user.save();
    res.redirect("/home");
});

// Add Expense
app.post("/add-expense", async (req, res) => {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    const { expensename, amount, category, date } = req.body;
    const user = await User.findById(req.session.userId);
    const isRecurring = req.body.isRecurring === "on"; //handles checkbox


    const expense = new Expense({
        userId: user._id,
        expensename,
        amount,
        category,
        date,
        isRecurring
    });

    await expense.save();

    user.expenses.push(expense._id);
    await user.save();

    res.redirect("/home");
});

// Delete Expense
app.post("/delete-expense/:id", async (req, res) => {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    const expenseId = req.params.id;
    await Expense.findByIdAndDelete(expenseId);

    const user = await User.findById(req.session.userId);
    user.expenses = user.expenses.filter(id => id.toString() !== expenseId);

    await user.save();
    res.redirect("/home");
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

//figure out a way to add reccuring expenses
//set monthly salary which adds to your budget

app.get("/generate-recurring", async (req, res) => {
    const today = new Date().toISOString().split("T")[0];

    const recurringExpenses = await Expense.find({ isRecurring: true });

    for (const expense of recurringExpenses) {
        const newExpense = new Expense({
            userId: expense.userId,
            expensename: expense.expensename,
            amount: expense.amount,
            category: expense.category,
            date: today,
            isRecurring: true
        });

        await newExpense.save();

        const user = await User.findById(expense.userId);
        user.expenses.push(newExpense._id);
        await user.save();
    }

    res.send("Recurring expenses added for today.");
});

// Start Server
app.listen(8080, () => console.log("Server running on port 8080"));
