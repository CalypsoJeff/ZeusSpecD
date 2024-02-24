const mongoose = require("mongoose");
const User = require("../models/usermodels");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");
const coupons = require("../models/couponModel");
const userWallet = require("../models/walletModel");
require("dotenv").config();
const Razorpay = require("razorpay");
const verifyOrderPayment = require("../helper/razorpay");


const razorpay = new Razorpay({
  key_id: process.env.key_id,
  key_secret: process.env.key_secret,
});
const confirmOrder = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const addressId = req.body.selectedAddress;
    const paymentMethod = req.body.selectedPaymentMethod;
    const total = req.body.total;

    let cart = await Cart.findOne({ user_id: userId }).populate(
      "products.productId"
    );

    // Apply coupon information outside the order object
    const appliedCoupon = (req.body.appliedCoupon || "").trim();
    let discountAmount = total;
    if (appliedCoupon !== "") {
      let coupon = await coupons.findOne({ couponName: appliedCoupon.trim() });
      if (coupon) {
        coupon.usedBy = userId;
        await coupon.save();
      } else {
        console.log("Coupon not found");
      }
    }

    const order = {
      user: req.session.user_id,
      address: addressId,
      paymentMethod: paymentMethod,
      couponUsed: req.body.appliedCoupon,
      products: cart.products.map((item) => {
        return {
          product: item.productId,
          quantity: item.quantity,
          price: item.productId.salePrice,
          total: item.subTotal,
        };
      }),
      coupon: appliedCoupon,
      grandTotal: discountAmount,
    };

    if (
      order.paymentMethod === "cashonDelivery" ||
      order.paymentMethod === "wallet"
    ) {
      for (const item of order.products) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { sold: item.quantity },
        });
        const productId = item.product;
        const orderedQuantity = item.quantity;

        await Product.findByIdAndUpdate(
          productId,
          { $inc: { quantity: -orderedQuantity } },
          { new: true }
        );
      }

      const orderData = await Order.insertMany(order);
      await Cart.findOneAndUpdate(
        { user_id: userId },
        { $set: { products: [], total: 0 } }
      );

      // Update wallet if payment method is 'wallet'
      if (order.paymentMethod === "wallet") {
        const wallet = await userWallet.findOne({ userId: userId });

        if (!wallet || wallet.balance < order.grandTotal) {
          return res
            .status(400)
            .json({ message: "Insufficient wallet balance" });
        }

        const data = {
          amount: order.grandTotal,
          orderId: orderData[0]._id,
          date: orderData[0].orderDate,
        };
        // Deduct the order total from the wallet balance
        await userWallet.updateOne(
          { userId: userId },
          {
            $push: {
              expense: data,
            },
            $inc: { balance: -order.grandTotal },
          }
        );

        // Update user model (optional)
        await User.updateOne(
          { _id: userId },
          { $inc: { wallet: -order.grandTotal } }
        );
      }
      return res.status(200).json({ message: "success" });
    } else if (order.paymentMethod === "razorpay") {
      const razorpayOrder = await razorpay.orders.create({
        amount: order.grandTotal * 100, // Amount in paise
        currency: "INR",
        receipt: "orderId",
        payment_capture: 1, // Auto-capture payment
      });
      res.status(200).json({
        message: "success",
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
        },
        orderDetails: order,
      });
    }
  } catch (error) {
    console.log(error);
  }
};


const verifyPayment = async (req, res) => {
  try {
    verifyOrderPayment(req.body)
      .then(async () => {
        const userId = req.session.user_id;
        const user = await User.findById(userId);
        const cart = await Cart.findOne({ user_id: userId });
        const orderData = req.body.orderdetails;
        const orderDocument = await Order.create(orderData);

        if (orderDocument) {
          for (const product of cart.products) {
            const productId = product.productId;
            const orderedQuantity = product.quantity;

            console.log(
              "productId:-",
              productId,
              "orderedQuantity:-",
              orderedQuantity,
              "Product:-",
              Product
            );

            await Product.findByIdAndUpdate(
              productId,
              { $inc: { quantity: -orderedQuantity } },
              { new: true }
            );
          }

          await Cart.findOneAndUpdate(
            { user_id: userId },
            { $set: { products: [], total: 0 } }
          );

          req.session.cartQuantity = null;
          res.status(200).json({ status: "success" });
        } else {
          res.status(400).json({
            status: "error",
            msg: "Payment verification failed",
          });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(400);
      });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      status: "error",
      msg: "Payment verification failed",
    });
  }
};

//refund amount to bank
const refundToBank = async (req, res) => {
  let paymentId = req.body.paymentId;
  let refundAmount = req.body.refundAmount * 100;
  razorpay.payments.refund(
    paymentId,
    { amount: refundAmount },
    (err, refund) => {
      if (err) {
        res
          .status(500)
          .send({ errMsg: "Can not refund amount right now, try again later" });
      } else {
        res.status(200).send(refund);
      }
    }
  );
};

//add refund amount to wallet
const addToWallet = async (req, res) => {
  try {
    let refundAmount = req.body.refundAmount;
    let data = {
      amount: refundAmount,
      orderId: req.body.orderId,
      date: new Date(),
      description: req.body.description,
    };

    // Update userWallet
    await userWallet.updateOne(
      { userId: req.session.user_id },
      {
        $inc: { balance: refundAmount },
        $push: { income: data },
        $pull: { expense: { orderId: req.body.orderId } },
      },
      { upsert: true }
    );

    // Update user model (optional)
    await User.updateOne(
      { _id: req.session.user_id },
      { $inc: { wallet: refundAmount } }
    );

    // Send a success response
    res.status(200).send("Amount added to wallet successfully");
  } catch (error) {
    console.error("Error adding amount to wallet:", error);
    res.status(500).send("Internal Server Error");
  }
};

const loadSuccess = async (req, res) => {
  try {
    const user = req.session.user_id;
    res.render("successPage", { user });
  } catch (error) {
    console.log(error.message);
  }
};

const loadOrderList = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId);
    const orderDetails = await Order.find({ user: userId })
      .populate({
        path: "products.product",
        select: "primaryImage", // Select the fields you need
      })
      .sort({ createdAt: -1 })
      .exec();
    res.render("./user/pages/orderDetails", { orderDetails, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const loadorderDetailing = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId);
    const orderId = req.query.id;
    const orderDetails = await Order.findOne({ user: userId, _id: orderId })
      .populate({
        path: "products.product",
        select: "title primaryImage",
      })
      .populate("address")
      .exec();

    if (!orderDetails) {
      return res.status(404).send("Order details not found");
    }

    res.render("./user/pages/orderDetailing", { orderDetails, user });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const result = await cancelOrderById(orderId);
    if (result === "redirectBack") {
      res.redirect("back");
    } else {
      res.json(result);
    }
  } catch (error) {
    throw new Error(error);
  }
};

const cancelOrderById = async (req, res, next) => {
  try {
    const orderId = req.body.orderId;
    const order = await Order.findById(orderId).populate("products.product");
    if (order.products.every((item) => item.returnStatus === "Cancelled")) {
      return "Order is already cancelled";
    }

    if (
      order.paymentMethod === "cashonDelivery" &&
      order.products.every((item) => {
        return item.returnStatus === "Pending" ? false : true;
      })
    ) {
      // Update product quantities and sold counts for each order item
      for (const item of order.products) {
        const updatedOrderItem = await Order.findByIdAndUpdate(
          item._id,
          {
            $set: { "products.$.returnStatus": "Cancelled" },
          },
          { new: true }
        );

        const cancelledProduct = await Product.findById(item.product);
        cancelledProduct.quantity += item.quantity;
        cancelledProduct.sold -= item.quantity;
        await cancelledProduct.save();
      }

      // Update order status
      await Order.findByIdAndUpdate(orderId, {
        status: "Cancelled",
      });

      return res.status(200).json({ status: true });
    } else if (
      order.paymentMethod === "razorpay" &&
      order.products.every((item) => {
        return item.returnStatus === "Pending" ? false : true;
      })
    ) {
      // Update product quantities and sold counts for each order item
      for (const item of order.products) {
        const updatedOrderItem = await Order.findByIdAndUpdate(
          item._id,
          {
            $set: { "products.$.returnStatus": "Cancelled" },
          },
          { new: true }
        );

        const cancelledProduct = await Product.findById(item.product);
        cancelledProduct.quantity += item.quantity;
        cancelledProduct.sold -= item.quantity;
        await cancelledProduct.save();
      }

      // Update order status
      await Order.findByIdAndUpdate(orderId, {
        status: "Cancelled",
      });

      return res.status(200).json({ status: true });
    } else {
      return "Payment not completed for all items";
    }
  } catch (error) {
    throw new Error(error);
  }
};

const returnOrderById = async (req, res, next) => {
  try {
    const orderId = req.body.orderId;
    const order = await Order.findById(orderId).populate("products.product");
    if (order.products.every((item) => item.returnStatus === "Cancelled")) {
      return res
        .status(400)
        .json({ status: false, message: "Order is already cancelled" });
    }

    const paymentCompleted = order.products.every(
      (item) => item.returnStatus !== "Delivered"
    );
    if (!paymentCompleted) {
      return res
        .status(400)
        .json({
          status: false,
          message: "Payment not completed for all items",
        });
    }

    // Update product quantities and sold counts for each order item
    for (const item of order.products) {
      const updatedOrderItem = await Order.findByIdAndUpdate(
        item._id,
        { $set: { "products.$.returnStatus": "Return Requested" } },
        { new: true }
      );

      const returnedProduct = await Product.findById(item.product);
      await returnedProduct.save();
    }

    // Update order status
    await Order.findByIdAndUpdate(orderId, { status: "Return Requested" });
    return res.status(200).json({ status: true, message: "Return Requested" });
  } catch (error) {
    console.error("Error handling return:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

const rejectReturn = async (req, res) => {
  try {
    const orderId = req.params.id;
    const result = await rejectReturnById(orderId);
    if (result === "Return Rejected") {
      res.status(200).json({ status: true });
    } else {
      res.status(400).json({ status: false, error: "Failed to reject return" });
    }
  } catch (error) {
    console.error("Error rejecting return:", error);
    res.status(500).json({ status: false, error: "Internal Server Error" });
  }
};

const rejectReturnById = async (orderId) => {
  try {
    // Assuming you have a function to find and update order status in your database
    const order = await Order.findByIdAndUpdate(orderId, {
      status: "Return Rejected",
    });

    if (order) {
      return "Return Rejected";
    } else {
      return "Failed to reject return";
    }
  } catch (error) {
    throw new Error(error);
  }
};
const acceptReturn = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.session.user_id;
    const result = await acceptReturnById(orderId, userId);

    if (result === "Return Accepted") {
      res.status(200).json({ status: true });
    } else {
      res.status(400).json({ status: false, error: "Failed to accept return" });
    }
  } catch (error) {
    console.error("Error accepting return:", error);
    res.status(500).json({ status: false, error: "Internal Server Error" });
  }
};

// Function to update order status to "Return Accepted"
const acceptReturnById = async (orderId, userId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return "Order not found";
    }
    if (order.status === "Return Accepted") {
      return "Return is already accepted";
    }

    if (
      order.paymentMethod === "razorpay" ||
      order.paymentMethod === "wallet"
    ) {
      const refundAmount = order.grandTotal;
      await refundToWallet(order.user, refundAmount, orderId, userId);

      order.status = "Return Accepted";
      await order.save();

      return "Return Accepted and amount refunded to wallet";
    } else {
      order.status = "Return Accepted";
      await order.save();

      return "Return Accepted";
    }
  } catch (error) {
    throw new Error(error);
  }
};

const calculateRefundAmount = (products) => {
  let refundAmount = 0;
  for (const item of products) {
    refundAmount += item.price * item.quantity;
  }
  return refundAmount;
};

const refundToWallet = async (userId, refundAmount, orderId, username) => {
  try {
    const wallet = await userWallet.findOne({ userId });

    if (wallet) {
      wallet.balance += refundAmount;
      wallet.income.push({
        amount: refundAmount,
        orderId: orderId, 
        date: new Date(),
        description: "Refund from return acceptance",
      });
      wallet.username = username; 
      await wallet.save();
    } else {
      await userWallet.create({
        userId,
        username: username, 
        balance: refundAmount,
        income: [
          {
            amount: refundAmount,
            orderId: orderId,
            date: new Date(),
            description: "Refund from return acceptance",
          },
        ],
      });
    }
  } catch (error) {
    throw new Error(error);
  }
};



// Load wallet with pagination
const loadWallet = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId);

    const { incomePage, expensePage } = req.query;

    const incomePageNumber = parseInt(incomePage, 10) || 1;
    const expensePageNumber = parseInt(expensePage, 10) || 1;

    const itemsPerPage = 2;

    const wallet = await userWallet.findOne({ userId: req.session.user_id });

    const startIndexIncome = (incomePageNumber - 1) * itemsPerPage;
    const endIndexIncome = startIndexIncome + itemsPerPage;
    const paginatedIncome =
      wallet?.income.slice(startIndexIncome, endIndexIncome) || [];

    const startIndexExpense = (expensePageNumber - 1) * itemsPerPage;
    const endIndexExpense = startIndexExpense + itemsPerPage;
    const paginatedExpense =
      wallet?.expense.slice(startIndexExpense, endIndexExpense) || [];

    const totalIncomePages = Math.ceil(
      (wallet?.income.length || 0) / itemsPerPage
    );
    const totalExpensePages = Math.ceil(
      (wallet?.expense.length || 0) / itemsPerPage
    );

    res.render("user/pages/wallet", {
      title: "My Wallet",
      wallet: wallet?.balance || 0,
      loggedIn: true,
      username: req.session.user,
      walletData: wallet,
      income: paginatedIncome,
      expense: paginatedExpense,
      user,
      totalIncomePages,
      totalExpensePages,
      currentIncomePage: incomePageNumber,
      currentExpensePage: expensePageNumber,
    });
  } catch (error) {
    console.error("Error loading wallet:", error);
    res.status(500).send("Internal Server Error");
  }
};


module.exports = {
  loadSuccess,
  confirmOrder,
  loadorderDetailing,
  loadOrderList,
  cancelOrder,
  cancelOrderById,
  refundToBank,
  addToWallet,
  loadWallet,
  verifyPayment,
  returnOrderById,
  acceptReturn,
  rejectReturn,
};
