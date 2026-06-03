const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  getAds,
  getAdById,
  createAd,
  updateAd,
  deleteAd,
  addPhotosToAd,
} = require("../controllers/adController");

router.get("/", getAds);
router.get("/:id", getAdById);

router.post("/", authMiddleware, upload.array("photos", 10), createAd);

router.put("/:id", authMiddleware, updateAd);
router.delete("/:id", authMiddleware, deleteAd);

router.post(
  "/:id/photos",
  authMiddleware,
  upload.array("photos", 10),
  addPhotosToAd,
);

module.exports = router;
