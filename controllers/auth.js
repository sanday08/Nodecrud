const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");
const User = require("../models/User");
const path = require("path");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

//@desc    Register a User
//@route   Post /api/v1/auth
//@access  Public
exports.register = asyncHandler(async (req, res, next) => {
    const { userName, email, phoneNumber, password } = req.body;
    let profileImage = undefined;
    //Check User is exist or not
    let uniqUser = await User.findOne({ userName });
    if (uniqUser) {
        return next(
            new ErrorResponse("User Name already taken! Change the User Name"),
            401
        );
    }

    uniqUser = await User.findOne({ email });
    if (uniqUser) {
        return next(new ErrorResponse("Email address already exists!"), 401);
    }
    //Upload User Profile Image
    if (req.files) {
        const photo = req.files.profileImage;

        //Cheack file type is image like .jpg, .jpeg, .png etc
        if (!photo.mimetype.startsWith("image")) {
            return next(
                new ErrorResponse("Please upload valide image files", 500)
            );
        }
        //Check file size
        if (photo.size > process.env.MAX_FILE_UPLOAD_SIZE) {
            return next(
                new ErrorResponse(
                    "Image size(Maximum 10Mb allowed) is too large",
                    500
                )
            );
        }

        //Rename file
        photo.name = `photo_${userName}_${new Date().getTime()}${
            path.parse(photo.name).ext
        }`;
        photo.mv(
            `${process.env.FILE_UPLOAD_PATH}/${photo.name}`,
            async (err) => {
                if (err) {
                    return next(
                        new ErrorResponse("Problem with file upload", 500)
                    );
                }
            }
        );
        profileImage = photo.name;
    }
    //Create User
    const user = await User.create({
        userName,
        email,
        phoneNumber,
        profileImage,
        password,
    });
    //Create Token
    //   const token = user.getSignedJwtToken();
    //   res.status(200).json({ success: true, token });
    sendTokenResponse(user, 200, res);
});

//@desc     Login user
//@route    Post /api/v1/auth/login
//@access   public

exports.login = asyncHandler(async (req, res, next) => {
    const { userName, password } = req.body;
    //email and password fields are required
    if (!userName && !password) {
        return next(
            new ErrorResponse("UserName and password fields must be required"),
            400
        );
    }
    //Check for user
    const user = await User.findOne({
        $or: [{ email: userName }, { userName }],
    }).select("+password");

    if (!user) {
        return next(new ErrorResponse("Invalide credentials", 401));
    }
    //Check if Password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return next(new ErrorResponse("Invalide credentials", 401));
    }
    //Check active user
    if (!user.isActive) {
        return next(
            new ErrorResponse(
                "Your account is not active please contact support!",
                401
            )
        );
    }
    //Create JWT Token
    sendTokenResponse(user, 200, res);
});

///@desc    Logout user / clear cookie
//@route    GET /api/v1/auth/logout
//@access   Private

exports.logout = asyncHandler(async (req, res, next) => {
    res.cookie("token", "none", {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });

    res.status(200).json({ success: true, data: {} });
});

///@desc     Get current logged in user
//@route    GET /api/v1/auth/me
//@access   private

exports.getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
});

///@desc     Update user details
//@route    PUT /api/v1/auth/updatedetails
//@access   private

exports.updateDetails = asyncHandler(async (req, res, next) => {
    const fieldsToUpdate = { phoneNumber: req.body.phoneNumber };
    if (req.body.userName) {
        fieldsToUpdate.userName = req.body.userName;
    }

    if (req.files) {
        //upload and update profileImage
        const user = await User.findById(req.user._id);

        let profileImage = user.profileImage;

        const photo = req.files.profileImage;
        //Cheack file type is image like .jpg, .jpeg, .png etc
        if (!photo.mimetype.startsWith("image")) {
            return next(
                new ErrorResponse("Please upload valide image files", 500)
            );
        }
        //Check file size
        if (photo.size > process.env.MAX_FILE_UPLOAD_SIZE) {
            return next(
                new ErrorResponse(
                    "Image size(Maximum 10Mb allowed) is too large",
                    500
                )
            );
        }

        //Rename file below if condition help to prevent upload multiple profile image file.
        if (profileImage === "no-photo.jpg" || profileImage === null) {
            photo.name = `photo_${req.user_id}${path.parse(photo.name).ext}`;
            profileImage = photo.name;
        } else photo.name = profileImage;
        photo.mv(
            `${process.env.FILE_UPLOAD_PATH}/${photo.name}`,
            async (err) => {
                if (err) {
                    return next(
                        new ErrorResponse("Problem with file upload", 500)
                    );
                }
            }
        );
        fieldsToUpdate.profileImage = profileImage;
    }

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true,
    });

    res.status(200).json({ success: true, data: user });
});

///@desc     Update Password
//@route    PUT /api/v1/auth/updatepassword
//@access   private

exports.updatePassword = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).select("+password");
    //Check current password (matchPassword method defined in User models)
    if (!(await user.matchPassword(req.body.currentPassword))) {
        next(new ErrorResponse(`Password is incorrect`, 401));
    }
    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
});

//Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    //Create Token
    const token = user.getSignedJwtToken();
    const options = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
    };

    if (process.env.NODE_ENV === "production") {
        options.secure = true;
    }

    res.status(statusCode)
        .cookie("token", token, options)
        .json({ success: true, token });
};
