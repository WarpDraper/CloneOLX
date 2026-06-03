const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  addToFavorites,
  getFavorites,
  removeFromFavorites,
} = require("../controllers/favoriteController");

router.post("/", authMiddleware, addToFavorites);
router.get("/", authMiddleware, getFavorites);
router.delete("/:ad_id", authMiddleware, removeFromFavorites);

module.exports = router;
