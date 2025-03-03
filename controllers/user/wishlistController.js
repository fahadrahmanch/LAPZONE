const wishlistSchema = require("../../models/WhislistSchema");
const userSchema = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const { MESSAGES } = require("../../utils/constants");

// render wishlist

const getwishlist = async (req, res) => {
  try {
    let user = req.session.user;
    if (!user) {
      return res.redirect("/");
    }
    const cart = await Cart.findOne({ userId: user }).populate(
      "items.productId"
    );
    const wishlist = await wishlistSchema
      .findOne({ userId: user })
      .populate({
        path: "products.productId",
        model: "Product",
        match: { isListed: true },

        populate: {
          path: "category",
          model: "Category",
        },
      })
      .lean();

    if (!wishlist) {
      return res.render("user/wishlist", {
        product: [],
        cart: cart || { items: [] },
        message: req.session.user||"",
      });
    }
    wishlist.products = await wishlist.products.filter(
      (item) => item.productId
    );
    wishlist.products = wishlist.products.map((item) => {
      const variantId = item.variants;
      const productVariants = item.productId.variants;
      const variant = productVariants.find(
        (variant) => variant._id.toString() === variantId.toString()
      );

      if (variant) {
        item.variants = variant;
      } else {
        item.variants = null;
      }

      return item;
    });

    wishlist.products.map((item) => {
      const originalPrice = item.variants.salePrice;
      const bestOffer =
        item.productId.productOffer > item.productId.category.categoryOffer
          ? item.productId.productOffer
          : item.productId.category.categoryOffer;

      item.variants.salePrice =
        originalPrice - (originalPrice * bestOffer) / 100;
    });

    res.render("user/wishlist", {
      message: req.session.user||"",
      product: wishlist.products,
      cart: cart || { items: [] },
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return res.json({ success: false, message: "Failed to fetch wishlist" });
  }
};

//ADD WISHLIST

const addWishlist = async (req, res) => {
  try {
    const { productId, variantId } = req.body;
    const user = req.session.user;
    if (!user) {
      return res.json({ success: false, message: MESSAGES.USER_NOT_LOGGED_IN });
    }
    let wishlist = await wishlistSchema.findOne({ userId: user });
    if (wishlist) {
      let variants = wishlist.products.find((item) => {
        if (item.variants._id.toString() === variantId.toString()) {
          return true;
        }
      });
      if (variants) {
        return res.json({
          success: false,
          message: MESSAGES.PRODUCT_ALREADY_IN_WISHLIST,
        });
      }
    }

    if (!wishlist) {
      wishlist = new wishlistSchema({
        userId: user,
        products: [{ productId, variants: variantId }],
      });
    } else {
      wishlist.products.push({ productId, variants: variantId });
    }
    await wishlist.save();
    return res.json({
      success: true,
      message: MESSAGES.PRODUCT_ADDED_TO_WISHLIST,
    });
  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: MESSAGES.FAILED_TO_ADD_TO_WISHLIST,
    });
  }
};

//REMOVE WISHLIST

const removeWishlist = async (req, res) => {
  try {
    const { productId, variantId } = req.body;
    const user = req.session.user;
    if (!user) {
      return res.json({ success: false, message: MESSAGES.USER_NOT_LOGGED_IN });
    }
    const userwishlist = await wishlistSchema.findOne({ userId: user });
    if (!userwishlist) {
      return res.json({ success: false, message: MESSAGES.WISHLIST_NOT_FOUND });
    }
    const productIndex = userwishlist.products.findIndex(
      (product) => product.productId.toString() === productId.toString()
    );
    if (productIndex === -1) {
      return res.json({
        success: false,
        message: MESSAGES.PRODUCT_NOT_FOUND_IN_WISHLIST,
      });
    }
    const product = userwishlist.products[productIndex];
    if (variantId) {
      if (
        product.variants &&
        product.variants.toString() === variantId.toString()
      ) {
        userwishlist.products.splice(productIndex, 1);
        await userwishlist.save();
        return res.json({
          success: true,
          message: MESSAGES.VARIANT_REMOVED_FROM_WISHLIST,
        });
      } else {
        return res.json({
          success: false,
          message: MESSAGES.VARIANT_NOT_FOUND_IN_WISHLIST,
        });
      }
    } else {
      userwishlist.products.splice(productIndex, 1);

      await userwishlist.save();

      return res.json({
        success: true,
        message: MESSAGES.PRODUCT_REMOVED_FROM_WISHLIST,
      });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};
module.exports = { getwishlist, addWishlist, removeWishlist };
