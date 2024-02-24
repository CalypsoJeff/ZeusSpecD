const mongoose = require("mongoose")
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const expressHandler = require("express-async-handler");
const fs  = require('fs') 
const sharp = require("sharp");
const path = require("path");
const { upload } = require("../config/upload");

// productManagement--
const productManagement = expressHandler(async (req, res) => {
  try {
    const findProduct = await Product.find().populate("categoryName");
    res.render("./admin/pages/productlist", {
      title: "Products",
      productList: findProduct,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// addProduct Page---
const addProduct = expressHandler(async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    if (category) {
      res.render("./admin/pages/addProduct", {
        title: "addProduct",
        catList: category,
      });
    }
  } catch (error) {
    throw new Error(error);
  }
});

// inserting a product---
const insertProduct = expressHandler(async (req, res) => {
  try {
    let primaryImage = [];
    req.files.primaryImage.forEach((e) => {
      primaryImage.push({
        name: e.filename,
        path: e.path,
      });
    });

    const secondaryImages = [];
    for (const e of req.files.secondaryImage) {
      const croppedImage = path.join(
        __dirname,
        "../public/admin/uploads",
        `cropped_${e.filename}`
      );

      await sharp(e.path)
        .resize(600, 600, { fit: "cover" })
        .toFile(croppedImage);

      secondaryImages.push({
        name: `cropped_${e.filename}`,
        path: croppedImage,
      });
    }

    const { offer, productPrice, categoryName } = req.body;

    const filteredCategory = await Category.findById({ _id: categoryName });

    if (filteredCategory.categoryOffer > 0 && filteredCategory.categoryOffer > offer ) {
      offerPrice = (productPrice * filteredCategory.categoryOffer) / 100;
      discountAmount = productPrice - offerPrice;
    } else {
      offerPrice = (productPrice * offer) / 100;
      discountAmount = productPrice - offerPrice;
    }
    let salePrice = discountAmount;

    const saving = new Product({
      title: req.body.title,
      description: req.body.description,
      color: req.body.color,
      brand: req.body.brand,
      categoryName: req.body.categoryName,
      quantity: req.body.quantity,
      productPrice: req.body.productPrice,
      salePrice: salePrice,
      offer: req.body.offer,
      primaryImage: primaryImage,
      secondaryImages: secondaryImages,
    });

    const inserted = await saving.save();

    if (inserted) {
      return res.redirect("/admin/product");
    }
  } catch (error) {
    throw new Error(error);
  }
});

// ListProduct---

const listProduct = expressHandler(async (req, res) => {
  try {
    const id = req.params.id;

    const listing = await Product.findByIdAndUpdate(
      { _id: id },
      { $set: { isListed: true } }
    );

    res.redirect("/admin/product");
  } catch (error) {
    throw new Error(error);
  }
});

// unlist category---
const unListProduct = expressHandler(async (req, res) => {
  try {
    const id = req.params.id;
    const listing = await Product.findByIdAndUpdate(
      { _id: id },
      { $set: { isListed: false } }
    );
    res.redirect("/admin/product");
  } catch (error) {
    throw new Error(error);
  }
});

// editProductPage Loading---
const editProductPage = expressHandler(async (req, res) => {
  try {
    const id = req.params.id;
    const category = await Category.find({ isListed: true });
    const productFound = await Product.findById(id)
      .populate("categoryName")
      .exec();

    if (productFound) {
      res.render("./admin/pages/editProduct", {
        title: "editProduct",
        product: productFound,
        catList: category,
      });
    }
  } catch (error) {
    throw new Error(error);
  }
});
const updateProduct = expressHandler(async (req, res) => {
  try {
    const id = req.params.id;
    const existingProduct = await Product.findById(id);
    // Handle primary image
    let primaryImage;
    if (req.files.primaryImage) {
      const primaryImageFile = req.files.primaryImage[0];
      primaryImage = {
        name: primaryImageFile.filename,
        path: primaryImageFile.path,
      };
    } else {
      primaryImage = existingProduct.primaryImage[0];
    }

   // Handle secondary images
   const deleteSecondaryImages = req.body.deleteSecondaryImage;
   const dbImage = [];
   existingProduct.secondaryImages.forEach((image, index) => {
     if (
       !deleteSecondaryImages ||
       !deleteSecondaryImages.includes(index.toString())
     ) {
       // Keep the image if not marked for deletion
       dbImage.push({
         name: image.name,
         path: image.path,
       });
     }
   });

   const secondaryImages = req.files.secondaryImage;
   if (secondaryImages) {
     secondaryImages.forEach((image) => {
       dbImage.push({
         name: image.filename,
         path: image.path,
       });
     });
   }

   // Save the updated product back to the database
   existingProduct.primaryImage = [primaryImage];
   existingProduct.secondaryImages = dbImage;
   await existingProduct.save();

   let discountAmount = 0;
   const productPrice = req.body.productPrice;
   const offerPercentage = req.body.offer;
   discountAmount = Math.floor((productPrice * offerPercentage) / 100);
   let salePrice = productPrice - discountAmount;
    const editingProduct = {
      title: req.body.title,
      description: req.body.description,
      brand: req.body.brand,
      color: req.body.color,
      categoryName: req.body.categoryName,
      quantity: req.body.quantity,
      productPrice: req.body.productPrice,
      salePrice: salePrice,
      offer: req.body.offer,
      primaryImage: [primaryImage], // Include other fields you want to update
      secondaryImages: dbImage,
    };

    const updatedProduct = await Product.findByIdAndUpdate(id, editingProduct, {
      new: true,
    });
    res.redirect("/admin/product");
  } catch (error) {
    throw new Error(error);
  }
});
module.exports = {
  addProduct,
  insertProduct,
  productManagement,
  listProduct,
  unListProduct,
  editProductPage,
  updateProduct,
};
