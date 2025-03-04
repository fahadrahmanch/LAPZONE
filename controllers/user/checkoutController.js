const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Coupon = require("../../models/coupenSchema");
const productSchema = require("../../models/productSchema");
const Coupen = require("../../models/coupenSchema");
const Wallet = require("../../models/walletSchema");
const { ERROR, STATUS_CODES, DISCOUNT_MESSAGES } = require("../../utils/constants");
const {calculateOffers}=require('../../utils/services/calculateOffers')
const {calculateTotalAmount}=require('../../utils/services/calculateTotalAmount')
const {calculateTotalDiscount}=require('../../utils/services/calculateTotalDiscount')
const {getUserCart}=require('../../utils/services/getUserCart')

const getCheckout = async (req, res) => {
  const DELIVERY_CHARGE = 50;
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect("/");
    }
    const cart = await getUserCart(user);
    if (!cart) {
      return res.redirect("/");
    }
    cart.items = cart.items.filter((item) => item.productId);

    cart.items = cart.items.map((item) => {
      const variantId = item.variantId;

      const variant = item.productId.variants.find(
        (variant) => variant._id.toString() === variantId.toString()
      );
      delete item.variants;
      item.variant = variant;
      return item;
    });

    const checkoutwithoffer = calculateOffers(cart)
    req.session.totalDiscount = calculateTotalDiscount(checkoutwithoffer)

    const address = await Address.findOne({ userId: user });
    const addressData = address || { address: [] };
    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    const totalAmount = calculateTotalAmount(cart.items)
    const today = new Date().toISOString().split("T")[0];

    const activeCoupens = await Coupon.find({
      isList: true,
      expireOn: { $gte: today },
    });

    const wallet = await Wallet.findOne({ userId: user });

    res.render("user/checkout", {
      cart: checkoutwithoffer,
      activeCoupens,
      addressData,
      walletBalance: wallet?.totalBalance || 0,
      totalAmount: totalAmount + DELIVERY_CHARGE,
      coupenAmount: req.session.Coupenamount || 0,
      Disount: req.session.totalDiscount || 0,
      message: req.session.user || "",
      DELIVERY_CHARGE: DELIVERY_CHARGE,
    });
  } catch (error) {
    console.error(error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .send(ERROR.INTERNAL_SERVER_ERROR);
  }
};

//coupon apply

const applyCoupen = async (req, res) => {
  try {
    const { totalAmount, selectedCoupon } = req.body;
    const discount = await Coupen.findOne({ name: selectedCoupon });
    if (discount.minimumPrice >= totalAmount) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: DISCOUNT_MESSAGES.MINIMUM_PURCHASE
      });
    }
    if (totalAmount < discount.offerPrice) {
      return res.json({
        success: false,
        message: DISCOUNT_MESSAGES.DISCOUNT_EXCEEDS_TOTAL,
      });
    }
    const totalDiscountAmount =
      (req.session.totalDiscount || 0) + discount.offerPrice;
    const discountPrice = discount.offerPrice;

    req.session.totalDiscount = totalDiscountAmount;
    const final = totalAmount - discount.offerPrice;
    return res
      .status(STATUS_CODES.OK)
      .json({ success: true, message: final, discountPrice });
  } catch (error) {
    console.log(error);
  }
};

module.exports = { getCheckout, applyCoupen };
