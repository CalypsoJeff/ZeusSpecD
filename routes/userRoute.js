const express = require("express");
const userRoute = express.Router();
const usercontroller = require("../controllers/userController");
const addressController = require("../controllers/addressController");
const cartController = require("../controllers/cartController");
const orderController = require("../controllers/orderController");
const userAuth = require("../middleware/userAuth");
const setErrorMessage = require("../middleware/errormsg");
const { generateInvoicePdf } = require("../helper/pdfGenerator");


userRoute.use(setErrorMessage);

userRoute.use((req, res, next) => {
  req.app.set("layout", "user/layout/user");

  next();
});

userRoute.get("/", usercontroller.loadlandingpage);
userRoute.get("/login", usercontroller.loadloginpage);

userRoute.get(
  "/registration",
  userAuth.isLogout,
  usercontroller.loadregistration
);

userRoute.post("/registration", usercontroller.register);
userRoute.post("/login", usercontroller.login);
userRoute.get("/about", usercontroller.loadaboutpage);
userRoute.get("/shop", usercontroller.loadshoppage);
userRoute.get("/contact", usercontroller.loadcontactpage);
userRoute.get("/product", usercontroller.loadproductdetailspage);
userRoute.get("/login", userAuth.isLogout, usercontroller.loadloginpage);
userRoute.get("/", userAuth.isLogin, usercontroller.loadlandingpage);

userRoute.get("/otp", userAuth.isLogout, usercontroller.sendOTPpage);
userRoute.post("/otp", usercontroller.verifyOTP);
userRoute.get("/reSendOTP", usercontroller.reSendOTP);
userRoute.post("/reSendOTP", usercontroller.verifyResendOTP);
userRoute.get("/account", usercontroller.accountPage);
userRoute.get("/logout", userAuth.isLogin, usercontroller.logout);

// resetpassword
userRoute.get("/forget", userAuth.isLogout, usercontroller.forgetLoad);
userRoute.post("/forget", userAuth.isLogout, usercontroller.forgetpswd);
userRoute.get(
  "/forget-password",
  userAuth.isLogout,
  usercontroller.forgetPswdload
);
userRoute.post("/forget-password", userAuth.isLogout, usercontroller.resetPswd);

// userProfile
userRoute.get("/userprofile", userAuth.isLogin, usercontroller.loaduserprofile);
userRoute.post("/userprofile", usercontroller.editProfilePost);

//ADDRESS
userRoute.get("/address", userAuth.isLogin, addressController.getAllAddress);
userRoute.get(
  "/addAddress",
  userAuth.isLogin,
  addressController.addAddressPage
);
userRoute.post("/addAddress", userAuth.isLogin, addressController.newAddress);
userRoute.get(
  "/editAddress",
  userAuth.isLogin,
  addressController.editAddressPage
);
userRoute.post("/editAddress", userAuth.isLogin, addressController.editAddress);
userRoute.get(
  "/deleteAddress/:id",
  userAuth.isLogin,
  addressController.deleteAddress
);

// Add to Cart
userRoute.get(
  "/shoppingcart",
  userAuth.isLogin,
  cartController.loadshopcartpage
);
userRoute.post("/shoppingcart", userAuth.isLogin, cartController.addToCart);
userRoute.get("/removecart", cartController.removeProduct);

//update cart
userRoute.post("/updateCart", userAuth.isLogin, cartController.updateCart);

//checkOut
userRoute.get("/checkOut", userAuth.isLogin, cartController.loadCheckOutpage);
userRoute.post(
  "/confirm-order",
  userAuth.isLogin,
  orderController.confirmOrder
);
userRoute.get("/orderList", userAuth.isLogin, orderController.loadOrderList);
userRoute.get("/orderDetailing", orderController.loadorderDetailing);
userRoute.get("/invoice", generateInvoicePdf);
userRoute.post(
  "/verify-payment",
  userAuth.isLogin,
  orderController.verifyPayment
);


// order
userRoute.get("/cancelOrder/:id", orderController.cancelOrder);
userRoute.post("/cancelSingleOrder", orderController.cancelOrderById);
userRoute.post("/requestReturn", orderController.returnOrderById);
userRoute.post("/acceptReturn/:id", orderController.acceptReturn);
userRoute.post("/rejectReturn/:id", orderController.rejectReturn);
//refund amount to bank
userRoute.post("/refundToBank", userAuth.isLogin, orderController.refundToBank);

userRoute.post("/addToWallet", userAuth.isLogin, orderController.addToWallet);

//load wallet page
userRoute.get("/wallet", userAuth.isLogin, orderController.loadWallet);

module.exports = userRoute;
