const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const Order=require("../../models/orderSchema")
const Address=require("../../models/addressSchema")
const productSchema = require("../../models/productSchema");
const Coupon=require('../../models/coupenSchema')
const mongoose = require('mongoose')
const Razorpay = require('razorpay');
const env=require("dotenv").config()
const crypto = require('crypto');
const walletSchema=require("../../models/walletSchema")

const createOrder = async (req, res) => {
  try {
    console.log("hlooooooo")
    const { selectedAddressId, selectPayment, totalAMount,couponSelect,Disount } = req.body;
    console.log("coupen select",req.body)
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
      variants:item.variant._id,
      totalDiscount:Disount
    }));

    for (let item of orderedItems) {
      console.log("hlo");
      let offer = 0;
      let originalPrice = item.price;
    
      if (item.Product) {
        console.log("hlohi");
        const bestOffer = await productSchema
          .findOne({ _id: item.Product })
          .populate("category");
    
        offer = Math.max(bestOffer.category.offerPrice, bestOffer.productOffer);
        console.log(offer);
      }
    
      item.price = originalPrice - (originalPrice * offer) / 100;
      item.totalPrice=item.price*item.quantity
    }
    
    // console.log("orderedItemssssssssssss", orderedItems);

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
      paymentMethod:selectPayment,
      discount:req.session.totalDiscount
    });

    await newOrder.save();


  //  console.log("its cart",cart)

   const matchedVariants = []; 

   for (const item of cart.items) {
       const product = await productSchema.findById(item.productId._id);
   
     
 
       const matchedVariant = product.variants.find(
           (variant) => variant._id.toString() === item.variant._id.toString()
       );
   
       if (matchedVariant) {

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
    const coupon= await Coupon.findOne({name:couponSelect})
    if(coupon){
         coupon.userId.push(userId)
        await coupon.save()
    }

    // console.log("sdafjsf",coupon)
     res.status(200).json({success:true,newOrder})
  
  } catch (error) {
    console.error(error);
    return res.status(500).render('errorPage', { message: "Something went wrong. Please try again later." });


    
  }
};
const razorpayInstance = new Razorpay({
  key_id: process.env.YOUR_RAZORPAY_KEY_I_D,  // Replace with your Razorpay Key
  key_secret: process.env.YOUR_RAZORPAY_KEY_SECRE_T, // Replace with your Razorpay Secret Key
});
  //razorpay
  const raz=async(req,res)=>{
    try{
      const { selectedAddressId, selectPayment, totalAMount,couponSelect } = req.body;
      const amount=totalAMount*100
      
       const options = {
        amount,
        currency: "INR",
        receipt: `order_rcptid_${new Date().getTime()}`,
      };
      const razorpayOrder = await razorpayInstance.orders.create(options);
      // console.log(razorpayOrder)
      // console.log("razorpayOrder",razorpayOrder,razorpayInstance)
      res.json({success:true,razorpayOrder:razorpayOrder,razorpayInstance:razorpayInstance});

    }
    catch(error){
      console.log("sfn",error)
    }
  }

  const verRaz = async (req, res) => {
    try {
      const userId = req.session.user;
      const {
        razorpayOrderId,       
        razorpayPaymentId,     
        razorpaySignature,     
        selectedAddressId,     
        selectPayment,        
        totalAMount,           
        couponSelect ,
        Disount

      } = req.body;
 
    
      const body = razorpayOrderId + "|" + razorpayPaymentId;

      const expectedSignature = crypto
        .createHmac("sha256",  process.env.YOUR_RAZORPAY_KEY_SECRE_T) 
        .update(body)
        .digest("hex");
  // console.log("expectedSignature",expectedSignature)
      if (expectedSignature === razorpaySignature) {
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
          variants:item.variant._id,
          totalDiscount:Disount
        }));

        for (let item of orderedItems) {
          console.log("hlo");
          let offer = 0;
          let originalPrice = item.price;
        
          if (item.Product) {
            console.log("hlohi");
            const bestOffer = await productSchema
              .findOne({ _id: item.Product })
              .populate("category");
        
            offer = Math.max(bestOffer.category.offerPrice, bestOffer.productOffer);
            console.log(offer);
          }
        
          item.price = originalPrice - (originalPrice * offer) / 100;
          item.totalPrice=item.price*item.quantity
        }
        

        const addressObject = address.address[0];
        // console.log("Address",address)
      //  console.log('orderedItems',orderedItems)
      
   
        const newOrder = new Order({
          userId: userId,
          orderedItems,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
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
          paymentMethod:selectPayment,
          discount:req.session.totalDiscount
          

        });
  
        // const order = new Order(orderDetails); 
        // await order.save();
        console.log('newOrder',newOrder)
        await newOrder.save();

        const matchedVariants = []; 

        for (const item of cart.items) {
            const product = await productSchema.findById(item.productId._id);
        
          
      
            const matchedVariant = product.variants.find(
                (variant) => variant._id.toString() === item.variant._id.toString()
            );
        
            if (matchedVariant) {
               
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
         const coupon= await Coupon.findOne({name:couponSelect})
         if(coupon){
              coupon.userId.push(userId)
             await coupon.save()
         }
     
        //  console.log("sdafjsf",coupon)
          // res.json({success:true,newOrder})
        return res.json({
          success: true,
          message: "Payment successfully verified.",
          newOrder:newOrder,
        });
      } else {
        // Signature mismatch: Payment verification failed
        res.json({
          success: false,
          message: "Payment verification failed. Invalid signature.",
        });
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while verifying the payment.",
      });
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
      // console.log(id)
     res.render('user/orderConfirm',{orderDetails,message:req.session.user||"",})
    //  console.log("orderpage render")
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


      
      console.log("order",order)

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
        // console.log(id);

        const order = await Order.findOne({ userId,orderId: id });
        console.log("delete", order);
        console.log("paymentmethod",order.paymentMethod)

        if (!order) {
            return res
                .status(404)
                .json({ success: false, message: "Order not found" });
        }

        order.status = 'Cancelled';
        await order.save();
       
        for(const item of order.orderedItems){
          // console.log("item",item)
          const product = await productSchema.findOne({
            variants: { $elemMatch: { _id: item.variants } },
          });
          const variant = product.variants.find((variant)=>variant._id.toString() === item.variants.toString())
          // console.log("orderd", variant)
          // console.log("products",product)
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
    
     if(order.paymentMethod=='razorpay'){
      const Wallet=await walletSchema.findOne({userId});
      console.log("wallet",Wallet)
      if(!Wallet){
      const newWallet= new walletSchema({
        userId,
        totalBalance:order.finalAmount,
        transactions:[{
          type:'Refund',
          amount:order.finalAmount,
          orderId:order.orderId,
          // description:
        }]
      })
      console.log("newWalllet",Wallet)
      await newWallet.save()
      }else{
        Wallet.totalBalance += order.finalAmount;
                Wallet.transactions.push({
                    type: 'Refund',
                    amount: order.finalAmount,
                    orderId:order.orderId,
                      date: new Date()
                });
                await Wallet.save()
      }
     
     }


        return res.status(200).json({ success: true, message: "Order cancelled successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const refund=async(req,res)=>{
  try{
    const userId=req.session.userId
    
   const{ orderId,
    returnReason,
    additionalReason}=req.body;
   console.log(req.body)
   const order= await Order.findOne({orderId:orderId})
   if(!order){
   return res.json({success:false,})
   }
   order.returnRequest.status='Pending';
   order.returnRequest.reason=returnReason
   order.returnRequest.details=additionalReason

   order.status='Return Request'
   await order.save()
   return res.json({success:true})
  //  console.log("order",order)
  

  }
  catch(error){
    console.log(error)
  }
}


  
  module.exports={createOrder,renderConfirmorder,orderDetails,cancelOrder,raz,razorpayInstance,verRaz,refund}