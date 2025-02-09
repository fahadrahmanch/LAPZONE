const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const mongoose=require("mongoose");
const productSchema = require("../../models/productSchema");
const getCart = async (req, res) => {
  try {
    const userId = req.session.user;
    if(!userId){
      return res.redirect('/')
    }
    const user = await User.findById(userId);
    const cartItems = await Cart.findOne({ userId })
  .populate({
    path: "items.productId",
    model: "Product",
    populate: {
      path: "category", 
      model: "Category",
    },
  })
  .lean();

    // console.log("cartITEMSSSS",cartItems)
    if(cartItems){
    cartItems.items = cartItems.items.map((item) => {
      const variantId = item.variantId;

      const variant = item.productId.variants.find(
        (variant) => variant._id.toString() === variantId.toString()
      );
     
      delete item.variantId;
      item.variantId = variant;
      // console.log("item.variantIditem.variantId",item.variantId)
      return item;
    });
  }

    let subtotal = 0;
    let totalDiscount = 0;
    if(cartItems){
    const cartwithOffer= cartItems.items.map((item)=>{
      const productOffer=item.productId.productOffer
      const categoryOffer=item.productId.category.categoryOffer
      const bestOffer=Math.max(productOffer,categoryOffer)
      const originalPrice = item.variantId.salePrice;
      const quantity = item.quantity;
      for(let key in item.variantId){
        if(key==="salePrice"){
          item.variantId[key]=originalPrice - (originalPrice * bestOffer / 100);
        }
      
        
      }
      
      return {
        ...item,
        bestOffer,
        // finalPrice: salePrice
    };
   


  
    })
  }
//     console.log("cartItems",cartItems)
// console.log(cartwithOffer)



    
    // console.log("cartItems.items cartItems.items ",cartItems.items )
    if (!cartItems) {
      return res.render("user/cart", {
        cart: [],
        products: [],
        totalAmount: 0,
        user: user,
        message:req.session.user||"",
      });
    }
      const totalAmount = cartItems.items.reduce((sum, item) => {
      
      const price = item.quantity * (item.variantId.salePrice);
      return sum + price
    }, 0);
    
// console.log("cartcart",cartItems)
// console.log("cartItemss",cartItems.items)
    res.render("user/cart", {
      cart: cartItems||[],
      products: cartItems.items||"",
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
    // console.log("variantssssssssssssssssssssssssss",variants.items)
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
      if (newQuantity >= 6) {
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
      console.log("variants.offerPrice",variants.offerPrice)
      existingItem.totalPrice = newQuantity * parseFloat(variants.salePrice);
      console.log("existingItem.totalPrice",existingItem.totalPrice)
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
    console.log(productId)
    const product= await productSchema.find({_id:productId});
    console.log("product",product)
    const vr = String(variantId);
    
    if (quantity < 1 || quantity > 5) {
      return res
        .status(400)
        .json({ success: false, message: "Quantity must be 1 and 5" });
    }


    const cart = await Cart.findOne({ "items.productId": productId }).populate({
      path: "items.productId",
      model: "Product"
    });
    // console.log(cart)

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
   console.log('cartItem.totalPrice',cartItem.totalPrice)
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
  let userId=req.session.user


  const cart = await Cart.findOneAndUpdate(
    { userId: userId }, 
    { $pull: { items: { variantId: variantId } } }, 
    { new: true } 
  );
  
  if (!cart) {
    return res.status(404).json({ error: "Cart or variant not found." });
  }
  
  return res.status(200).json({ message: "Variant removed from cart.", cart });

};

module.exports = { getCart, postCart, updateqty, deleteCartProduct };
