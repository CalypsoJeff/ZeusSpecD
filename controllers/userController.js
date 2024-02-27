const User = require("../models/usermodels.js");
const Wallet = require("../models/walletModel")
const bcrypt = require("bcrypt");
const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Banner = require('../models/bannerModel.js')
const { sendOtp } = require("../utility/nodeMailer.js");
const randomstring = require("randomstring");
const { sendVerifymail } = require("../utility/nodeMailer.js");
const { generateOTP } = require("../utility/nodeMailer.js"); // Adjust the path accordingly

const loadlandingpage = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId);
    const allBanner = await Banner.find({ status: 'active' });
    const getalldata = await Product.find();
    res.render("./user/pages/home", { getalldata, user , allBanner });
  } catch (error) {
    throw new Error(error);
  }
};

const loadloginpage = async (req, res) => {
  try {
    const user = req.session.user_id;

    res.render("./user/pages/login", { user });
  } catch (error) {
    throw new Error(error);
  }
};

const loadregistration = async (req, res) => {
  try {
    const user = req.session.user_id;
    res.render("./user/pages/registration", { user });
  } catch (error) {
    throw new Error(error);
  }
};

const loadaboutpage = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId);
    res.render("./user/pages/about", { user });
  } catch (error) {
    throw new Error(error);
  }
};

const loadcontactpage = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId);
    res.render("./user/pages/contact", { user });
  } catch (error) {
    throw new Error(error);
  }
};



const loadshoppage = async (req, res) => {
  try {
      const priceRange = req.query.priceRange || "all";
      const sortBy = req.query.sortBy || "priceLowToHigh";
      const page = req.query.p || 1;
      const search = req.query.search || "";

      const listedCategories = await Category.find({ isListed: true });
      const categoryMapping = {};

      listedCategories.forEach((category) => {
          categoryMapping[category.categoryName] = category._id;
      });

      const catfilter = { isListed: true };
      if (req.query.category) {
          if (categoryMapping.hasOwnProperty(req.query.category)) {
              catfilter.categoryName = categoryMapping[req.query.category];
          } else {
              return res.status(404).send("Category not found");
          }
      }

      let minPrice = 0;
      let maxPrice = Number.MAX_VALUE;
      switch (priceRange) {
          case "10000-20000":
              minPrice = 10000;
              maxPrice = 20000;
              break;
          case "20000-50000":
              minPrice = 20000;
              maxPrice = 50000;
              break;
          case "50000-100000":
              minPrice = 50000;
              maxPrice = 100000;
              break;
          case "100000-150000":
              minPrice = 100000;
              maxPrice = 150000;
              break;
          case "150000+":
              minPrice = 150000;
              break;
          default:
              break;
      }

      let sortQuery = {};
      if (sortBy === "priceLowToHigh") {
          sortQuery = { salePrice: 1 };
      } else if (sortBy === "priceHighToLow") {
          sortQuery = { salePrice: -1 };
      }

      const filter = { salePrice: { $gte: minPrice, $lte: maxPrice }};
      const searchFilter = search ? { title: { $regex: search, $options: "i" } } : {};

      const totalProducts = await Product.find({
          ...filter,
          ...catfilter,
          ...searchFilter,
      }).countDocuments();

      const products = await Product.find({
          ...filter,
          ...catfilter,
          ...searchFilter,
      }).sort(sortQuery);
      const getalldata = await Product.find();

      const user = await User.findById(req.session.user_id);

      res.render("./user/pages/shop", {
        getalldata,
          product:products,
          sortBy,
          priceRange,
          search,
          user,
          currentPage: page,
          totalProducts,
          categories: listedCategories,
          selectedCategory: catfilter.categoryName || "",
      });
  } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
  }
};


function generateRandomReferralCode() {

  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeLength = 6;
  let referralCode = '';
  for (let i = 0; i < codeLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      referralCode += characters.charAt(randomIndex);
  }
  return referralCode;
}


const register = async (req, res) => {
  try {
    const { email, username, password, referralCode } = req.body;
    const emailCheck = email
    const userReferal = generateRandomReferralCode()
    let referredBy = null
    if(referralCode){
      let referralCodeUser = await User.findOne({ referralCode: referralCode });
      referredBy = referralCodeUser._id
    }
    const checkData = await User.findOne({ email: emailCheck });
    if (checkData) {
      const user = req.session.user_id;
      return res.render("./user/pages/registration", {
        userCheck: "User already exists, please try with a new email",
        user,
      });
    } else {
      const UserData = {
        username: username,
        email: email,
        password: password,
        referralCode: userReferal,
        referredBy:referredBy
      };

      const OTP = generateOTP(); /** otp generating **/
      req.session.otpUser = { ...UserData, otp: OTP };
      req.session.referralCode = referralCode;
      console.log(req.session.otpUser.otp);

      /***** otp sending ******/
      try {
        sendOtp(email, OTP, username);
        return res.redirect("/otp");
      } catch (error) {
        console.error("Error sending OTP:", error);
        return res.status(500).send("Error sending OTP");
      }
    }
  } catch (error) {
    throw new Error(error);
  }
};
/*************** OTP Section *******************/
// loadSentOTP page Loading--
const sendOTPpage = async (req, res) => {
  try {
    const user = req.session.user_id;
    const email = req.session.otpUser;
    res.render("./user/pages/otpVerification", { user });
  } catch (error) {
    throw new Error(error);
  }
};

// verify otp
// const verifyOTP = asyncHandler(async (req, res) => {
//   try {
//     const enteredOTP = req.body.otp;
//     const email = req.session.otpUser.email;
//     const referralCode =  req.session.otpUser.referralCode
//     const storedOTP = req.session.otpUser.otp; // Getting the stored OTP from the session
//     // console.log(storedOTP);
//     const user = req.session.otpUser;
//     let messages = "";

//     if (enteredOTP == storedOTP) {
//       user.password = await bcrypt.hash(user.password, 10);
//       const newUser = await User.create(user);

//       let initialBalance = 0;
//       let referredBy = null;

//       if (referralCode) {
//         const referringUser = await User.findOne({ referralCode: referralCode });
//         if (referringUser) {
//           // Update referring user's wallet with $50
//           await Wallet.findOneAndUpdate(
//             { userId: referringUser._id },
//             { $inc: { balance: 50 } },
//             { new: true }
//           );
//           referredBy = referringUser._id;
//           initialBalance = 100; // Set initial balance for new user to $100
//         }
//       }

//       // Create wallet for new user
//       await new Wallet({
//         userId: newUser._id,
//         username: newUser.username,
//         balance: initialBalance,
//       }).save();
//       delete req.session.otpUser.otp;
//       res.redirect("/login");
//     } else {
//       messages = "Verification failed, please check the OTP or resend it.";
//       console.log("verification failed");
//       res.render("./user/pages/otpVerification", { messages, email , user });
      
//     }
//   } catch (error) {
//     throw new Error(error);
//   }
// });


const verifyOTP = asyncHandler(async (req, res) => {
  try {
    const enteredOTP = req.body.otp;
    const email = req.session.otpUser.email;
    const referralCode =  req.session.otpUser.referralCode
    const storedOTP = req.session.otpUser.otp; 
    const user = req.session.otpUser;

    if (enteredOTP == storedOTP) {
      user.password = await bcrypt.hash(user.password, 10);
      const newUser = await User.create(user);

      let initialBalance = 0;

      if (user.referredBy) {
        const referringUserWallet = await Wallet.findOne({ userId: user.referredBy});
        if (referringUserWallet) {
          // Update referring user's wallet with $50
          await Wallet.findOneAndUpdate(
            { userId: user.referredBy },
            { $inc: { balance: 50 } },
            // { new: true }
          );
          // referringUser.balance += 50
          await referringUserWallet.save()
          initialBalance = 100; // Set initial balance for new user to $100
        }
      }

      // Create wallet for new user
      await new Wallet({
        userId: newUser._id,
        username: newUser.username,
        balance: initialBalance,
      }).save();

      delete req.session.otpUser.otp; // Clear OTP info from the session
      initialBalance = 0
      res.redirect("/login");
    }  else {
      const errorMessage =
        "Verification failed, please check the OTP or resend it.";
      const user = req.session.user_id;
      res.render("./user/pages/otpVerification", { errorMessage, email, user });
    }
  } catch (error) {
    throw new Error(error);
  }
});

//resending otp
const reSendOTP = async (req, res) => {
  try {
    const OTP = generateOTP(); /** otp generating **/
    console.log(OTP);
    req.session.otpUser.otp = { otp: OTP };
    const email = req.session.otpUser.email;
    const username = req.session.otpUser.username;

    // otp resending
    try {
      sendOtp(email, OTP, username);
      const user = req.session.user_id
      return res.render("./user/pages/reSendOTP", { email , user });
    } catch (error) {
      console.error("Error sending OTP:", error);
      return res.status(500).send("Error sending OTP");
    }
  } catch (error) {
    throw new Error(error);
  }
};

//verify resend otp
const verifyResendOTP = asyncHandler(async (req, res) => {
  try {
    const enteredOTP = req.body.otp;
    const storedOTP = req.session.otpUser.otp;
    console.log(storedOTP);

    const user = req.session.otpUser;

    if (enteredOTP == storedOTP.otp) {
      user.password = await bcrypt.hash(user.password, 10);
      const newUser = await User.create(user);
      if (newUser) {
        console.log("new user insert in resend page", newUser);
      } else {
        console.log("error in insert user");
      }
      delete req.session.otpUser.otp;
      res.redirect("/login");
    } else {
      console.log("verification failed");
    }
  } catch (error) {
    throw new Error(error);
  }
});
//LOGIN PAGE
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const allBanner = await Banner.find({ status: 'active' });

    // Find the user by username using async/await
    const user = await User.findOne({ email });
    if (!user) {
      const errorMessage = "Invalid username or password";
      const user = req.session.user_id;
      return res.render("user/pages/login", { errorMessage, user , allBanner });
    } else {
      if (user.isBLock) {
        const errorMessage = "User is blocked. Please contact support.";
        const user = req.session.user_id;

        return res.render("user/pages/login", { errorMessage, user , allBanner});
      }
      if (user && user.isBLock) {
        req.session.user_id = null;
        res.redirect("/login");
      }
      const passwordMatch = await user.verifyPassword(password);
      if (!passwordMatch) {
        const user = req.session.user_id;

        const errorMessage = "Invalid password";
        return res.render("user/pages/login", { errorMessage, user , allBanner });
      } else {
        req.session.user_id = user._id;

        const getalldata = await Product.find();
        res.render("./user/pages/home", { user, getalldata,allBanner });
      }
    }
    // Start a user session
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

// forgetpassword
const forgetLoad = async (req, res) => {
  try {
    const user = req.session.user_id;

    res.render("./user/pages/forgetpassword", { user });
  } catch (error) {
    throw new Error(error);
  }
};

//reset pswd postemail--
const forgetpswd = async (req, res) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({ email: email });
    const users = null;
    if (user) {
      const randomString = randomstring.generate();
      const updateData = await User.updateOne(
        { email: email },
        { $set: { token: randomString } }
      );
      sendVerifymail(user.username, user.email, randomString);
      res.render("./user/pages/forgetpassword", {
        message: "Please check your mail to reset your password",
        user: users,
      });
    } else {
      res.render("./user/pages/forgetpassword", {
        message: "user email is incorrect",
        user: user,
      });
    }
  } catch (error) {
    throw new Error(error);
  }
};

//forget pswd page get---
const forgetPswdload = async (req, res) => {
  try {
    const token = req.query.token;
    const tokenData = await User.findOne({ token: token });
    if (tokenData) {
      res.render("./user/pages/forget-password", { user_id: tokenData._id });
    }
  } catch (error) {
    throw new Error(error);
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

//forget pswd post--
const resetPswd = async (req, res) => {
  try {
    const password = req.body.password;
    const user_id = req.body.user_id;
    const secure_password = await securePassword(password);

    const updateData = await User.findByIdAndUpdate(
      { _id: user_id },
      { $set: { password: secure_password, token: "" } }
    );
    res.render("./user/pages/login", {
      message: "password reset successfully",
      user: user_id,
    });
  } catch (error) {
    throw new Error(error);
  }
};

const loadproductdetailspage = async (req, res) => {
  try {
    const user = req.session.user_id;

    const productId = req.query.id;
    const getalldata = await Product.findById(productId);
    res.render("./user/pages/productDetail", { getalldata, user });
  } catch (error) {
    throw new Error(error);
  }
};
const accountPage = async (req, res) => {
  try {
    const user = req.session.user_id;

    res.render("./user/pages/userprofile", { user });
  } catch (error) {
    throw new Error(error);
  }
};

const logout = async (req, res) => {
  try {
    req.session.user_id = null;
    res.redirect("/");
  } catch (error) {
    throw new Error(error);
  }
};

const loaduserprofile = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId);
    res.render("./user/pages/userprofile", { user });
  } catch (error) {
    throw new Error(error);
  }
};

async function editProfilePost(req, res) {
  const userId = req.session.user_id;
  const user = await User.findOne({ _id: userId });

  const newuserName = req.body.username;
  const newEmail = req.body.email;

  user.username = newuserName;
  user.email = newEmail;
  await user.save();


  res.redirect("/userprofile");
}

module.exports = {
  loadloginpage,
  register,
  sendOTPpage,
  loadregistration,
  loadaboutpage,
  verifyOTP,
  loadcontactpage,
  loadshoppage,
  login,
  loadlandingpage,
  loadproductdetailspage,
  register,
  verifyResendOTP,
  reSendOTP,
  accountPage,
  logout,
  loaduserprofile,
  editProfilePost,
  forgetLoad,
  forgetpswd,
  forgetPswdload,
  resetPswd,
};
