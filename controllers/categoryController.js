const category = require("../models/categoryModel");
const Product = require("../models/productModel")
// category page--
const categoryManagement = async (req, res) => {
  try {
    const findCategory = await category.find();
    res.render("./admin/pages/categories", {
      catList: findCategory,
      title: "Categories",
    });
  } catch (error) {
    throw new Error(error);
  }
};

// addCategory form---
const addCategory = async (req, res) => {
  try {
    const findCategory = await category.find();

    res.render("./admin/pages/addCategory", {
      catList: findCategory,
      title: "addCategory",
    });
  } catch (error) {
    throw new Error(error);
  }
};

// inserting  categories
const insertCategory = async (req, res) => {
  try {
    const categoryName = req.body.addCategory;
    const categoryOffer = req.body.addOffer
    const regexCategoryName = new RegExp(`^${categoryName}$`, "i");
    const findCat = await category.findOne({ categoryName: regexCategoryName });

    if (findCat) {
      const catCheck = `Category ${categoryName} Already existing`;
      res.render("./admin/pages/addCategory", {
        catCheck,
        title: "addCategory",
      });
    } else {
      const result = new category({
        categoryName: categoryName,
        categoryOffer: categoryOffer
      });
      await result.save();
      res.redirect("/admin/category");
    }
  } catch (error) {
    throw new Error(error);
  }
};

// list category--
const list = async (req, res) => {
  try {
    const id = req.params.id;
    const listing = await category.findByIdAndUpdate(
      { _id: id },
      { $set: { isListed: true } }
    );
    res.redirect("/admin/category");
  } catch (error) {
    throw new Error(error);
  }
};

// unlist category---
const unList = async (req, res) => {
  try {
    const id = req.params.id;
    const listing = await category.findByIdAndUpdate(
      { _id: id },
      { $set: { isListed: false } }
    );
    res.redirect("/admin/category");
  } catch (error) {
    throw new Error(error);
  }
};

// edit Category form --
const editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const catName = await category.findById(id);
    if (catName) {
      res.render("./admin/pages/editCategory", {
        title: "editCategory",
        values: catName,
      });
    } else {
      console.log("error in rendering");
    }
  } catch (error) {
    throw new Error(error);
  }
};


const updateCategoryAndProductPrices = async (categoryId, newCategoryOffer) => {
  try {
    newCategoryOffer = parseFloat(newCategoryOffer);
    if (isNaN(newCategoryOffer)) {
      newCategoryOffer = 0;
    }
    await category.findByIdAndUpdate(categoryId, { categoryOffer: newCategoryOffer });
    const products = await Product.find({ categoryName: categoryId });
    for (const product of products) {
      const productOffer = parseFloat(product.offer) || 0;

      const higherOffer = Math.max(newCategoryOffer, productOffer);
      let salePrice = higherOffer > 0 ? product.productPrice - (product.productPrice * higherOffer) / 100 : product.productPrice;
      await Product.findByIdAndUpdate(product._id, { salePrice: salePrice });
    }
  } catch (error) {
    console.error("Error updating category and product prices:", error);
  }
};


// update Category name --
const updateCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const updatedName = req.body.updatedName;
    const categoryOffer = req.body.addOffer;

    // Update the category
    await category.findByIdAndUpdate(id, {
      $set: { categoryName: updatedName, categoryOffer: categoryOffer },
    });

    await updateCategoryAndProductPrices(id, categoryOffer);

    res.redirect("/admin/category");
  } catch (error) {
    console.error("Error updating category:", error);
    throw new Error(error);
  }
};


// searchCategory----
const searchCategory = async (req, res) => {
  try {
    const data = req.body.search;
    const searching = await category.find({
      categoryName: { $regex: data, $options: "i" },
    });
    if (searching) {
      res.render("./admin/pages/categories", {
        title: "Searching",
        catList: searching,
      });
    } else {
      res.render("./admin/pages/categories", { title: "Searching" });
    }
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  categoryManagement,
  addCategory,
  insertCategory,
  list,
  unList,
  editCategory,
  updateCategory,
  searchCategory,
};
