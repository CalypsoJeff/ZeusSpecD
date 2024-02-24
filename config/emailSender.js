const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "jephyjvarghese@gmail.com",
    pass: "cyyp spie ehqo fwhm",
  },
});
module.exports = transporter;
