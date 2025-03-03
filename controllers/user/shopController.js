const product = require("../../models/productSchema");
const categorySchema = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const wishlistSchema = require("../../models/WhislistSchema");
const Cart = require("../../models/cartSchema");

// render shop page
const loadShop = async (req, res) => {
  try {
    let user = req.session.user || null;
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 12;
    const sort = req.query.sort || "";
    const catt = req.query.cat;

    let sortCriteria = {};
    switch (sort) {
      case "a-z":
        sortCriteria = { productName: 1 };
        break;
      case "z-a":
        sortCriteria = { productName: -1 };
        break;
      case "price-asc":
        sortCriteria = { "variants.salePrice": 1 };
        break;
      case "price-desc":
        sortCriteria = { "variants.salePrice": -1 };
        break;

      case "new-arrivals":
        sortCriteria = { createdAt: -1 };
        break;
    }
    const cart = await Cart.findOne({ userId: user }).populate(
      "items.productId"
    );

    const userWishlist = await wishlistSchema.findOne({ userId: user });
    let filterQuery = {
      isListed: true,
      productName: { $regex: new RegExp(".*" + search + ".*", "i") },
    };
    if (catt) {
      const categoryArray = catt.split(",");
      filterQuery.category = { $in: categoryArray };
    }

    const count = await product.countDocuments(filterQuery);
    const products = await product
      .find(filterQuery)
      .sort(sortCriteria)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("category", "categoryOffer");

    if (products.length === 0) {
      return res.render("user/shop", {
        products: [],
        cat: await categorySchema.find({}),
        catt: catt,
        cart: cart || { items: [] },

        sort: sort || "",
        search: search || "",
        message: req.session.user || null,
        limit: limit,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
      });
    }

    const cat = await categorySchema.find({});

    const productWithoffer = products.map((product) => {
      const productOffer = product.productOffer || 0;
      const categoryOffer = product.category?.categoryOffer || 0;
      const bestOffer = Math.max(productOffer, categoryOffer);

      let finalProduct = {
        ...product.toObject(),
        bestOffer,
        offerType:
          bestOffer === productOffer ? "Product Offer" : "Category Offer",
        isInWishlist:
          product.variants.some((variant) =>
            userWishlist?.products?.some(
              (item) => item.variants.toString() === variant._id.toString()
            )
          ) || false,
      };

      if (bestOffer > 0) {
        for (let i = 0; i < product.variants.length; i++) {
          const offerPrice =
            product.variants[i].salePrice -
            product.variants[i].salePrice * (bestOffer / 100);
          finalProduct.variants[i].salePrice = offerPrice;
        }
      }

      return finalProduct;
    });
    res.render("user/shop", {
      products: productWithoffer,
      cat: cat,
      catt: catt,
      sort: sort || "",
      search: search || "",
      message: req.session.user || null,
      limit: limit,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      cart: cart || { items: [] },
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = { loadShop };
