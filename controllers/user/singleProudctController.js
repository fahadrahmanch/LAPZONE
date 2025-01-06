const Category = require('../../models/categorySchema');
const productSchema=require('../../models/productSchema')
const loadSingleProduct = async(req,res)=>{
    try{
    const productId=req.query.id;
    const product= await productSchema.findById(productId).populate('category')
    // console.log(product.category)

    const findCategory = product.category;
      const relatedProducts = await productSchema.find({
       category: findCategory._id,  
       _id: { $ne: productId }, 
   }).limit(5);     
//    console.log("to show ",relatedProducts)



    // console.log('relatedProducts',relatedProducts);
    res.render("user/singleProduct",
        {
            products:product,
            relatedProducts
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