const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const Order=require("../../models/orderSchema")
const Address=require("../../models/addressSchema")
const productSchema = require("../../models/productSchema");
const Coupon=require('../../models/coupenSchema')
const mongoose = require('mongoose')
const Razorpay = require('razorpay');
// const env=require("dotenv").config()
const env = require("dotenv");
env.config(); 
const crypto = require('crypto');
const walletSchema=require("../../models/walletSchema")
const PDFDocument = require('pdfkit');
const fs = require('fs');
const DELIVERY_CHARGE=50
const createOrder = async (req, res) => {
  try {
    const { selectedAddressId, selectPayment, totalAMount,couponSelect,Disount } = req.body;
    const userId = req.session.user;
    console.log("totalAmount",totalAMount)
    if (!userId) {
      return res.status(401).json({ message: "User not found." });
    }
    
    if (!selectPayment || !selectedAddressId) {
      return res.status(400).json({ message: "Address and payment method are required." });
    }
if(totalAMount>1000){
  return res.status(400).json({ message: "Cash on Delivery is not available for orders above Rs 1000." });
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
      discount:req.session.totalDiscount,
      DELIVERY_CHARGE,
      
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
  key_id: process.env.YOUR_RAZORPAY_KEY_I_D,  
  key_secret: process.env.YOUR_RAZORPAY_KEY_SECRE_T, 
});
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
        couponSelect,
        Disount,
      } = req.body;
  
      const body = razorpayOrderId + "|" + razorpayPaymentId;
  
      const expectedSignature = crypto
        .createHmac("sha256", process.env.YOUR_RAZORPAY_KEY_SECRE_T)
        .update(body)
        .digest("hex");
      
      if (expectedSignature === razorpaySignature) {
        console.log("hello")
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
        }).lean();
  
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
          variants: item.variant._id,
          totalDiscount: Disount,
        }));
  
        for (let item of orderedItems) {
          let offer = 0;
          let originalPrice = item.price;
  
          if (item.Product) {
            const bestOffer = await productSchema
              .findOne({ _id: item.Product })
              .populate("category");
  
            offer = Math.max(bestOffer.category.offerPrice, bestOffer.productOffer);
          }
  
          item.price = originalPrice - (originalPrice * offer) / 100;
          item.totalPrice = item.price * item.quantity;
        }
  
        const addressObject = address.address[0];
  
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
          paymentMethod: selectPayment,
          discount: req.session.totalDiscount,
          DeliveryCharge: DELIVERY_CHARGE,
        });
  
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
            console.log("Variant not matched");
          }
        }
  
        for (const item of matchedVariants) {
          await productSchema.updateOne(
            { "variants._id": item._id },
            { $set: { "variants.$.stock": item.stock } }
          );
        }
  
        await Cart.updateOne({ userId }, { $set: { items: [] } });
  
        const coupon = await Coupon.findOne({ name: couponSelect });
        if (coupon) {
          coupon.userId.push(userId);
          await coupon.save();
        }
  
        return res.json({
          success: true,
          message: "Payment successfully verified.",
          newOrder: newOrder,
        });
      } else {
        console.log("slflkjafskljfasjflkj")
        return res.json({
          success: false,
          message: "Payment verification failed. Invalid signature.",
        });
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while verifying the payment.",
      });
    }
  };


  const  failRazorpayOrder=async(req,res)=>{
    try{
     console.log(req.body)
    const userId=req.session.user
    const { selectedAddressId, selectPayment, totalAMount,couponSelect ,Disount} = req.body;
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
    }).lean();
  
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
      variants: item.variant._id,
      totalDiscount: Disount,
    }));
  
    for (let item of orderedItems) {
      let offer = 0;
      let originalPrice = item.price;
  
      if (item.Product) {
        const bestOffer = await productSchema
          .findOne({ _id: item.Product })
          .populate("category");
  
        offer = Math.max(bestOffer.category.offerPrice, bestOffer.productOffer);
      }
  
      item.price = originalPrice - (originalPrice * offer) / 100;
      item.totalPrice = item.price * item.quantity;
    }
  
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
      status: 'Pending',
      paymentMethod: selectPayment,
      discount: req.session.totalDiscount,
      DeliveryCharge: DELIVERY_CHARGE,
      paymentStatus:'Failed'
  
    });
  
    await newOrder.save();
  
    }
    catch(error){
  console.log(error)
    }
   }
  
  

   const retryRazorpayOrder = async (req, res) => {
     try {
       const { razorpayOrderId, razorpayPaymentId, razorpaySignature, totalAmount,orderId } = req.body;
   
       console.log("Payment Details Received:", req.body);
   
       if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
         return res.status(400).json({ success: false, message: "Missing payment details" });
       }
   
       const hmac = crypto.createHmac("sha256", process.env.YOUR_RAZORPAY_KEY_SECRE_T);
       hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
       const generatedSignature = hmac.digest("hex");
   
       if (generatedSignature !== razorpaySignature) {
         return res.status(400).json({ success: false, message: "Invalid payment signature" });
       }
   
      const orderUpdate=await Order.findOne({orderId:orderId})
      if(orderUpdate){
      orderUpdate.status='Shipped'
      orderUpdate.paymentStatus='Paid'
      orderUpdate.razorpayPaymentId=razorpayPaymentId
      orderUpdate.razorpaySignature=razorpayPaymentId
      orderUpdate.razorpayOrderId=razorpayOrderId
     
      }
      await orderUpdate.save()
      console.log('orderUpdate',orderUpdate)
       res.json({ success: true, message: "Payment verified", newOrder: orderUpdate});
   
     } catch (error) {
       console.error("Retry Payment Error:", error);
       res.status(500).json({ success: false, message: "Something went wrong" });
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

      console.log('orderDetails',orderDetails)
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


      
      // console.log("order",order)
console.log('orders',order)
     res.render('user/viewOrders',{order})
    }
    catch(error){
console.log(error)
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
          console.log("item",item)
          item.status='Cancelled'
          console.log("order.orderedItems",order.orderedItems)
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
         
        //  return item
        await order.save()
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
   for (let i = 0; i < order.orderedItems.length; i++) {
    let item = order.orderedItems[i]; 
    for (let key in item) {
      if(key=="status"&&item[key]!="Cancelled"){
        item[key]="Return Request"
      }
        

    }
}
   if(order)
   await order.save()
   return res.json({success:true})
  //  console.log("order",order)
  

  }
  catch(error){
    console.log(error)
  }
}




const walletOrder=async(req,res)=>{
  try{
   const { selectedAddressId, selectPayment, totalAMount,couponSelect,Disount } = req.body;
    console.log("req.body",req.body)
    const userId=req.session.user;
    const wallet = await walletSchema.findOne({userId:userId})
    if(!wallet){
      const newWallet= new walletSchema({userId })
      await newWallet.save()
    }
    const address = await Address.findOne(
      { userId, 'address._id': selectedAddressId },
      { address: { $elemMatch: { _id: selectedAddressId } } }
    );
  // await wallet.save()
  if (!address) {
    return res.status(404).json({ message: "Address not found." });
  }
  const cart = await Cart.findOne({ userId }).populate({
    path: "items.productId",
    model: "Product",
  })
  .lean();
  if (wallet.totalBalance == 0) {
    return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
  }
  if (wallet.totalBalance < totalAMount) {
    return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
  }
  
    if(wallet.totalBalance>=totalAMount){
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
        let offer = 0;
        let originalPrice = item.price;
      
        if (item.Product) {
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
        discount:req.session.totalDiscount,
        DeliveryCharge: DELIVERY_CHARGE
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
     wallet.totalBalance=wallet.totalBalance-totalAMount
     wallet.transactions.push({
        type: 'Withdrawal',
        amount: totalAMount,
        orderId:newOrder.orderId,
          date: new Date()
    });
      await wallet.save()
       res.status(200).json({success:true,newOrder})
     
      
   
      // console.log(wallet.totalBalance)

    }
    // console.log("wallet",wallet)









  }
  catch(error){
  console.log(error)
  }
}




const productCancel=async (req,res)=>{
  try{
   const {orderId,productId}=req.body
  const user=req.session.user
   const orders=await Order.findOne({orderId:orderId})
  //  console.log(orders)
  //  console.log('orderedItems,orderedItems',orders[0].orderedItems)
   for(let i=0;i<orders.orderedItems.length;i++){
    console.log(orderId,productId)
    console.log("hlo",orders.orderedItems[i])
    if(productId===orders.orderedItems[i]._id.toString()){
      console.log(true)
       orders.orderedItems[i].status='Cancelled';
       const price=orders.orderedItems[i].price
       orders.finalAmount=orders.finalAmount-price
       console.log(true,price)
       const product =  orders.orderedItems[i].Product
       const variantId=orders.orderedItems[i].variants
       const quantity=orders.orderedItems[i].quantity
       console.log("hlo",orders.orderedItems[i])
       console.log(true,variantId)
       console.log('producssst',product)
       const products = await productSchema.findOne({ _id: product })
       const wallet =await walletSchema.findOne({userId:user})
       for(let i=0;i<products.variants.length;i++){
        console.log("ghfhfghjgj",products.variants[i])
        for(let key in products.variants[i]){
          if (products.variants[i][key] && products.variants[i][key].toString() === variantId.toString()) {

            console.log(true)
          // console.log(key)
          if ('stock' in products.variants[i]) {
            console.log("Stock:", products.variants[i].stock);
            products.variants[i].stock+=quantity
            console.log("Stock:", products.variants[i].stock);
           

        } else {
            console.log("Stock key not found!");
        }

          
          }
        }
        
      }
if(orders.paymentMethod=='razorpay'||orders.paymentMethod=='wallet'){
      if (!wallet) {
        const newWallet = new walletSchema({
          userId:user,
          totalBalance: refundAmount,
          transactions: [
            {
              type: "Refund",
              amount: price,
              orderId: orderId,
              date: new Date(),
            },
          ],
        });
  
        console.log("New Wallet:", newWallet);
        await newWallet.save();
      } else {
        wallet.totalBalance += price;
        wallet.transactions.push({
          type: "Refund",
          amount: price,
          orderId: orderId,
          date: new Date(),
        });
  
        await wallet.save();
      }
    }


      const allCancelled = orders.orderedItems.every(item => item.status === "Cancelled");

if (allCancelled) {
    console.log(" All items are cancelled!");
    console.log('orders',orders)
    orders.status='Cancelled'
} else {
    console.log(" Some items are not cancelled.");
}
      //  console.log('products',products)
      //  console.log('products varaints',products.variants)
   await products.save()
   
    }else{
      console.log(false)
    }
    console.log("hlo",orders.orderedItems[i])
   }
   
  await orders.save()
  return res.json({success:true})
  }
  catch(error){
 console.log(error)
  }
}
  


const returnproduct=async(req,res)=>{
  const { productId } = req.body;
  console.log(true)
  try {
  
      await Order.updateOne(
          { "orderedItems._id": productId },
          { $set: { "orderedItems.$.status": 'Return Request'} }
      );

      res.status(200).json({ message: "Product return request successful" });
  } catch (error) {
      console.error("Error processing return:", error);
      res.status(500).json({ message: "Failed to process return request" });
  }
}






const pdf = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    console.log("Generating PDF for orderId:", orderId);

    // Fetch the order with populated user and product details
    const order = await Order.findOne({ orderId }).populate([
      {
        path: "userId",
        select: "name address phone",
      },
      {
        path: "orderedItems.Product",
      },
    ]);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const user = order.userId;

    const doc = new PDFDocument({ margin: 50 });
    const filename = `invoice_${orderId}.pdf`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    doc.fontSize(24).text("INVOICE", { align: "center" });
    doc.moveDown(2);

    doc
      .fontSize(12)
      .text(`Invoice Number: INV-${orderId}`, { align: "right" });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: "right" });
    doc.moveDown();

    doc.fontSize(14).text("Order Details", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Order ID: ${order.orderId}`);
    doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`);
    doc.text(`Payment Method: ${order.paymentMethod}`);
    doc.moveDown(1);

    doc.fontSize(14).text("Customer Details", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Name: ${user?.name || "N/A"}`);
    doc.text("Address:");
    doc.text(`${order.address.streetaddress || "N/A"}`);
    doc.text(`- ${order.address.pincode || "N/A"}`);
    doc.text(`Phone: ${order.address.phone || "N/A"}`);
    doc.moveDown(1);

    const startX = 50; 
    const productWidth = 250; 
    const qtyWidth = 50; 
    const priceWidth = 100; 
    const totalWidth = 100; 
    
    // doc
    //   .fontSize(14)
    //   .text("Product", startX, doc.y, { width: productWidth, align: "left"})
    //   .text("Qty", startX + productWidth, doc.y, { width: qtyWidth, align: "center" })
    //   .text("Price", startX + productWidth + qtyWidth, doc.y, { width: priceWidth, align: "right" })
    //   .text("Total", startX + productWidth + qtyWidth + priceWidth, doc.y, { width: totalWidth, align: "right" });

    // doc.moveDown(0.5);
    // doc.moveTo(startX, doc.y)
    //   .lineTo(startX + productWidth + qtyWidth + priceWidth + totalWidth, doc.y)
    //   .stroke();
    // doc.moveDown(0.5);
    doc
  .fontSize(14)
  .text("Product", startX, doc.y, { width: productWidth, align: "left" })
  .text("Qty", startX + productWidth, doc.y, { width: qtyWidth, align: "center" })
  .text("Price", startX + productWidth + qtyWidth, doc.y, { width: priceWidth, align: "right" })
  .text("Total", startX + productWidth + qtyWidth + priceWidth, doc.y, { width: totalWidth, align: "right" });

doc.moveDown(0.5); // Moves down a little before drawing the line

// Draw a horizontal line under the headers
doc.moveTo(startX, doc.y).lineTo(startX + productWidth + qtyWidth + priceWidth + totalWidth, doc.y).stroke();

doc.moveDown(0.5); // Move down before rendering product items


    order.orderedItems.forEach((item) => {
      doc
        .fontSize(12)
        .text(item.Product.productName, startX, doc.y, { width: productWidth, align: "left" })
        .text(`${item.quantity}`, startX + productWidth, doc.y, { width: qtyWidth, align: "center" })
        .text(`₹${item.price.toFixed(2)}`, startX + productWidth + qtyWidth, doc.y, { width: priceWidth, align: "right" })
        .text(`₹${(item.price * item.quantity).toFixed(2)}`, startX + productWidth + qtyWidth + priceWidth, doc.y, { width: totalWidth, align: "right" });

      doc.moveDown();
    });

 
    doc.moveDown();
    doc.moveTo(startX, doc.y)
      .lineTo(startX + productWidth + qtyWidth + priceWidth + totalWidth, doc.y)
      .stroke();
    doc.moveDown(0.5);

    
    doc
      .fontSize(12)
      .text(`Subtotal: ₹${order.finalAmount.toFixed(2)}`, startX + productWidth + qtyWidth + priceWidth, doc.y, {
        width: totalWidth,
        align: "right",
      });

    doc
      .fontSize(12)
      .text(`Total Amount: ₹${order.finalAmount.toFixed(2)}`, startX + productWidth + qtyWidth + priceWidth, doc.y, {
        width: totalWidth,
        align: "right",
      });

  
    doc.moveDown(1);
    doc.fontSize(12).text("Thank you for shopping with us!", { align: "center" });


    doc.end();
  } catch (error) {
    console.log("Error generating PDF:", error);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
};



 



// const Razorpay = require("razorpay");
// require("dotenv").config();

// const razorpay = new Razorpay({
//   key_id: process.env.YOUR_RAZORPAY_KEY_ID,
//   key_secret: process.env.YOUR_RAZORPAY_KEY_SECRET,
// });














  module.exports={
    createOrder,
    renderConfirmorder,
    orderDetails,
    cancelOrder,
    raz,
    walletOrder,
    razorpayInstance,
    verRaz,
    refund,
    productCancel,
    returnproduct,
    pdf,
    failRazorpayOrder,
    retryRazorpayOrder
  }