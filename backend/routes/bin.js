const express = require("express");
const router = express.Router();

const { createBin, getBins } = require("../controllers/bin");
const upload = require("../middleware/bin");

router.post("/", upload.single("image"), createBin);
router.get("/", getBins);

module.exports = router;