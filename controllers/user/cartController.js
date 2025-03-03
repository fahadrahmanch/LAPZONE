const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const productSchema = require("../../models/productSchema");
const { CART, STATUS_CODES } = require("../../utils/constants");
const { getUserCart } = require("../../utils/services/getUserCart"); 
const { calculateOffers } = require("../../utils/services/calculateOffers"); 
const {calculateTotalAmount } = require("../../utils/services/calculateTotalAmount"); 

// To render cart page

const getCart = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.redirect("/");
    }
    const user = await User.findById(userId);
    let cartItems = await getUserCart(user)
    if (!cartItems) {
      cartItems = { items: [] };
    }
   if(cartItems){
    cartItems.items=await calculateOffers(cartItems)
   }
    let totalAmount;
    if (cartItems) {
      totalAmount = calculateTotalAmount(cartItems.items)
    }

    res.render("user/cart", {
      cart: cartItems || [],
      products: cartItems.items || [],
      totalAmount,
      message: req.session.user || "",
      user: user,
    });
  } catch (error) {
    console.log(error);
  }
};

//Add product to cart

const addCart = async (req, res) => {
  const { product, qty, variant } = req.body;
  const productId = String(product);
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: CART.LOGIN_REQUIRED,
      });
    }
    const Product = await productSchema.findOne({ _id: productId });
    const variants = Product.variants.find((item) => variant);
    if (!Product) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: CART.PRODUCT_OUT_OF_STOCK });
    }
    const quantity = Number(qty);

    const productqty = variants.stock;

    if (isNaN(quantity) || quantity <= 0) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: CART.INVALID_QUANTITY });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }
    const existingItem = cart.items.find(
      (item) =>
        item.productId.toString() === productId &&
        item.variantId.toString() === variant
    );

    if (existingItem) {
      const newQuantity = parseInt(existingItem.quantity) + parseInt(qty);
      if (newQuantity >= 6) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: CART.MAX_QUANTITY_EXCEEDED,
        });
      }
      if (newQuantity > productqty) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: CART.ONLY_FEW_LEFT,
        });
      }
      existingItem.quantity = newQuantity;
      existingItem.totalPrice = newQuantity * parseFloat(variants.salePrice);
    } else {
      if (qty > productqty) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: CART.ONLY_FEW_LEFT,
        });
      }

      cart.items.push({
        productId,
        quantity: qty,
        variantId: variant,
        totalPrice: qty * parseFloat(variants.salePrice || 0),
        status: "placed",
      });
    }

    await cart.save();

    res.json({
      success: true,
      message: CART.PRODUCT_ADDED,
    });
  } catch (error) {
    console.log(error);
  }
};

//update product quantity to cart

const updateCartqty = async (req, res) => {
  const { productId, quantity, variantId } = req.body;
  const userId = req.session.user;
  try {
    const product = await productSchema.find({ _id: productId });
    console.log("product", product);
    const vr = String(variantId);

    if (quantity < 1 || quantity > 5) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: CART.QUANTITY_LIMIT });
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      model: "Product",
    });

    if (!cart) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: CART.PRODUCT_NOT_FOUND });
    }

    const cartItem = cart.items.find(
      (item) =>
        String(item.productId._id) === String(productId) &&
        String(item.variantId) === vr
    );
    if (!cartItem) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: CART.PRODUCT_NOT_FOUND,
      });
    }

    const variant = cartItem.productId.variants.find(
      (v) => v._id.toString() === vr
    );

    if (!variant) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: CART.VARIANT_NOT_FOUND,
      });
    }

    cartItem.quantity = quantity;
    cartItem.totalPrice = quantity * parseFloat(variant.salePrice || 0);
    await cart.save();

    res.json({
      success: true,
      updatedTotalPrice: cartItem.totalPrice,
    });
  } catch (error) {
    console.log("error", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: CART.ERROR.INTERNAL_SERVER_ERROR });
  }
};

//detete product from cart

const deleteCartProduct = async (req, res) => {
  const { productId, variantId } = req.body;
  let userId = req.session.user;

  const cart = await Cart.findOneAndUpdate(
    { userId: userId },
    { $pull: { items: { variantId: variantId } } },
    { new: true }
  );

  if (!cart) {
    return res.status(STATUS_CODES.NOT_FOUND).json({ error: CART.CART_NOT_FOUND });
  }

  return res.status(STATUS_CODES.OK).json({ message: CART.VARIANT_REMOVED, cart });
};

module.exports = { getCart, addCart, updateCartqty, deleteCartProduct };
