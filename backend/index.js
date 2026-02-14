require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require('@supabase/supabase-js');

const binRoutes = require("./routes/bin");

const app = express();

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });
  
  req.user = user;
  next();
};

app.use("/bins", binRoutes);

app.get("/", (req, res) => {
  res.send("Digital Twin Bin API Running");
});

app.listen(PORT || 5000, () => console.log("Server running on port 5000"));