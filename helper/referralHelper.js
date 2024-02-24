const Wallet = require('../models/walletModel')
const User = require('../models/usermodels')
const ObjectId = require('mongoose').Types.ObjectId;

const generateReferralCode = (length) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  code += 'Temp-';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    code += charset[randomIndex];
  }

  code += '-bake';
  return code;
  
};

// credit for refered user
const creditForReferredUser = async (code) => {
  try {
    const referredUser = await User.findOne({ referralCode: code }).populate('wallet');
    if (!referredUser) return false;

    // Update wallet balance
    const updatedWallet = await Wallet.findByIdAndUpdate(
      referredUser.wallet._id,
      { $inc: { balance: 50 }, $push: { income: { amount: 50, description: "Referral cashback", date: new Date() } } },
      { new: true }
    );

    if (updatedWallet) {
      console.log('Wallet updated for referred user:', updatedWallet);
      return true;
    }
  } catch (error) {
    console.error('Error crediting referred user:', error);
    return false;
  }
};

// Credit for new user
const creditForNewUser = async (user) => {
  try {
    // Assuming the user document already includes a wallet field with an ID
    const updatedWallet = await Wallet.findByIdAndUpdate(
      user.wallet,
      { $inc: { balance: 100 }, $push: { income: { amount: 100, description: "New User referral cashback", date: new Date() } } },
      { new: true }
    );

    if (updatedWallet) {
      console.log('Wallet updated for new user:', updatedWallet);
    }
  } catch (error) {
    console.error('Error crediting new user:', error);
  }
};


module.exports = {
  generateReferralCode,
  creditForReferredUser,
  creditForNewUser
}  