const bcrypt = require("bcrypt");
const mongoose = require("mongoose");


// Declare the Schema of the Mongo model
var userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    isBLock: {
      type: Boolean,
      default: false,
    },

    token: {
      type: String,
      default: "",
    },

    wallet:{
      type:Number,
      required:false
  },

  coupons:[{
      type:mongoose.Schema.Types.ObjectId,
      ref:'coupons',
      required:false
  }],
  
  referralCode: {
    type: String,
    unique: true,
    required: true,
  },
  referredBy: { 
  type: mongoose.Schema.Types.ObjectId, 
  ref: 'User', 
  default: null },

  },
  { timestamps: true }
);

userSchema.methods.verifyPassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};

//Export the model
module.exports = mongoose.model("User", userSchema);
