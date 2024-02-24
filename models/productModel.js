const mongoose = require("mongoose");

var ProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      
    },
    description: {
      type: String,
      
    },
    color:{
      type :String
    },
    brand:{
      type :String
    },
    productPrice: {
      type: Number,
      
    },
    salePrice: {
      type: Number,
      
    },
    categoryName: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },

    quantity: {
      type: Number,
      
    },
    sold: {
      type: Number,
      default: 0,
    },
    primaryImage: [
      {
        name: {
          type: String,
          
        },
        path: {
          type: String,
          
        },
      },
    ],
    secondaryImages: [
      {
        name: {
          type: String,
          
        },
        path: {
          type: String,
          
        },
      },
    ],
    isListed: {
      type: Boolean,
      default: true,
    },
    offer: {
      type: Number,
    },
  },
  { timestamps: true }
);

// Export the model
module.exports = mongoose.model('Product', ProductSchema);