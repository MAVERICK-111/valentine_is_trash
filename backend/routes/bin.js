const express = require("express");
const router = express.Router();

const { createBin, getBins } = require("../controllers/bin");
const upload = require("../middleware/upload");

// POST /bins - Create a new bin
router.post("/", upload.single("image"), createBin);

// GET /bins - Get all bins
router.get("/", getBins);

module.exports = router;