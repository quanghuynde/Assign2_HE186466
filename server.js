require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const connectDB = require("./config/db");
const bookRoute = require("./src/routes/bookRoute");
const loanRoute = require("./src/routes/loanRoute");
const memberRoute = require("./src/routes/memberRoute");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
  try {
    res.send({ message: "Welcome to Practical  Exam!" });
  } catch (error) {
    res.send({ error: error.message });
  }
});

app.use("/api", bookRoute);
app.use("/api", loanRoute);
app.use("/api", memberRoute);

connectDB();
const PORT = process.env.PORT || 9999;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
