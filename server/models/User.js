import mongoose from "mongoose";
import bcrypt from "bcryptjs"; // For password hashing and comparison
import jwt from "jsonwebtoken"; // For generating JWT tokens
import crypto from "crypto"; // For generating password reset tokens

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Please provide a username"],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 6,
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    avatar: {
      type: String,
      default: "https://i.pravatar.cc/150",
    },
    goals: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal"
    }],
    activeGoalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      default: null
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

// Middleware to hash password before saving user (pre-save hook)
UserSchema.pre("save", async function (next) {
  // Only hash if the password field is modified or is new
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with hashed password in the database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  // 'this.password' needs to be selected in the query (e.g., .select('+password'))
  // for this comparison to work if 'select: false' is set in schema.
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate and return a JWT token for the user
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: `${process.env.JWT_COOKIE_EXPIRES_IN}d`,
  });
};

// Method to generate and return a password reset token
UserSchema.methods.getResetPasswordToken = function () {
  // Generate a random token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash the reset token and set it to resetPasswordToken field in the schema
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set the token expiration time (e.g., 10 minutes from now)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken; // Return the unhashed token to be sent via email
};

const User = mongoose.model("User", UserSchema);

export default User;
