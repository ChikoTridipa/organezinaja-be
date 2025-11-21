// routes/organizer.js
const express = require("express");
const router = express.Router();
const organizerController = require("../controllers/organizer");

router.post("/", organizerController.createOrganizer);
router.get("/", organizerController.getAllOrganizers);
router.get("/:id", organizerController.getOrganizerById);
router.put("/:id", organizerController.updateOrganizer);
router.delete("/:id", organizerController.deleteOrganizer);

module.exports = router;
