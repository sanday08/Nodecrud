const asyncHandler = require("../middleware/async");
const ErrorRespose = require("../utils/errorResponse");
const User = require("../models/User");

//@desc      Get all users
//@routes    GET /api/v1/users
//Access     Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
    res.status(200).json(res.advancedResults);
});

//@desc      Get Single user
//@routes    GET /api/v1/users/:id
//Access     Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    res.status(200).json({ success: true, data: user });
});

//@desc      Active user
//@routes    ut /api/v1/users/active/:id
//Access     Private/Admin
exports.activeUser = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (user && !user.isActive) {
        const data = await User.findByIdAndUpdate(
            user._id,
            { isActive: true },
            { new: true }
        );
        res.status(200).json({ success: true, data });
    } else return next(new ErrorRespose("User allready Active", 500));
});
//@desc      Block user
//@routes    ut /api/v1/users/block/:id
//Access     Private/Admin
exports.blockUser = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (user && user.isActive) {
        const data = await User.findByIdAndUpdate(
            user._id,
            {
                isActive: false,
            },
            { new: true }
        );
        res.status(200).json({ success: true, data });
    } else return next(new ErrorRespose("User allready Block", 500));
});

//@desc      Delete user
//@routes    DELETE /api/v1/users/:id
//Access     Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
    await User.findOneAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
});
