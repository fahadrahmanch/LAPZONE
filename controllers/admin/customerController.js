const User=require("../../models/userSchema")


const customerInfo=async(req,res)=>{
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
    const data=await User.find({
        isAdmin:false,
        $or:[{name:{$regex:".*"+search+".*"}},
            {email:{$regex:".*"+search+".*"}},
        ],
    })
    .limit(limit*1)
    .skip((page-1)*limit)
    .exec();
    

    const count=await User.find({
        isAdmin:false,
        $or:[{name:{$regex:".*"+search+".*"}},
            {email:{$regex:".*"+search+".*"}},
        ],
    }).countDocuments();
    const totalPages = Math.ceil(count / limit);
    const currentPage=page
    res.render('admin/userlist',{data,totalPages,currentPage})
    }
    catch(error){

    }
}
const block=async(req,res)=>{
    try{
        console.log("hi")
     const {id,action}=req.body;
     if(!id||!action){
        return res.status(400).json({message:"user ID action are required"})
     }
     const user=await User.findById(id);
     user.isBlocked=action==='block'
     await user.save()
     const status=action==='block'? 'blocked':'unblocked';
     res.status(200).json({message:`User successfully ${status}`})
}
catch(error){
    console.log(error);
    res.status(500).json({message:"internal server error"})
}
}
module.exports={customerInfo,block}