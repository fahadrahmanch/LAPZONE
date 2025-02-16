const multer = require("multer");
const path = require("path");
const Brand = require("../../models/brandSchema");


const getBrand=async(req,res)=>{
    try{
        const brand=await Brand.find({})
        console.log(brand)
    res.render("admin/brand",{brand})
    }
    catch(error){
        console.log(error)
    }
}

const addBrand=async(req,res)=>{
    try{

        const { name } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null; // Store image path
        console.log(name,image)
        const newBrand = new Brand({ brandName: name, brandImage: image });
        await newBrand.save();

        console.log("Brand Added:", name, image);
        res.redirect("/admin/brand"); 

    }
    catch(error){
        console.log(error)
    }
}


const block=async(req,res)=>{
    try{
    const{id}=req.body
    const brand=await Brand.findOne({_id:id})
    if (!brand) {
        return res.json({ success: false, message: "Brand not found" });
    }
    console.log('brand',brand)
    if(brand.isBlocked){
        brand.isBlocked=false
    }else{
        brand.isBlocked=true
    }
    
    await brand.save()
    return res.json({success:true})
    }
    catch(error){
        console.log(error)
    }
}



module.exports={getBrand,addBrand,block}