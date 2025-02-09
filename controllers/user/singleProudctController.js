const Category = require('../../models/categorySchema');
const productSchema=require('../../models/productSchema')
const wishlistSchema=require('../../models/WhislistSchema');
const loadSingleProduct = async(req,res)=>{
    try{
    const productId=req.query.id;
    const userId=req.session.user
    const product= await productSchema.findById(productId).populate('category')
    const findCategory = product.category;
      const relatedProducts = await productSchema.find({
       category: findCategory._id,  
       _id: { $ne: productId }, 
   }).limit(5);     

   const userWishlist=await wishlistSchema.findOne({userId})
const productWithOffer = JSON.parse(JSON.stringify(product.toObject()));


console.log("userWishlist",userWishlist)


// console.log(productWithOffer.productOffer,productWithOffer.category.offerPrice)
let bestoffer
if(productWithOffer.productOffer>productWithOffer.category.offerPrice){
  bestoffer=productWithOffer.productOffer
}else{
  bestoffer=productWithOffer.category.offerPrice
}

if(bestoffer>0){
  productWithOffer.variants.map((item)=>{
    item.salePrice=item.salePrice - (item.salePrice * (bestoffer / 100));
    
  })
}

productWithOffer.variants.forEach((item) => {



  const variantId = item._id;
  
  console.log('variantId', variantId);

  const iswish= userWishlist?.products?.some((wishlistItem) => 
    wishlistItem.variants.toString()===variantId.toString()
  ) || false;
  console.log(iswish)
  if(iswish){
   
    for(let key of productWithOffer.variants){
      // console.log(key)
      if(key._id===variantId){
        for(let k in key){
          // console.log(k)
          key.isInwishlist=true
        }
      }else{
        key.isInwishlist=false
      }
      
    }
    
  }else{

  }

});
console.log("productWithOfferrrrrrrrrrrrrrrrrr",productWithOffer)


    res.render("user/singleProduct",
        {
            products:productWithOffer,
            relatedProducts:relatedProducts||[],
            message:req.session.user
        }
    )
    }
    catch(error){
     console.log(error)
    }
  }
  const variant=async(req,res)=>{
    try{
    console.log("F")
    }
    catch(error){

    }
  }
 
  module.exports={loadSingleProduct,variant}