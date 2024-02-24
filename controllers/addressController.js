const { default: mongoose } = require("mongoose");
const Address = require("../models/addressModel");
const User = require("../models/usermodels");
const asyncHandler = require("express-async-handler");

const getAllAddress = asyncHandler(async (req, res) => {
  const userId = req.session.user_id;
  const user = await User.findById(userId);
  const address = await Address.find({ user: userId });
  res.render("user/pages/address", { address, account: true, user });
});

const addAddressPage = asyncHandler(async (req, res) => {
  const userId = req.session.user_id;
  const user = await User.findById(userId);
  res.render("user/pages/addAddress", { user });
});

//POST request for storing new address
const newAddress = asyncHandler(async (req, res) => {
  const user = req.session.user_id;
  req.body.user_id = req.session.user_id;
  let data = {};
  data = req.body;
  data.user = req.body.user_id;
  const newAddress = await Address.create(req.body);
  if (newAddress) {
    res.redirect("/address");
  } else {
    throw new Error();
  }
});
// editAddressPage laoding
const editAddressPage = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId);
    const address = await Address.findById(req.query.id);
    res.render("./user/pages/editAddress", { address, user });
  } catch (error) {
    throw error;
  }
};

// updateAddress Post
const editAddress = asyncHandler(async (req, res) => {
  try {
    const id = new mongoose.Types.ObjectId(req.body.userId);
    const saveAddress = {
      user_name: req.body.name,
      address: req.body.address,
      town: req.body.city,
      state: req.body.state,
      pincode: req.body.pincode,
      phone: req.body.mobile,
    };
    const save = await Address.findByIdAndUpdate(
      { _id: id },
      { $set: saveAddress },
      { new: true }
    );
    if (!save) {
      return res.status(404).json({ error: "Update failed" });
    } else {
      return res.status(200).json({ message: "data updated succesfully" });
    }
  } catch (error) {
    throw new Error(error);
  }
});
const deleteAddress = asyncHandler(async (req, res) => {
  try {
    const id = req.params.id;
    const deleteAddress = await Address.findOneAndDelete({ _id: id });
    res.redirect("/address");
  } catch (error) {
    throw new Error(error);
  }
});
module.exports = {
  getAllAddress,
  addAddressPage,
  newAddress,
  editAddressPage,
  editAddress,
  deleteAddress,
};
