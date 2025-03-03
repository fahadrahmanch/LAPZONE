const multer = require("multer");
const path = require("path");
const Brand = require("../../models/brandSchema");
const { MESSAGES } = require("../../utils/constants");

//BRAND PAGE RENDER

const getBrand = async (req, res) => {
  try {
    const brand = await Brand.find({});
    res.render("admin/brand", { brand });
  } catch (error) {
    console.log(error);
  }
};

//ADD BRAND

const addBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null; // Store image path
    const newBrand = new Brand({ brandName: name, brandImage: image });
    await newBrand.save();

    res.redirect("/admin/brand");
  } catch (error) {
    console.log(error);
  }
};

//BLOCK BRAND

const block = async (req, res) => {
  try {
    const { id } = req.body;
    const brand = await Brand.findOne({ _id: id });
    if (!brand) {
      return res.json({ success: false, message: MESSAGES.BRAND_NOT_FOUND });
    }
    if (brand.isBlocked) {
      brand.isBlocked = false;
    } else {
      brand.isBlocked = true;
    }

    await brand.save();
    return res.json({ success: true });
  } catch (error) {
    console.log(error);
  }
};

module.exports = { getBrand, addBrand, block };
