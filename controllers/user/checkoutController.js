const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Coupon=require('../../models/coupenSchema')
const productSchema = require("../../models/productSchema");
const Coupen = require("../../models/coupenSchema");

const getCheckout=async (req,res)=>{
    try{
        const user=req.session.user;
        // console.log(user)
        if(!user){
          return res.redirect('/')
        }
        
        const cart=await Cart.findOne({userId:user}).populate({
            path: "items.productId",
            model: "Product",
          })
          .lean();
          cart.items = cart.items.map((item) => {
            const variantId = item.variantId;
      
            const variant = item.productId.variants.find(
              (variant) => variant._id.toString() === variantId.toString()
            );
            delete item.variants;
            item.variant = variant;
            return item;
          });
        // console.log("newcart",newcart)
        const address=await Address.findOne({userId:user})
        const addressData=address||{address:[]}
        if (!cart || cart.items.length === 0) {
            return res.redirect('/cart'); 
        }
        const totalAmount = cart.items.reduce((sum, item) => {
            const price = item.quantity * item.variant.salePrice;
            return sum + price
          }, 0);

          const today = new Date().toISOString().split('T')[0];

          const activeCoupens = await Coupon.find({
            isList: true,
            expireOn: { $gte: today } 
          });
          
      //  console.log(activeCoupens)
      //   console.log(activeCoupens)
        res.render('user/checkout', { 
          cart, 
          activeCoupens,
          addressData, 
          totalAmount,
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

   const{totalAmount,selectedCoupon}=req.body
   const discount=await Coupen.findOne({name:selectedCoupon})
   
   if(discount.minimumPrice>=totalAmount){
    return res.status(401).json({success:false,message:` Minimum purchase amount of ₹${discount.minimumPrice} is required`})
   }
   const final=totalAmount-discount.offerPrice
    return res.status(200).json({success:true,message:final})
  }
  catch(error){
  console.log(error)
  }
}






module.exports={getCheckout,applyCoupen}