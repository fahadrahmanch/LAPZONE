const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
// const cartSchema=require('../../models/cartSchema')
const productSchema = require("../../models/productSchema");
const getCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    const cartItems = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      select:
        "productName productImage variants[i].salePrice variants[0].stock",
      model: "Product",
    });
    if (!cartItems) {
      return res.render("user/cart", {
        cart: null,
        products: [],
        totalAmount: 0,
        user: user,
      });
    }

    const validItems = cartItems.items
      .filter((item) => item.productId != null)
      .map((item) => {
        const variant = item.productId.variants?.[0] || { stock: 0 };

        return {
          ...item.toObject(),
          isOutOfStock: variant.stock < 1,
          availableStock: variant.stock,
          maxAllowedQuantity: Math.min(5, variant.stock),
        };
      });
    console.log(validItems);
    const totalAmount = validItems.reduce((sum, item) => {
      if (item.status === "placed") {
        return sum + item.totalPrice;
      } else {
        return sum;
      }
    }, 0);
    res.render("user/cart", {
      cart: cartItems,
      products: validItems,
      totalAmount,
      user: user,
    });
  } catch (error) {
    console.log(error);
    res.redirect("/pagenotFound");
  }
};
const postCart = async (req, res) => {
  const { product, qty } = req.body;

  const productId = String(product);
  console.log("home",req.body);
  try {
    const userId = req.session.user;
    console.log(userId);
    if (!userId) {
      return res
        .status(401)
        .json({
          success: false,
          message: "please login to add products to the cart",
        });
    }
    const Product = await productSchema.findOne({ _id: productId });

    if (!Product) {
      return res
        .status(400)
        .json({ success: false, message: "product is out of stock" });
    }
    const quantity = Number(qty);
    const price = Number(Product.variants[0].stock);
    const productqty = Product.variants[0].stock;

    // let productqty=
    if (isNaN(quantity) || quantity <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid quantity" });
    }
    // if(productqty<1){
    //   return res.status(400).json({
    //     success: false,
    //     message: "Product is out of stock",
    //   });

    // }
    if (isNaN(price)) {
      return res
        .status(500)
        .json({ success: false, message: "Product price is invalid" });
    }

    let cart = await Cart.findOne({ userId });
    console.log(cart);
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }
    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId
    );
    if (existingItem) {
      const newQuantity = parseInt(existingItem.quantity) + parseInt(qty);
      console.log(newQuantity);
      if (newQuantity > 5) {
        return res.status(400).json({
          success: false,
          message: "Maximum 5 items allowed per product",
        });
      }
      if (newQuantity > productqty) {
        return res.status(400).json({
          success: false,
          message: `Only ${productqty} items available in stock`,
        });
      }
      existingItem.quantity = newQuantity;
      existingItem.totalPrice =
        newQuantity * parseFloat(Product.variants[0].salePrice);
    } else {
      if (qty > productqty) {
        return res.status(400).json({
          success: false,
          message: `Only ${productqty} items available in stock`,
        });
      }
      cart.items.push({
        productId,
        quantity: qty,
        price: Product.variants[0].salePrice.toString(),
        totalPrice: qty * parseFloat(Product.variants[0].salePrice),
        status: "placed",
      });
    }

    await cart.save();

    res.json({
      success: true,
      message: "Product added to cart successfully",
    });
  } catch (error) {
    console.log(error);
  }
};
module.exports = { getCart, postCart };
