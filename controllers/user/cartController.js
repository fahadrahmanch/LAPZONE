const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");

const productSchema = require("../../models/productSchema");
const getCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    const cartItems = await Cart.findOne({ userId })
      .populate({
        path: "items.productId",
        model: "Product",
      })
      .lean();
    console.log(cartItems)
    cartItems.items = cartItems.items.map((item) => {
      const variantId = item.variantId;

      const variant = item.productId.variants.find(
        (variant) => variant._id.toString() === variantId.toString()
      );
      delete item.variantId;
      item.variantId = variant;
      return item;
    });
    
    if (!cartItems) {
      return res.render("user/cart", {
        cart: null,
        products: [],
        totalAmount: 0,
        user: user,
      });
    }

    const totalAmount = cartItems.items.reduce((sum, item) => {
      console.log(item)
      console.log(item.variantId);
      const price = item.quantity * item.variantId.salePrice;
      return sum + price
    }, 0);
    // console.log(totalAmount)
    res.render("user/cart", {
      cart: cartItems,
      products: cartItems.items,
      totalAmount,
      message:req.session.user||"",
      user: user,
    });
  } catch (error) {
    console.log(error);
    res.redirect("/pagenotFound");
  }
};
const postCart = async (req, res) => {
  const { product, qty, variant } = req.body;
  // console.log(product, qty, variant);
  const productId = String(product);
  // console.log("home", req.body);
  try {
    const userId = req.session.user;
    // console.log(userId);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "please login to add products to the cart",
      });
    }
    const Product = await productSchema.findOne({ _id: productId });
    const variants = Product.variants.find((item) => variant);
    // console.log("single variant", variants);

    if (!Product) {
      return res
        .status(400)
        .json({ success: false, message: "product is out of stock" });
    }
    const quantity = Number(qty);

    const productqty = variants.stock;
    // console.log("hjadskfh", productqty);

    if (isNaN(quantity) || quantity <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid quantity" });
    }

    let cart = await Cart.findOne({ userId });
    // console.log(cart);
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
      console.log(newQuantity);
      if (newQuantity >= 5) {
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
      existingItem.totalPrice = newQuantity * parseFloat(variants.salePrice);
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
        variantId: variant,
        // price: variants.salePrice,
        totalPrice: qty * parseFloat(variants.salePrice||0),
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

const updateqty = async (req, res) => {
  const { productId, quantity, variantId } = req.body;
  try {
    const vr = String(variantId);
    
    if (quantity < 1 || quantity >= 5) {
      return res
        .status(400)
        .json({ success: false, message: "Quantity must be 1 and 5" });
    }


    const cart = await Cart.findOne({ "items.productId": productId }).populate({
      path: "items.productId",
      model: "Product"
    });
    console.log(cart)

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in cart." });
    }

    const cartItem = cart.items.find(
      (item) => 
        String(item.productId._id) === String(productId) && 
        String(item.variantId) === vr
    );

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart.",
      });
    }

    const variant = cartItem.productId.variants.find(
      (v) => v._id.toString() === vr
    );

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Product variant not found.",
      });
    }

   
    cartItem.quantity = quantity;
    cartItem.totalPrice = quantity * parseFloat(variant.salePrice || 0);

    await cart.save();
    
    res.json({ 
      success: true, 
      updatedTotalPrice: cartItem.totalPrice 
    });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const deleteCartProduct = async (req, res) => {
  const { productId , variantId} = req.body;
  try {
    const cart = await Cart.findOneAndUpdate(
      { "items.productId": productId },
      { $pull: { items: { productId: productId, variantId:variantId } } },
      { new: true }
    );

    if (!cart) {
      return res.status(404).json({ error: "Cart or product not found." });
    }

    return res.status(200).json({ message: "Product removed from cart." });
  } catch (error) {
    console.error("Error deleting product from cart:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = { getCart, postCart, updateqty, deleteCartProduct };
