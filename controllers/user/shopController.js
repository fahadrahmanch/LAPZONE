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
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const sort = req.query.sort || "";
    const catt = req.query.cat;

    // Get cart and wishlist
    const cart = await Cart.findOne({ userId: user }).populate(
      "items.productId"
    );
    const userWishlist = await wishlistSchema.findOne({ userId: user });

    
    let filterQuery = {
      isListed: true,
      productName: { $regex: new RegExp("." + search + ".", "i") },
    };
    if (catt) {
      const categoryArray = catt.split(",");
      filterQuery.category = { $in: categoryArray };
    }

    
    const count = await product.countDocuments(filterQuery);
    

    const allProducts = await product
      .find(filterQuery)
      .populate("category", "categoryOffer");
    
    const allProductsWithOffer = allProducts.map((product) => {
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
        finalProduct.variants = finalProduct.variants.map(variant => {
          const originalPrice = variant.salePrice;
          const discountedPrice = originalPrice - (originalPrice * (bestOffer / 100));
          return {
            ...variant,
            originalPrice: originalPrice,
            salePrice: discountedPrice
          };
        });
      }

      return finalProduct;
    });

    let sortedProducts = [...allProductsWithOffer];
    switch (sort) {
      case "a-z":
        sortedProducts.sort((a, b) => a.productName.localeCompare(b.productName));
        break;
      case "z-a":
        sortedProducts.sort((a, b) => b.productName.localeCompare(a.productName));
        break;
      case "price-asc":
        sortedProducts.sort((a, b) => a.variants[0].salePrice - b.variants[0].salePrice);
        break;
      case "price-desc":
        sortedProducts.sort((a, b) => b.variants[0].salePrice - a.variants[0].salePrice);
        break;
      case "new-arrivals":
        sortedProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }
    
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

    const cat = await categorySchema.find({});

    if (paginatedProducts.length === 0) {
      return res.render("user/shop", {
        products: [],
        cat: cat,
        catt: catt,
        cart: cart || { items: [] },
        sort: sort || "",
        search: search || "",
        message: req.session.user || null,
        limit: limit,
        currentPage: page,
        totalPages: Math.ceil(sortedProducts.length / limit),
      });
    }
    res.render("user/shop", {
      products: paginatedProducts,
      cat: cat,
      catt: catt,
      sort: sort || "",
      search: search || "",
      message: req.session.user || null,
      limit: limit,
      currentPage: page,
      totalPages: Math.ceil(sortedProducts.length / limit),
      cart: cart || { items: [] },
    });
  } catch (error) {
    console.log(error);
    res.status(500).render("error", { message: "Something went wrong" });
  }
};
module.exports={loadShop}