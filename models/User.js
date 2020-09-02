const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserSchema = new mongoose.Schema({
    //   Rules for userName:

    // Usernames can consist of lowercase and capitals
    // Usernames can consist of alphanumeric characters
    // Usernames can consist of underscore and hyphens and spaces
    // Cannot be two underscores, two hypens or two spaces in a row
    // Cannot have a underscore, hypen or space at the start or end
    userName: {
        type: String,
        unique: true,
        required: [true, "Please add a userName"],
        match: [
            /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/,
            "Please add a valid UserName",
        ],
    },
    email: {
        type: String,
        unique: true,
        required: [true, "Please add an email"],
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            "Please add valid email",
        ],
    },
    phoneNumber: {
        type: String,
        maxLength: 10,
        minlength: 10,
    },
    role: {
        type: String,
        enum: ["user"], //if you write admin than its display error "`admin` is not a valid enum value for path `role`".
        default: "user",
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    profileImage: {
        type: String,
        default: "no-photo.jpg",
    },
    password: {
        type: String,
        required: [true, "Please add a password"],
        minlength: 6,
        select: false,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
        type: Date,
        default: Date.now,
    },
});
//Encrypt password us bcrypt
UserSchema.pre("save", async function () {
    //this condition used when forgot password
    if (!this.isModified("password")) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

//Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

//Match user entered password and hash password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

//Genrate and hash password token
UserSchema.methods.getResetPasswordToken = function () {
    //Genrate Token
    const resetToken = crypto.randomBytes(20).toString("hex");

    //Hask token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    //Set expire
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; //10 minutes
    return resetToken;
};
module.exports = mongoose.model("User", UserSchema);
