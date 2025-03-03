const Cart=require("../../models/cartSchema")
const getUserCart = async (userId) => {
    const cart = await Cart.findOne({ userId })
      .populate({
        path: "items.productId",
        model: "Product",
        match: { isListed: true },
        populate: { path: "category", model: "Category" },
      })
      .lean();
    if (!cart) return null;
    cart.items = cart.items.filter((item) => item.productId);

    return cart;
  };

  module.exports={getUserCart}