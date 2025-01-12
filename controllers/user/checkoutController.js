const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");

const productSchema = require("../../models/productSchema");

const getCheckout=async (req,res)=>{
    try{
        const user=req.session.user;
        // console.log(user)
        if(!user){
          return res.redirect('/login')
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
        // console.log("totalAmount",totalAmount)
        // console.log(totalAmount)
        // console.log(cart,"hi")
         
        // console.log("cart",cart,"address",address,"addressData",addressData)
        res.render('user/checkout', { cart, addressData , totalAmount});
        // console.log(address)  
    }
    catch(error){
        console.error('Error loading checkout:', error);
        res.status(500).send('Internal Server Error');
    }
}




module.exports={getCheckout}