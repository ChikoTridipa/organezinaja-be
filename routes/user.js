// routes/user.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/user");

router.post("/", userController.createUser);
router.get("/:uid", userController.getUserByUid);
router.put("/:uid", userController.updateUser);
router.delete("/:uid", userController.deleteUser);

module.exports = router;
