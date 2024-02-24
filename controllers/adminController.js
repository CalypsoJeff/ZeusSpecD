const mongoose = require("mongoose");
const User = require("../models/usermodels");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const coupons = require("../models/couponModel");
const numeral = require("numeral");
const moment = require("moment");
const loadLogin = async (req, res) => {
  try {
    res.render("./admin/pages/acclogin", { title: "Login" });
  } catch (error) {
    throw new Error(error);
  }
};

const loadDashboard = async (req, res) => {
  try {
    const user = req?.user;
    const recentOrders = await Order.find()
      .limit(5)
      .populate({
        path: "user",
        select: "username",
      })
      .select("orderDate grandTotal")
      .sort({ _id: -1 });
    let totalSalesAmount = 0;
    recentOrders.forEach((order) => {
      totalSalesAmount += order.grandTotal;
    });

    totalSalesAmount = numeral(totalSalesAmount).format("0.0a");
    const totalSoldProducts = await Order.aggregate([
  {
    $match: { status: "Delivered" }, // Filter orders by 'Delivered' status
  },
  {
    $unwind: "$products", // Flatten the products array
  },
  {
    $group: {
      _id: null,
      total_sold_count: {
        $sum: "$products.quantity", // Sum up all quantities of delivered products
      },
    },
  },
]);

    const totalOrderCount = await Order.countDocuments();
    const totalActiveUserCount = await User.countDocuments();

    res.render("./admin/pages/index", {
      title: "Dashboard",
      user,
      recentOrders,
      totalOrderCount,
      totalActiveUserCount,
      totalSalesAmount,
      moment,
      totalSoldProducts: totalSoldProducts[0].total_sold_count,
    });
  } catch (error) {
    throw new Error(error);
  }
};
// Admin Logout--
const adminlogout = async (req, res) => {
  try {
    req.session.admin = null;
    res.redirect("/admin");
  } catch (error) {
    throw new Error(error);
  }
};

const loadproductlist = async (req, res) => {
  try {
    res.render("./admin/pages/productlist", { title: "ProductList" });
  } catch (error) {
    throw new Error(error);
  }
};

// Login

const adminPanel = async (req, res) => {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const emailCheck = req.body.email;
    const user = await User.findOne({ email: emailCheck });
    if (user) {
      res.render("./admin/pages/acclogin", {
        adminCheck: "You are not an Admin",
        title: "Login",
      });
    }
    if (emailCheck === email && req.body.password === password) {
      req.session.admin = email;
      res.redirect("/admin/dashboard");
    } else {
      res.render("./admin/pages/acclogin", {
        adminCheck: "Invalid Credentials",
        title: "Login",
      });
    }
  } catch (error) {
    throw new Error(error);
  }
};

//USER MANAGEMENT

const userManagement = async (req, res) => {
  try {
    const findUsers = await User.find();
    res.render("./admin/pages/userList", {
      users: findUsers,
      title: "UserList",
    });
  } catch (error) {
    throw new Error(error);
  }
};

// searchUser
const searchUser = async (req, res) => {
  try {
    const data = req.body.search;
    const searching = await User.find({
      userName: { $regex: data, $options: "i" },
    });
    if (searching) {
      res.render("./admin/pages/userList", {
        users: searching,
        title: "Search",
      });
    } else {
      res.render("./admin/pages/userList", { title: "Search" });
    }
  } catch (error) {
    throw new Error(error);
  }
};

const useraction = async (req, res) => {
  const userID = req.query.id;
  const action = req.query.action;
  try {
    const user = await User.findById(userID);
    if (!user) {
      return res.status(400).send("user not found");
    }
    if (action === "block") {
      user.isBLock = true;
      req.session.user_id = null;
    } else if (action === "unblock") {
      user.isBLock = false;
    }
    await user.save();
    res.redirect("/admin/user");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
};

const loadorders = async (req, res) => {
  try {
    const pageSize = 10;
    const currentPage = parseInt(req.query.page) || 1;
    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / pageSize);

    const orders = await Order.find()
      .populate("address")
      .sort({ orderDate: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize);
    res.render("./admin/pages/orders", {
      title: "order",
      orders,
      totalPages,
      currentPage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const loadorderdetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId)
      .populate("address")
      .populate("products.product")
      .populate("user");
    res.render("./admin/pages/orderdetails", { title: "order", order });
  } catch (error) {
    throw new Error(error);
  }
};

const OrderStatusupdate = async (req, res) => {
  const orderId = req.params.id;
  const newStatus = req.body.status;

  try {
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status: newStatus },
      { new: true }
    );
    res.redirect(`/admin/orderdetails/${orderId}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

//salesreport
const salesReportpage = async (req, res) => {
  try {
    res.render("admin/pages/salesreport", { title: "Sales Report" });
  } catch (error) {
    throw new Error(error);
  }
};

const generateSalesReport = async (req, res, next) => {
  try {
    const fromDate = new Date(req.query.fromDate);
    const toDate = new Date(req.query.toDate);
    const deliveryStatus = "Delivered";

    // Fetch orders within the specified date range and with the specified status
    const salesData = await Order.find({
      orderDate: {
        $gte: fromDate,
        $lte: toDate,
      },
      status: deliveryStatus,
    })
      .select("_id grandTotal orderDate paymentMethod products")
      .populate({
        path: "products.product", // Correct path to match the schema
        select: "title salePrice quantity", // Selecting fields from the Product document
      })
      .lean();

    // Formatting sales data to include detailed product information
    const formattedSalesData = salesData.map((order) => ({
      orderId: order._id,
      grandTotal: order.grandTotal,
      orderDate: order.orderDate.toLocaleDateString(),
      paymentMethod: order.paymentMethod,
      products: order.products.map(({ product, quantity }) => ({
        // Destructure to access both product details and quantity directly
        name: product.title,
        price: product.salePrice,
        quantity: quantity, // Use the order-specific quantity, not the one in product document
      })),
    }));

    // Send the formatted data as JSON response
    res.status(200).json(formattedSalesData);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

const getSalesData = async (req, res) => {
  try {
    const pipeline = [
      {
        $project: {
          year: { $year: "$orderDate" },
          month: { $month: "$orderDate" },
          totalSales: "$grandTotal",
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          sales: { $sum: "$totalSales" },
        },
      },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              {
                $cond: {
                  if: { $lt: ["$_id.month", 10] },
                  then: { $concat: ["0", { $toString: "$_id.month" }] },
                  else: { $toString: "$_id.month" },
                },
              },
            ],
          },
          sales: "$sales",
        },
      },
    ];

    const monthlySalesArray = await Order.aggregate(pipeline);
    res.json(monthlySalesArray);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get Sales Data yearly

const getSalesDataYearly = async (req, res) => {
  try {
    const yearlyPipeline = [
      {
        $project: {
          year: { $year: "$orderDate" },
          totalSales: "$grandTotal",
        },
      },
      {
        $group: {
          _id: { year: "$year" },
          sales: { $sum: "$totalSales" },
        },
      },
      {
        $project: {
          _id: 0,
          year: { $toString: "$_id.year" },
          sales: "$sales",
        },
      },
    ];

    const yearlySalesArray = await Order.aggregate(yearlyPipeline);
    res.json(yearlySalesArray);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// get sales data weekly
const getSalesDataWeekly = async (req, res) => {
  try {
    const weeklySalesPipeline = [
      {
        $project: {
          week: { $week: "$orderDate" },
          totalSales: "$grandTotal",
        },
      },
      {
        $group: {
          _id: { week: { $mod: ["$week", 7] } },
          sales: { $sum: "$totalSales" },
        },
      },
      {
        $project: {
          _id: 0,
          week: { $toString: "$_id.week" },
          dayOfWeek: { $add: ["$_id.week", 1] },
          sales: "$sales",
        },
      },
      {
        $sort: { dayOfWeek: 1 },
      },
    ];

    const weeklySalesArray = await Order.aggregate(weeklySalesPipeline);
    res.json(weeklySalesArray);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//Manage Coupons
const manageCoupons = async (req, res) => {
  let page = parseInt(req.params.page) || 1;
  let perPage = 5;
  let allCoupons = await coupons
    .find({})
    .skip((page - 1) * perPage)
    .limit(perPage);
  let totalCoupons = await coupons.countDocuments({});
  let totalPages = Math.ceil(totalCoupons / perPage);
  allCoupons.forEach((coupon) => {
    coupon.expiredOn = convertDateAndTime(coupon.expiryDate);
  });
  res.render("admin/pages/manageCoupons", {
    title: "Coupon Management",
    coupons: allCoupons,
    totalPages,
    currentPage: page,
  });
  res.end();
};

const addCoupon = async (req, res) => {
  res.render("admin/pages/addCoupon", { title: "Add New Coupon" });
  res.end();
};

const insertCoupon = async (req, res) => {
  await coupons.create(req.body);
  res.render("admin/pages/addCoupon", {
    title: "Add New Coupon",
    alert: "New coupon " + req.body.couponName + " added.",
  });
  res.end();
};

function convertDateAndTime(dateString) {
  let dateObject = new Date(dateString);
  let dayOfWeek = dateObject.getDay();
  // Convert to a custom date string format
  let options = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  let day = dateObject.toLocaleString("en-US", options);

  // Convert time to Indian Standard Time (IST)
  options = {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZone: "Asia/Kolkata",
  };
  let time = dateObject.toLocaleString("en-US", options);

  return { day, time, dayOfWeek, dateString };
}

module.exports = {
  loadLogin,
  loadDashboard,
  loadproductlist,
  adminPanel,
  adminlogout,
  userManagement,
  searchUser,
  useraction,
  loadorders,
  loadorderdetails,
  OrderStatusupdate,
  salesReportpage,
  generateSalesReport,
  getSalesData,
  getSalesDataYearly,
  getSalesDataWeekly,
  manageCoupons,
  addCoupon,
  insertCoupon,
};
