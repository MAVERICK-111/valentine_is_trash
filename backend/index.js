require("dotenv").config();

const express = require("express");
const cors = require("cors");

const binRoutes = require("./routes/bin");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/bins", binRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("Digital Twin Bin API Running");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});