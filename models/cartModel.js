const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: {
          type: Number,
        },
        subTotal: {
          type: Number,
        },
      },
    ],
    total: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Export the model
module.exports = mongoose.model("Cart", cartSchema);
