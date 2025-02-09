const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Coupon=require('../../models/coupenSchema')
const productSchema = require("../../models/productSchema");
const Coupen = require("../../models/coupenSchema");

const getCheckout=async (req,res)=>{
    try{
        const user=req.session.user;
        // req.session.Coupenamount=0
        // console.log(user)
        if(!user){
          return res.redirect('/')
        }
        
        const cart=await Cart.findOne({userId:user}).populate({
            path: "items.productId",
            model: "Product",
            populate: {
              path: "category", 
              model: "Category",
            },
          })
          .lean();
         if(!cart){return res.redirect('/')}
          cart.items = cart.items.map((item) => {
          
            const variantId = item.variantId;
      
            const variant = item.productId.variants.find(
              (variant) => variant._id.toString() === variantId.toString()
            );
            delete item.variants;
            item.variant = variant;
            return item;
          });
          console.log("cart",cart.items)
          // console.log("cart.itemscart.items",cart.items )

          const checkoutwithoffer=cart.items.map((item)=>{
            const categoryOffer=item.productId.category.categoryOffer
            const productOffer=item.productId.productOffer
            const bestOffer=Math.max(categoryOffer,productOffer)
            const originalPrice = item.variant.salePrice;
             
            const quantity = item.quantity;
            console.log("categoryOffer",categoryOffer)
            console.log("productOffer",productOffer)
            console.log("bestOffer",bestOffer)
            console.log("originalPrice",originalPrice)
            console.log("item.variant.salePrice")
            // item.variant.salePrice=Number(originalPrice - (originalPrice * bestOffer / 100));
            // item.totalPrice=Number(item.variant.salePrice*quantity)
            // console.log(" item.variant.salePrice", item.variant.salePrice)
            // item.discount=originalPrice*
            const discountedPrice = Number(originalPrice - (originalPrice * bestOffer / 100));
            item.variant.salePrice = discountedPrice;
            item.totalPrice = Number(discountedPrice * quantity);
        
            // Calculate discount
            item.discount = (originalPrice - discountedPrice) * quantity;
            return {
              ...item,
              bestOffer,
              // finalPrice: salePrice
          };          
          })
          // console.log("discount",discount)
    // console.log('checkoutwithoffer',checkoutwithoffer)
    
     req.session.totalDiscount = checkoutwithoffer.reduce((acc, item) => {
      if (item.discount) {
          console.log("s", item.discount);
          return acc + item.discount;
      }
      return acc;
  }, 0);
  
  // console.log("Total Discount:", totalDiscount);
  








        // console.log("newcart",newcart)
        const address=await Address.findOne({userId:user})
        const addressData=address||{address:[]}
        if (!cart || cart.items.length === 0) {
            return res.redirect('/cart'); 
        }
        const totalAmount = cart.items.reduce((sum, item) => {
            const price = item.quantity *  (item.variant.salePrice);
            return sum + price
          }, 0);
// console.log("totalAmount",totalAmount)
          const today = new Date().toISOString().split('T')[0];

          const activeCoupens = await Coupon.find({
            isList: true,
            expireOn: { $gte: today } 
          });
          
      //  console.log(activeCoupens)
      //   console.log(activeCoupens)
      // console.log("cart aanye",cart)
        res.render('user/checkout', { 
          cart:checkoutwithoffer, 
          activeCoupens,
          addressData, 
          totalAmount,
          coupenAmount:req.session.Coupenamount||0,
          Disount: req.session.totalDiscount ||0,
          message:req.session.user||""
        });
        
    }
    catch(error){
        console.error('Error loading checkout:', error);
        res.status(500).send('Internal Server Error');
    }
}


const applyCoupen=async(req,res)=>{
  try{
  console.log('checkoutwithoffer',req.session.totalDiscount)
   const{totalAmount,selectedCoupon}=req.body
   const discount=await Coupen.findOne({name:selectedCoupon})
   console.log("discount",discount)
   if(discount.minimumPrice>=totalAmount){
    return res.status(401).json({success:false,message:` Minimum purchase amount of ₹${discount.minimumPrice} is required`})
   }
   
   const totalDiscountAmount = (req.session.totalDiscount || 0) + discount.offerPrice;
  const discountPrice=discount.offerPrice
  

   req.session.totalDiscount = totalDiscountAmount;
   console.log(req.session.totalDiscount)
   const final=totalAmount-discount.offerPrice
    return res.status(200).json({success:true,message:final,discountPrice})
  }
  catch(error){
  console.log(error)
  }
}






module.exports={getCheckout,applyCoupen}