const productSchema = require("../../models/productSchema");
const multer = require("multer");
const category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Category = require("../../models/categorySchema");
const { categorySchema } = require("./categoriesController");
const Brand = require("../../models/brandSchema");
const { STATUS_CODES, MESSAGES } = require("../../utils/constants");

// PRODUCT PAGE RENDER
const productpage = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 4;
    const productData = await productSchema
      .find({
        $or: [
          { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        ],
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("category")
      .exec();

    const count = await productSchema
      .find({
        $or: [
          { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        ],
      })
      .countDocuments();

    if (category) {
      res.render("admin/product", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
      });
    }
  } catch (error) {
    console.log(error);
  }
};

// ADD PRODUCT PAGE RENDER

const getPrductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find();
    res.render("admin/product-add", {
      cat: category,
      brand,
    });
  } catch (error) {
    {
      console.log(error);
    }
  }
};

// ADD PRODUCT

const addProducts = async (req, res) => {
  try {
    const products = req.body;

    const productExists = await productSchema.findOne({
      productName: products.productName,
    });

    if (!productExists) {
      if (req.files && req.files.length > 0) {
        const images = [];

        for (let i = 0; i < req.files.length; i++) {
          images.push(req.files[i].filename);
        }

        const categoryID = await categorySchema.findOne({
          name: products.category,
        });
        const brandId = await Brand.findOne({ brandName: products.brand });

        if (!categoryID) {
          return res
            .status(STATUS_CODES.BAD_REQUESTD)
            .json(MESSAGES.INVALID_CATEGORY_NAME);
        }
        const newProduct = new productSchema({
          productName: products.productName,
          description: products.description,
          category: categoryID._id,
          brand: brandId._id,
          createdOn: new Date(),
          productImage: images,
          status: "Available",
          variants: [...products.variants],
        });

        await newProduct.save();
        return res.redirect("/admin/products");
      } else {
        return res.status(400).json("No files uploaded.");
      }
    } else {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ message: MESSAGES.PRODUCT_ALREADY_EXISTS });
    }
  } catch (error) {
    console.error("Error saving product:", error);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

//EDIT PRODUCT PAGE RENDER
const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await productSchema
      .findOne({ _id: id })
      .populate("category");
    const category = await categorySchema.find({});
    const brand = await Brand.find({});
    res.render("admin/product-edit", {
      product: product,
      cat: category,
      brand,
    });
  } catch (error) {
    console.log("error", error);
  }
};

//EDIT PRODUCT

const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await productSchema.findById({ _id: id });
    const data = req.body;
    const existingProduct = await productSchema.findOne({
      productName: data.productName,
      _id: { $ne: id },
    });
    if (existingProduct) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        error: MESSAGES.PRODUCT_ALREADY_EXISTS,
      });
    }

    if (data.brand) {
      const brandDoc = await Brand.findOne({ brandName: data.brand });
      product.brand = brandDoc._id;
    }
    if (data.category) {
      const categoryDoc = await Category.findOne({ name: data.category });
      if (!categoryDoc) {
        return res
          .status(STATUS_CODES.BAD_REQUEST)
          .json({ error: MESSAGES.INVALID_CATEGORY_NAME });
      }
      product.category = categoryDoc._id;
    }

    const images = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        images.push(req.files[i].filename);
      }
    }

    product.productName = data.productName;
    product.description = data.description;
    product.variants = [...data.variants];

    if (images.length > 0) {
      product.productImage.push(...images);
    }

    await product.save();
    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error updating product:", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ error: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// DELETE SINGLE IMAGE

const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;
    const product = await productSchema.findByIdAndUpdate(productIdToServer, {
      $pull: { productImage: imageNameToServer },
    });
    const imagePath = path.join("public", "uploads", imageNameToServer);
    if (fs.existsSync(imagePath)) {
      await fs.unlinkSync(imagePath);
      console.log(`image ${imageNameToServer} deleted successfully`);
    } else {
      console.log("image not found");
    }
    res.send({ status: true });
  } catch (error) {
    console.log(error);
  }
};

//after search

const productsInfo = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
    const limit = 6;
    const data = await productSchema
      .find({
        $or: [{ productName: { $regex: ".*" + search + ".*" } }],
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await productSchema
      .find({
        $or: [{ productName: { $regex: ".*" + search + ".*" } }],
      })
      .countDocuments();
    const totalPages = Math.ceil(count / limit);
    const currentPage = page;
    res.render("admin/product", { data, totalPages, currentPage });
  } catch (error) {}
};
const listed = async (req, res) => {
  try {
    const { productId, action } = req.body;
    if (!productId || !action) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ messege: MESSAGES.INVALID_PRODUCT_ID });
    }
    const product = await productSchema.findById(productId);

    if (!product) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ message: MESSAGES.PRODUCT_NOT_FOUND });
    }
    product.isListed = action === "unlist";
    await product.save();
    const status = action === "list" ? "unlist" : "list";
    res
      .status(STATUS_CODES.OK)
      .json({ message: MESSAGES.PRODUCT_STATUS_UPDATED });
  } catch (error) {
    console.log(error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// ADD OFFER

const addOffer = async (req, res) => {
  try {
    const admin = req.session.admin;
    if (!admin) {
      return res.redirect("/admin/login");
    }
    const { productId, offerPercentage } = req.body;
    if (!productId && !offerPercentage) {
      return res.json({ success: false });
    }
    const product = await productSchema.findOne({ _id: productId });
    if (!product) {
      return res.json({ success: false, message: MESSAGES.PRODUCT_NOT_FOUND });
    }
    product.productOffer = offerPercentage;

    await product.save();
    return res.json({ success: true });
  } catch (error) {
    console.log(error);
  }
};

// REMOVE PRODUCT OFFER
const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const admin = req.session.admin;
    if (!admin) {
      return res.redirect("/admin/login");
    }
    const product = await productSchema.findOne({ _id: productId });
    product.productOffer = 0;
    await product.save();
    return res.json({ success: true });
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  getPrductAddPage,
  addProducts,
  productpage,
  getEditProduct,
  editProduct,
  deleteSingleImage,
  productsInfo,
  listed,
  addOffer,
  removeProductOffer,
};
