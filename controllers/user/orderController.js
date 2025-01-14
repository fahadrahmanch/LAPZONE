const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const Order=require("../../models/orderSchema")
const Address=require("../../models/addressSchema")
const productSchema = require("../../models/productSchema");
const mongoose = require('mongoose')

const createOrder = async (req, res) => {
  try {
    const { selectedAddressId, selectPayment, totalAMount } = req.body;
    const userId = req.session.user;

    if (!userId) {
      return res.status(401).json({ message: "User not found." });
    }

    if (!selectPayment || !selectedAddressId) {
      return res.status(400).json({ message: "Address and payment method are required." });
    }

    const address = await Address.findOne(
      { userId, 'address._id': selectedAddressId },
      { address: { $elemMatch: { _id: selectedAddressId } } }
    );

    if (!address) {
      return res.status(404).json({ message: "Address not found." });
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      model: "Product",
    })
    .lean();

    if (!cart || !cart.items.length) {
      return res.status(400).json({ message: "Your cart is empty." });
    }

    cart.items = cart.items.map((item) => {
      const variantId = item.variantId;
      const variant = item.productId.variants.find(
        (variant) => variant._id.toString() === variantId.toString()
      );
      delete item.variants;
      item.variant = variant;
      return item;
    });
    
    const orderedItems = cart.items.map((item) => ({
      Product: item.productId._id,
      quantity: item.quantity,
      price: item.variant.salePrice,
      totalPrice: item.variant.salePrice * item.quantity,
      variants:item.variant._id
    }));

    const addressObject = address.address[0];
    const newOrder = new Order({
      userId: userId,
      orderedItems,
      finalAmount: totalAMount,
      address: {
        name: addressObject.name,
        streetaddress: addressObject.streetaddress,
        city: addressObject.city,
        landmark: addressObject.landmark,
        state: addressObject.state,
        pincode: addressObject.pincode,
        phone: addressObject.phone,
      },
      status: 'Shipped',
      paymentMethod:selectPayment
    });

    await newOrder.save();


   console.log("its cart",cart)

   const matchedVariants = []; 

   for (const item of cart.items) {
       const product = await productSchema.findById(item.productId._id);
   
       console.log("variant", item.variant._id);
       console.log("find product", product);
 
       const matchedVariant = product.variants.find(
           (variant) => variant._id.toString() === item.variant._id.toString()
       );
   
       if (matchedVariant) {
           console.log("yes, variant matched:", matchedVariant);
           matchedVariants.push(matchedVariant); 
   
          
           const quantityToDecrease = item.quantity; 
           matchedVariant.stock -= quantityToDecrease;
   
          
       } else {
           console.log("no, variant not matched");
       }
   }
   
   for (const item of matchedVariants) {
       await productSchema.updateOne(
           { "variants._id": item._id },
           { $set: { "variants.$.stock": item.stock } }
       );
   }
   


    await Cart.updateOne({ userId }, { $set: { items: [] } });
 
     res.status(200).json({success:true,newOrder})
  
  } catch (error) {
    console.error(error);
    return res.status(500).render('errorPage', { message: "Something went wrong. Please try again later." });
  }
};


  const renderConfirmorder=async(req,res)=>{
    try{
      let id = req.params.id
      let user=req.session.user;
      if(!user){
        return res.redirect('/')
      }
      const orderDetails = await Order.findOne({ _id: id }).populate({path:'orderedItems.Product',model:'Product'});

      // console.log(orderDetails)
      console.log(id)
     res.render('user/orderConfirm',{orderDetails,message:req.session.user||"",})
     console.log("orderpage render")
    }catch(error){
    console.log(error)
    }
  }

  
  const orderDetails=async(req,res)=>{
    try{
      const userId=req.session.user
      const id=req.params.id
      // console.log(id)
      // const order = await Order.findOne({ orderId: id }).populate({path:'userId',model:"User"}).populate({path:'Product',mmodel:'Product'});
      const order = await Order.findOne({ orderId: id })
    .populate({ path: 'userId', model: "User" })
    .populate({ path: 'orderedItems.Product', model: 'Product' });


      
      // console.log(order)

     res.render('user/viewOrders',{order})
    }
    catch(error){

    }
  }
  const Variants = []; 
  const cancelOrder = async (req, res) => {
    console.log("cancel order");
    try {
        const { id } = req.body;
        const userId = req.session.user;
        console.log(id);

        const order = await Order.findOne({ userId,orderId: id });
        console.log("delete", order);

        if (!order) {
            return res
                .status(404)
                .json({ success: false, message: "Order not found" });
        }

        order.status = 'Cancelled';
        await order.save();
       
        for(const item of order.orderedItems){
          console.log("item",item)
          const product = await productSchema.findOne({
            variants: { $elemMatch: { _id: item.variants } },
          });
          const variant = product.variants.find((variant)=>variant._id.toString() === item.variants.toString())
          console.log("orderd", variant)
          console.log("products",product)
          if(variant){
            // const variant=product.variants.find()
            Variants.push(variant); 
            const quantityToIncrease = item.quantity; 
            variant.stock += quantityToIncrease;
          }
         
         
        }
        for (const item of Variants) {
          await productSchema.updateOne(
              { "variants._id": item._id },
              { $set: { "variants.$.stock": item.stock } }
          );
      }
    
        return res.status(200).json({ success: true, message: "Order cancelled successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};



  // const cancelOrder=async(req,res)=>{
  //   try{
  //     const orderId = req.params.orderId;
  //     console.log(orderId);
  //     const userId = req.session.user;
  //     console.log(userId);
  
  //     const order = await Order.findOne({ orderId: orderId, userId: userId });
  //     console.log("order check while cancel:", order);
  //     if (!order) {
  //       return res
  //         .status(404)
  //         .json({ success: false, message: "Order not found" });
  //     }
  //     if (
  //       order.orderStatus === "Shipped" ||
  //       order.orderStatus === "Delivered" ||
  //       order.orderStatus === "Cancelled"
  //     ) {
  //       //  ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"]
  //       return res
  //         .status(400)
  //         .json({ success: false, message: "Order cannot be cancelled" });
  //     }
  
  //     // Restore stock 
  //     for (const item of order.items) {
  //       const product = await Product.findById(item.productId);
  //       if (product) {
  //         product.quantity += item.quantity; 
  //         await product.save();
  //       } else {
  //         console.error(
  //           Product with ID ${item.productId} not found in inventory
  //         );
  //       }
  //     }
  
  //     order.orderStatus = "Cancelled";
  //     order.cancelledAt = new Date();
  //     await order.save();
  //     res
  //       .status(200)
  //       .json({ success: true, message: "order cancelled succesfully" });
  //   }
  //   catch(error){
  //       console.error("Error cancelling order:", error);
  //       res.status(500).json({
  //         success: false,
  //         message: "Error cancelling order",
  //       });
  
  //   }
    
  // }
  
  module.exports={createOrder,renderConfirmorder,orderDetails,cancelOrder}