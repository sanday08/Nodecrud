const express = require("express");

const {
    getUser,
    getUsers,
    activeUser,
    blockUser,
    deleteUser,
} = require("../controllers/users");
const advancedResults = require("../middleware/advancedResults");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

//use middleware to protect, authorize
router.use(protect);
router.use(authorize("admin"));
router.route("/").get(advancedResults(User), getUsers);

router.route("/:id").get(getUser).delete(deleteUser);
router.route("/active/:id").put(activeUser);
router.route("/block/:id").put(blockUser);
module.exports = router;
