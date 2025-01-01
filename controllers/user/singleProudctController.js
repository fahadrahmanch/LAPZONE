const productSchema=require('../../models/productSchema')
const loadSingleProduct = async(req,res)=>{
    try{
    const productId=req.query.id;
    const product= await productSchema.findById(productId).populate('category');
    res.render("user/singleProduct",
        {
            products:product
        }
    )
    }
    catch(error){
     console.log(error)
    }
  }
 
  module.exports={loadSingleProduct}