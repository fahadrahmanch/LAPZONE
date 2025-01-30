const productSchema=require('../../models/productSchema')
const multer = require('multer'); 
const category=require('../../models/categorySchema')
const User=require('../../models/userSchema')
const fs=require("fs");
const path=require('path')
const sharp=require("sharp");
const Category = require('../../models/categorySchema');
const { categorySchema } = require('./categoriesController');
const productpage=async(req,res)=>{
  try{
    const search=req.query.search||"";
    const page=req.query.page||1
    const limit =4
    const productData=await productSchema.find({
      $or:[{productName:{$regex:new RegExp(".*"+search+".*","i")}}]
    }).limit(limit*1).skip((page-1)*limit).populate('category').exec()
    

    const count=await productSchema.find({
      $or:[{productName:{$regex:new RegExp(".*"+search+".*","i")}}]
    }).countDocuments();

    
    if(category){
     
      res.render("admin/product",{
        data:productData,
        currentPage:page,
        totalPages:Math.ceil(count/limit),
        cat:category,
        
      })

    }else{
      console.log("page-error")
    }
  }catch(error){
   console.log(error)
  }
}
const getPrductAddPage=async(req,res)=>{
    try{
        const category =await Category.find({isListed:true})
        res.render('admin/product-add',{
            cat:category,
           
        })
    }
    catch(error){{
    //    res.redirect('/pageerror')
    }}
}


const addProducts = async (req, res) => {
  try {
    console.log("addproduct")
    const products = req.body;
    // console.log(req.body)
    // console.log('Uploaded files:', req.files);

    const productExists = await productSchema.findOne({ productName: products.productName });

    if (!productExists) {
      if (req.files && req.files.length > 0) {
        console.log("leng")
        const images = [];

        for (let i = 0; i < req.files.length; i++) {
          images.push(req.files[i].filename);
        }

        const categoryID = await categorySchema.findOne({ name: products.category });
        if (!categoryID) {
          return res.status(400).json("Invalid category name");
        }
        // console.log(product.variants)
        const newProduct = new productSchema({
          productName: products.productName,
          description: products.description,
          category: categoryID._id,
          // regularPrice: products.regularPrice,
          // salePrice: products.salePrice,
          createdOn: new Date(),
          // quantity: products.size,
          productImage: images,
          status: 'Available',
          variants:[...products.variants]

          // product.productName = data.productName;
          // product.description = data.description;
          // // product.regularPrice = data.regularPrice;
          // // product.salePrice = data.salePrice;
          // // product.quantity = data.quantity;
          // console.log("product variant", data.variants)
          // product.variants=[...data.variants]
      

        });
        // console.log("new products",newProduct)

        await newProduct.save();
        return res.redirect('/admin/products');
      } else {
        return res.status(400).json("No files uploaded.");
      }
    } else {
      return res.status(400).json("Product already exists, please try with another name.");
    }
  } catch (error) {
    console.error("Error saving product:", error);
    return res.status(500).json("An error occurred while adding the product.");
  }
};
const getEditProduct=async(req,res)=>{
  try{
    const id=req.query.id;
    const product=await productSchema.findOne({_id:id})
    const category=await categorySchema.find({})
    res.render("admin/product-edit",{
      product:product,
      cat:category
    })
  }catch(error){
    console.log("error",error)
  }
}
const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await productSchema.findById({ _id: id });
    const data = req.body;

    const existingProduct = await productSchema.findOne({
      productName: data.productName,
      _id: { $ne: id }
    });
    if (existingProduct) {
      return res
        .status(400)
        .json({ error: "Product with this name exists. Please try with another name" });
    }

   
    if (data.category) {
      const categoryDoc = await Category.findOne({ name: data.category });
      if (!categoryDoc) {
        return res.status(400).json({ error: "Invalid category name" });
      }
      product.category = categoryDoc._id;
    }

    
    const images = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        images.push(req.files[i].filename);
      }
    }

   
    product.productName = data.productName;
    product.description = data.description;
    // product.regularPrice = data.regularPrice;
    // product.salePrice = data.salePrice;
    // product.quantity = data.quantity;
    // console.log("product variant", data.variants)
    product.variants=[...data.variants]

    if (images.length > 0) {
      product.productImage.push(...images);
    }

    await product.save();
    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "An error occurred while updating the product." });
  }
};
const deleteSingleImage=async(req,res)=>{
  try {
     const {imageNameToServer,productIdToServer}=req.body;
     const product=await productSchema.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}})
     const imagePath=path.join('public','uploads',imageNameToServer)
     if(fs.existsSync(imagePath)){
      await fs.unlinkSync(imagePath)
      console.log(`image ${imageNameToServer} deleted successfully`)
     }else{
      console.log("image not found")
     }
     res.send({status:true})
  } catch (error) {
    console.log(error)
  }
}
const productsInfo=async(req,res)=>{
  try{
    let search='';
    if(req.query.search){
      search=req.query.search;
    }
  let page=1;
  if(req.query.page){
      page=req.query.page;
  }
  const limit=6;
  const data=await productSchema.find({
      
      $or:[{productName:{$regex:".*"+search+".*"}},
          
      ],
  })
  .limit(limit*1)
  .skip((page-1)*limit)
  .exec();
  

  const count=await productSchema.find({
     
      $or:[{productName:{$regex:".*"+search+".*"}},
          
      ],
  }).countDocuments();
  const totalPages = Math.ceil(count / limit);
  const currentPage=page
  res.render('admin/product',{data,totalPages,currentPage})
  }
  catch(error){

  }
}
const listed=async(req,res)=>{
  // console.log("server")
  try{
    const{productId,action}=req.body;
  //  console.log(req.body)
    if(!productId||!action){
     
      return res.status(400).json({messege:'product Id action are required'})
    }
    const product=await productSchema.findById(productId);
   
       if (!product) {
          return res.status(404).json({ message: 'product not found' });
      }
   product.isListed=action==='unlist'
    await product.save()
    const status=action==='list'? 'unlist':'list';
  // console.log(status)
    res.status(200).json({message:`product successfully ${status}`,status})
  //   return res.status(200).json({message:"successfully"})
  }
  catch(error){
      console.log(error);
      res.status(500).json({message:"internal server error"})
  }
}



const addOffer=async(req,res)=>{
  try{
   
  const admin=req.session.admin
  if(!admin){return res.redirect('/admin/login')}
  const {productId,offerPercentage}=req.body;
  console.log("hello",productId,offerPercentage)
  if(!productId&&!offerPercentage){
   
    return res.json({success:false})
  }
  const product=await productSchema.findOne({_id:productId})
 if(!product){
  return res.json({success:false,message:"product not found"})
 }
//  console.log("proudct",product)
  product.productOffer=offerPercentage;
  // for(let i=0;i<product.variants.length;i++){
  // product.variants[i].offerPrice=product.variants[i].salePrice- product.variants[i].salePrice * (offerPercentage/ 100)
  // }

  await product.save()
  console.log("offer price add",product)
  // console.log("proudct")
  return res.json({success:true,})


  }
  catch(error){
    console.log(error)
  }
}
const removeProductOffer=async(req,res)=>{
  try{
   const {productId}=req.body
   const admin=req.session.admin
   if(!admin){return res.redirect('/admin/login')}
   console.log(productId)
   const product= await productSchema.findOne({_id:productId})
   product.productOffer=0
   await  product.save()
   return res.json({success:true})
   console.log(product)
  }
  catch(error){
console.log(error)
  }
}



module.exports = { addProducts };

module.exports={getPrductAddPage,addProducts,productpage,getEditProduct,editProduct,deleteSingleImage,productsInfo,listed,addOffer,removeProductOffer}
