
const userSchema=require('../../models/userSchema');
const bcrypt=require('bcrypt');
const dashboard=async(req,res)=>{
    try{
       await res.render('admin/index.ejs')
    }
    catch(error){
        console.log(error)
    }
}


const loadlogin=async(req,res)=>{
    try{
        const message = req.session.error || null; 
        req.session.error = null; 
        await res.render('admin/adminlogin',{message})
       
        
    }
    catch(error){
        console.log(error)
    }
}
const login=async(req,res)=>{
    try{
     const {email,password}=req.body
    
     const admin =await userSchema.findOne({email,isAdmin:true});

     req.session.error='Invalid credentials'
     console.log(req.session.error)
     if(!admin) return res.redirect('/admin/login');
     const isMatch= await bcrypt.compare(password,admin.password);
     if(!isMatch) return res.redirect('/admin/login');
     req.session.error=''
     req.session.admin=true;
     res.redirect('/admin/dashboard');
    }
    catch(error){
    console.log(error)
    }
}
const isLogout = async(req,res)=>{
    req.session.admin=false;
    res.redirect('/admin/login');
}

module.exports = {dashboard,loadlogin,login ,isLogout}