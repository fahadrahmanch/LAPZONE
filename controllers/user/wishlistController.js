const wishlistSchema = require("../../models/WhislistSchema");
const userSchema = require("../../models/userSchema");

const getwishlist = async (req, res) => {
  try {
    let user = req.session.user;
    if (!user) {
      res.json({ success: false, message: "please login" });
    }
    const wishlist = await wishlistSchema
    .findOne({ userId: user })
    .populate({
      path: 'products.productId',
      model: 'Product',
      populate: {
        path: 'category', // Assuming the Product model has a category field
        model: 'Category'
      }
    })
    .lean();
  console.log("wishlist",wishlist)
 
    // for (let item of wishlist.products) {
      
    //   let offer = 0;
    //   let originalPrice = item.variants.salePrice;
    //   console.log(originalPrice)
     
    
    //   // item.price = originalPrice - (originalPrice * offer) / 100;
    //   // item.totalPrice=item.price*item.quantity
    // }
      if (!wishlist) {
        return res.render("user/wishlist", { product: [] });
      }
      console.log("gdfsjlksdgf",wishlist.products)
      wishlist.products = wishlist.products.map((item) => {
        const variantId = item.variants;
        const productVariants = item.productId.variants; 
        console.log("Products",productVariants)
        console.log("items", item)
        const variant = productVariants.find(
          (variant) => variant._id.toString() === variantId.toString()
        );
       

        if (variant) {
          item.variants = variant;  
        } else {
          item.variants = null;  
        }
      
        return item; 
      });
      console.log("wishlist.products",wishlist.products)
      console.log(wishlist)
      wishlist.products.map((item)=>{
        console.log('item',item)
        const originalPrice=item.variants.salePrice
        const bestOffer =
        item.productId.productOffer > item.productId.category.categoryOffer
          ? item.productId.productOffer
          : item.productId.category.categoryOffer;

       console.log('item.variants.salePrice',item.variants.salePrice) 
       item.variants.salePrice=originalPrice - (originalPrice * bestOffer) / 100;

        console.log(bestOffer)




      })
      // console.log("wishlist",wishlist.products)

     if(!wishlist){
        return res.render("user/wishlist", { product: [] });
     }
    
     res.render("user/wishlist", { product: wishlist.products });


  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return res.json({ success: false, message: "Failed to fetch wishlist" });
  }
};
const addWishlist = async (req, res) => {
  try {
    const { productId, variantId } = req.body;
    console.log("hi", req.body);
    const user = req.session.user;
    if (!user) {
      return res.json({ success: false, message: "please login" });
    }
    let wishlist = await wishlistSchema.findOne({ userId: user });
    if(wishlist){
    let variants=  wishlist.products.find((item)=>{
        if(item.variants._id.toString()===variantId.toString()){
            return true
        }
       
    })
    if(variants){
        return res.json({ success: false, message: "Product already in wishlist" });
    }
    // console.log("varinatzzzzzzs",variants)
}

   
    if (!wishlist) {
      wishlist = new wishlistSchema({
        userId: user,
        products: [{ productId, variants: variantId }],
      });
    } else {
     wishlist.products.push({productId, variants: variantId })
    }
    await wishlist.save();
    return res.json({ success: true, message: "Product added to wishlist" });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: "Failed to add to wishlist" });
  }
};
// const removeWishlist = async (req, res) => {
//     try {
//       const { productId, variantId } = req.body; // Inputs from request
//       const user = req.session.user; // Get the logged-in user
  
//       if (!user) {
//         return res.json({ success: false, message: "Please login" });
//       }
  
//       // Find the user's wishlist
//       const userwishlist = await wishlistSchema.findOne({ userId: user });
  
//       if (!userwishlist) {
//         return res.json({ success: false, message: "Wishlist not found" });
//       }
  
//       // Find the index of the product in the wishlist
//       const productIndex = userwishlist.products.findIndex(
//         (product) => product.productId.toString() === productId.toString()
//       );
  
//       if (productIndex === -1) {
//         return res.json({
//           success: false,
//           message: "Product not found in the wishlist",
//         });
//       }
  
//       const product = userwishlist.products[productIndex];
  
//       if (variantId) {
//         // If a variantId is provided, check and remove the variant
//         if (
//           product.variants &&
//           product.variants.toString() === variantId.toString()
//         ) {
//           // Remove the product if the variant matches
//           userwishlist.products.splice(productIndex, 1);
  
//           // Save the updated wishlist
//           await userwishlist.save();
  
//           return res.json({
//             success: true,
//             message: "Variant removed from wishlist",
//           });
//         } else {
//           return res.json({
//             success: false,
//             message: "Variant not found in the wishlist",
//           });
//         }
//       } else {
//         // If no variantId is provided, remove the entire product
//         userwishlist.products.splice(productIndex, 1);
  
//         // Save the updated wishlist
//         await userwishlist.save();
  
//         return res.json({
//           success: true,
//           message: "Product removed from wishlist",
//         });
//       }
//     } catch (error) {
//       console.error(error);
//       return res.status(500).json({ success: false, message: "Server error" });
//     }
//   };
  
const removeWishlist = async(req,res)=>{
    try{
    const {productId,variantId}=req.body;
    console.log("sdf",req.body)
    const user=req.session.user;
    if(!user){
        return res.json({success:false, message:"please login"})
    }
    const userwishlist = await wishlistSchema.findOne({ userId: user });
    if (!userwishlist) {
            return res.json({ success: false, message: "Wishlist not found" });
    }
    const productIndex=userwishlist.products.findIndex(
        (product)=>product.productId.toString()===productId.toString()
    );
    if(productIndex===-1){
        return res.json({
            success:false,
            message:"Product not found in the wishlist"
        })
    }
    const product=userwishlist.products[productIndex];
    if(variantId){
        
        if(product.variants&&product.variants.toString()===variantId.toString()){
            userwishlist.products.splice(productIndex,1)
            await userwishlist.save();
            return res.json({
                success: true,
                message: "Variant removed from wishlist",
              });
        } else {
            return res.json({
              success: false,
              message: "Variant not found in the wishlist",
            });
          }
    }else {

        userwishlist.products.splice(productIndex, 1);
  
      
        await userwishlist.save();
  
        return res.json({
          success: true,
          message: "Product removed from wishlist",
        });
      }
    }
    catch(error){
        console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
    }
}
module.exports = { getwishlist, addWishlist, removeWishlist };
