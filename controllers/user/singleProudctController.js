const Category = require('../../models/categorySchema');
const productSchema=require('../../models/productSchema')
const loadSingleProduct = async(req,res)=>{
    try{
    const productId=req.query.id;
    const product= await productSchema.findById(productId).populate('category')
    console.log("singleproduct",product)
    // console.log(product.category)

    const findCategory = product.category;
      const relatedProducts = await productSchema.find({
       category: findCategory._id,  
       _id: { $ne: productId }, 
   }).limit(5);     

const productWithOffer = JSON.parse(JSON.stringify(product.toObject()));
console.log(productWithOffer.productOffer,productWithOffer.category.offerPrice)
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
    res.render("user/singleProduct",
        {
            products:productWithOffer,
            relatedProducts,
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