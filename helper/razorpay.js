require("dotenv").config();

module.exports = (details) => {
  return new Promise((resolve, reject) => {
    try {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", process.env.key_secret);
      hmac.update(
        details.payment.razorpay_order_id +
          "|" +
          details.payment.razorpay_payment_id
      );
      hmac = hmac.digest("hex");

      if (hmac === details.payment.razorpay_signature) {
        resolve();
      } else {
        reject(new Error("Signature verification failed"));
      }
    } catch (error) {
      console.error("Verify Exception:", error);
      reject(error);
    }
  });
};
