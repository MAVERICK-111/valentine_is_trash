require("dotenv").config();

const express = require("express");
const cors = require("cors");

const binRoutes = require("./routes/bin");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/bins", binRoutes);

app.get("/", (req, res) => {
  res.send("Digital Twin Bin API Running");
});

app.listen(5000, () => console.log("Server running on port 5000"));