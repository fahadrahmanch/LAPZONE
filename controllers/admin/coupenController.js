const Coupon=require('../../models/coupenSchema')



const getcoupen=async(req,res)=>{
    try{
      const admin=req.session.admin
      if(!admin) return res.redirect('/admin/login')
      const page=parseInt(req.query.page)||1;
      const limit=4;
      const skip=(page-1)*limit;
      const totalCoupons=await Coupon.countDocuments();
      const coupons=await Coupon.find().sort({_id:-1}).skip(skip).limit(limit);

     
        res.render('admin/coupen',{
            coupons,
            totalPages: Math.ceil(totalCoupons / limit),
            currentPage: page,
        })
     
   
    }
    catch(error){
        console.log(error)
    }
}
const addCoupen=async(req,res)=>{
    try{
        const admin=req.session.admin
        if(admin){
     res.render('admin/addCoupen')
        }else{
            res.redirect('/admin/login')
        }
    }
    catch(error){
        console.log(error)
    }
}
// const editCoupen=async(req,res)=>{
//     try{
//         const admin=req.session.admin
//         if(!admin) return res.redirect('/admin/login')
//     }
//     catch(error){
//         console.log(error)
//     }
// }


const addCoupenPost=async(req,res)=>{
    try{

    const {name,price,Amount,date}=req.body;
    console.log(req.body)
    const cpname=await Coupon.findOne({name:name})
    console.log(cpname)
    if(cpname){
      return res.json({success:false,messgae:"this coupen already exists"})
    }
    const admin=req.session.admin;
    if(!admin) return res.redirect('/admin/login')
    if(!name||!price||!Amount||!date){
       return res.json({success:false,message:"coupen must be all fields"})
    }
    const newCoupen=new Coupon({
        name,
        expireOn:date,
        offerPrice:price,
        minimumPrice:Amount,

    })
    await newCoupen.save()
  return   res.redirect('/admin/coupen')
}
catch(error){
    console.log(error)
}
}


const islist=async(req,res)=>{
    try{
        const {name} =req.params
        console.log(name)
        const coupen=await Coupon.findOne({name:name})
        if(coupen.isList){
            console.log("sfh")
            coupen.isList=false
            console.log(coupen.isList)
        }else{
            coupen.isList=true
            console.log(coupen.isList)
        }
        await coupen.save()
       
        return res.redirect('/admin/coupen')
        
    }
    catch(error){
        console.log(error)
    }
}


module.exports={getcoupen,addCoupen,addCoupenPost,islist,}