const Category = require('../../models/categorySchema');
const categorySchema=require('../../models/categorySchema')
const CategoryInfo = async(req,res)=>{
    try{
    const page=parseInt(req.query.page)||1;
    const limit=4;
    const skip=(page-1)*limit

    const categoryData=await categorySchema.find({})
    .sort({createdAt:-1})
    .skip(skip)
    .limit(limit);
    const totalCategories=await categorySchema.countDocuments();
    const totalPages=Math.ceil(totalCategories/limit)
     res.render('admin/categories',{
        cat:categoryData,
        currentPage:page,
        totalPages:totalPages,
        totalCategories:totalCategories,


     })
    }
    catch(error){
    console.log(error)
    res.redirect()
    } 
}
const addCategory=async(req,res)=>{
    const {name,description}=req.body;
    console.log(name,description)
    try{
    const existingCategory=await categorySchema.findOne({name});
    if(existingCategory){
       return res.status(400).json({error:"Category already exists"})
    }
    const newCategory= new categorySchema({
        name,
        description,
    })
    await newCategory.save()
    return res.status(200).json({message:"Category added successfully"})
    }
    catch(error){
       
    return res.status(500).json({error:"Internal server error"})
    }
}
const loadaddCategory = async(req,res)=>{
    try{
      res.render('admin/addCategory')
    }
    catch(error){
        console.log('error')
    }
}
const list=async(req,res)=>{
    console.log("server")
    try{
      const{userId,action}=req.body;
     console.log(req.body)
      if(!userId||!action){
       
        return res.status(400).json({messege:'user Id action are required'})
      }
      const category=await categorySchema.findById(userId);
      console.log(category)
         if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
     category.isListed=action==='unlist'
      await category.save()
      const status=action==='list'? 'unlist':'list';
    console.log(status)
      res.status(200).json({message:`category successfully ${status}`,status})
    //   return res.status(200).json({message:"successfully"})
    }
    catch(error){
        console.log(error);
        res.status(500).json({message:"internal server error"})
    }
}
const editcategory= async(req,res)=>{
    const id =req.query.id;
    const category=await categorySchema.findOne({_id: id})
    res.render('admin/editCategories',{category})

}

const postcategory=async(req,res)=>{
    try{
    const id =req.params.id;

    const {name,description}=req.body;
    const existingCategory=await categorySchema.findOne({name:name})
    if(existingCategory){
        return res.status(400).json({error:"Category exists,please choose another name"})
    }
    const updateCategory=await categorySchema.findByIdAndUpdate(id,{
        name:name,
        description:description,
    },{new:true})
    if(updateCategory){
    res.redirect('/admin/categories')
    }else{
    res.status(404).json({error:"Category not found"})
    }
    console.log(name,description)
}
catch(error){
    res.status(500).json({error:"Internal server error"})
}

}
const categorySearch=async(req,res)=>{
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
    const cat=await categorySchema.find({
        
        $or:[{name:{$regex:".*"+search+".*"}},
            
        ],
    })
    .limit(limit*1)
    .skip((page-1)*limit)
    .exec();
    
  
    const count=await categorySchema.find({
       
        $or:[{name:{$regex:".*"+search+".*"}},
            
        ],
    }).countDocuments();
    const totalPages = Math.ceil(count / limit);
    const currentPage=page
    res.render('admin/categories',{cat,totalPages,currentPage})
    }
    catch(error){
  
    }
  }
module.exports={CategoryInfo,categorySchema,addCategory,loadaddCategory,list,editcategory, postcategory,categorySearch}