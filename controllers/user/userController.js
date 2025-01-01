const User=require("../../models/userSchema")
const addressSchema=require('../../models/addressSchema')
const bcrypt=require('bcrypt')
const env=require("dotenv").config()
const nodemailer =require("nodemailer")
const product=require('../../models/productSchema')

const pageNotFound=async (req,res)=>{
    try{
      await res.render("user/pageNotFound")
    }
    catch(error){
     res.redirect("/user/pageNotFound")
    }
}
const loadHomepage=async(req,res)=>{
    try{
      const products= await product.find({})
    await res.render("user/home",{message:req.session.user,products:products})
    }
    catch(error){
       console.log("home page not found");
       res.status(500).send("server error")
    }
}
const loadLoginPage=async(req,res)=>{
  try{
    let message = req.session.error || null; 
    req.session.error = null; 
    await res.render("user/login",{message})
  }
  catch(error){
    console.log("login page not found")
  }
}
const loadregisterPage=async(req,res)=>{
  try{
    const message = req.session.err || null; 
     req.session.err = null; 
     return  res.render("user/register",{message})
  }
  catch(error){
    console.log("signup page not found")
  }
}

function generateOtp(){
  return Math.floor(10000+Math.random()*900000).toString();
}
async function sendVerificationEmail(email,otp){
  try{
    const transporter=nodemailer.createTransport({
      service:"gmail",
      port:587,
      secure:false,
      requireTLS:true,
      auth:{
        user:process.env.NODEMAILER_EMAIL,
        pass:process.env.NODEMAILER_PASSWORD
      }
    })
    const info =await transporter.sendMail({
      from:process.env.NODEMAILER_EMAIL,
      to:email,
      subject:"Verify your account",
      text:`<b>Your OTP ${otp}</b>`,
      html:`<b>Your OTP ${otp}</b>`      
    })
   console.log(info.accepted.length,"inf0")
    return info.accepted.length>0
  }catch(error){
    console.log("Error sending email",error)
    return false
  }
}
const signup = async(req,res)=>{
  try{ 
   const {name,phone,email,password}=req.body;
   const findUser=await User.findOne({email})
     if(findUser){
       req.session.err="User already exists"
       return res.redirect('/signup')
     }
     const otp=generateOtp();
     console.log(otp)
     const emailSent = await sendVerificationEmail(email,otp)
    
     if(!emailSent){
      return res.json("email-error") ;
     } 
     req.session.userOtp=otp;
     req.session.userData={name,phone,email,password}
      res.render("user/otp")
     
  }
    
  catch(error){
    console.error("signup error",error);
    res.redirect("/pagenotfound")
  }
}
const otp = async(req,res)=>{
  try{
   await res.render('user/otp')
  }
  catch(error){

  }
}
const securePassword=async(password)=>{
  try{
     const passwordHash=await bcrypt.hash(password,10);
     return passwordHash
  }
  catch(error){
     
  }
}
const verifyOtp=async(req,res)=>{
  try{
    const {otp}=req.body;
    if(otp===req.session.userOtp){
      const user=req.session.userData
      const passwordHash=await securePassword(user.password);
      const saveUserData=new User({
        name:user.name,
        email:user.email,
        phone:user.phone,
        password:passwordHash
      })
      
      await saveUserData.save();
      req.session.user=saveUserData._id
    
      // return res.redirect("/login")
      return res.json({success:true,redirectUrl: '/' })
    }else{
      console.log("hi")
      return res.status(400).json({success:false,message:"Invalid OTP,Please try again"})
    }
  }catch(error){
     console.log("Error verufying OTP",error);
     res.status(500).json({success:false,message:"An orror occured"})

  }
}
const resendOtp=async(req,res)=>{
  try{
    
     const {email}=req.session.userData;
     
     if(!req.session.userData||req.session.userData.email!=email){
      return res.status(400).json({success:false,message:"Invalid request"})
     }
     const otp=generateOtp();
     console.log("resend",otp)
     const emailSent=sendVerificationEmail(email,otp)
     if(!emailSent){
      return res.status(500).json({success:false,message:"Error email sending"})
     }
     req.session.userOtp=otp;
     return res.json({ success: true, message:"Otp send successfull" });
  }
  catch(error){
    res.status(500).json({success:false,message:"Internal server error"})
  }
}
const login=async(req,res)=>{
  try{
    
    const {email,password}=req.body;
    req.session.error=''
    const user=await User.findOne({email});
    
    if(!user){
      req.session.error="user does not exist";
       return res.redirect("/login")
    } 
   
    const isMatch = await bcrypt.compare(password,user.password);
   
   
    if(!isMatch){
      req.session.error="Incorrect password";
      return res.redirect('/login')
    } 
    req.session.error=''
    req.session.user=user._id

    return res.redirect('/')
    
  }
  catch(error){
    
  }
}
const loadShop=async(req,res)=>{
  try{
    res.render('user/Shop')
  }
  catch(error){
    console.log(error)
  }
}




const logout = async(req,res)=>{
  req.session.user=false;
  res.redirect('/');
}



module.exports={loadHomepage,
  pageNotFound,loadLoginPage,
  loadregisterPage,
  signup,
  login,
  otp,
  loadShop,
  verifyOtp,
  resendOtp,
  
  logout,
  
}