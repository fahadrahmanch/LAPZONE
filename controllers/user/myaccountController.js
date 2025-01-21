const User = require("../../models/userSchema");
const addressSchema = require("../../models/addressSchema");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const product = require("../../models/productSchema");
const Order=require('../../models/orderSchema')
const walletSchema=require("../../models/walletSchema")
const editMyaccount = async (req, res) => {
 
  try {
    const usersId = req.params.id;
    console.log(usersId);
    const { name, email, phone } = req.body;
    console.log(name, email, phone);

    const existemail = await User.findOne({
      email: email,
      _id: { $ne: usersId },
    });
    console.log(existemail);
    if (existemail) {
      return res.status(400).json({
        success: false,
        message: "user already exists with this email",
      });
    }
    const user = User.find({ _id: usersId });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "user not found" });
    }
    const updateUser = await User.findByIdAndUpdate(
      usersId,
      {
        name: name,
        email: email,
        phone: phone,
      },
      { new: true }
    );
    if (updateUser) {
      
      res
        .status(200)
        .json({ success: true, message: "edit user successfully" });
      // res.redirect('/myaccount')
    } else {
      return res
        .status(400)
        .json({ success: false, message: "edit user is failed" });
    }
  } catch (error) {
    console.log(error);

    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
const myaccount = async (req, res) => {
  try {
    const userId = req.session.user;
    const users = await User.findById(userId);
    const addressData = await addressSchema.findOne({ userId: userId });
    const wallet= await walletSchema.findOne({userId})
    if(!wallet){
      const newWallet= new walletSchema({userId })
      await newWallet.save()
    }
    console.log("wallet",wallet)
    if (!users) {
       return res.redirect('/')
    }
   
    
    const orders= await Order.find({userId});
    // console.log(orders)



    const addresses = addressData ? addressData.address : [];
    res.render("user/my-account", { users: users, addressData: addresses ,orders,wallet:wallet,message:req.session.user||""});
  } catch (error) {
    console.log("error fetching user data", error);
    res.status(500).send("Internal Server Error");
  }
};

const changePassword = async (req, res) => {
  try {
    let userId = req.params.id;
    console.log(userId);
    const { currentpassword, newpassword } = req.body;
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }
    const Match = await bcrypt.compare(currentpassword, user.password);
    console.log(Match);
    if (!Match) {
      return res
        .status(400)
        .json({ success: false, message: "old password is incorrect" });
    }
    const hashedPassword = await bcrypt.hash(newpassword, 10);
    user.password = hashedPassword;
    await user.save();
    res.json({ success: true, message: "Password changed successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

const addAddress = async (req, res) => {
  
  try {
    const userId = req.session.user;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not logged in" });
    }

    const { name, city, landmark, state, pincode, phone, streetaddress } =
      req.body;

    if (
      !name ||
      !city ||
      !landmark ||
      !state ||
      !pincode ||
      !phone ||
      !streetaddress
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const userData = await User.findById(userId);

    if (!userData) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const userAddress = await addressSchema.findOne({ userId });
    const addressData = {
      name,
      city,
      landmark,
      state,
      pincode,
      phone,
      streetaddress,
    };

    if (!userAddress) {
      const newAddress = new addressSchema({
        userId,
        address: [addressData],
      });
      await newAddress.save();
    } else {
      userAddress.address.push(addressData);
      await userAddress.save();
    }

    return res.status(200).json({ success: true, addressData });
  } catch (error) {
    console.error("Error adding address:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const editAddress = async (req, res) => {
  console.log("sfjhjs")
  try {
    const { id, name, streetaddress, landmark, city, state, pincode, phone } =
      req.body;
    console.log(id);
    const findAddress = await addressSchema.findOne({ "address._id": id });
    console.log(findAddress);
    if (!findAddress) {
      return res.status(400).json({ message: "user is not exists" });
    }
    const newAddress = await addressSchema.updateOne(
      { "address._id": id },
      {
        $set: {
          "address.$": {
            _id: id,
            streetaddress: streetaddress,
            name: name,
            city: city,
            landmark: landmark,
            state: state,
            pincode: pincode,
            phone: phone,
          },
        },
      }
    );

    return res.status(200).json({ address: newAddress });
  } catch (error) {
    console.log(error);
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.body;
    const userId = req.session.user;

    const deleteAddress = await addressSchema.findOneAndUpdate(
      { userId },
      { $pull: { address: { _id: addressId } } },
      { new: true }
    );

    if (deleteAddress) {
      res.status(200).json({ deletedAddressId: addressId });
    } else {
      res.status(404).json({ message: "Address not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    res.render("user/forgot-password");
  } catch (error) {
    res.redirect("user/pageNotFound");
  }
};
const forgetEmailpassword=async(req,res)=>{
  const {email}=req.body;
  console.log(email)
  const findemail=await User.findOne({email:email});
  if(!findemail){
    return res.status(400).json("email not found")
  }
  const otp =generateOtp()
  console.log(otp)
  
 const verifyemail=sendVerificationEmailpassword(email,otp)
 if(!verifyemail){
  return res.json("email-error") ;
 } 
 req.session.otp=otp;
 req.session.email=email
 res.render('user/forget-otp')
}
function generateOtp(){
  return Math.floor(100000+Math.random()*900000).toString();
}
async function sendVerificationEmailpassword(email,otp){
  console.log(email,"inverify")
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
const verifyOtpemail = async (req, res) => {
  try {
    const { otp } = req.body;

    if (otp === req.session.otp) {
      // Redirect to the change password page
      // return res.status(200).json({ redirectUrl: "/resetpassword" });
      return res.render("user/changepassword", {
        success: true,
        message: "OTP verified successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again."
      });
    }
  } catch (error) {
    console.error("Error verifying OTP", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while verifying OTP"
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    let findemail = await User.findOne({email:req.session.email})
    
    console.log("hii")
    console.log(findemail);
    const {  newpassword } = req.body;
    console.log(req.body)
   
    if (!findemail) {
      return res.status(404).send("User not found");
    }
 
    const hashedPassword = await bcrypt.hash(newpassword, 10);
    findemail.password = hashedPassword;
    await findemail.save();
    return res.json({ success: true, message: "Password changed successfully!"});
    // return res.redirect('/')
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};


module.exports = {
  myaccount,
  editMyaccount,
  changePassword,
  addAddress,
  deleteAddress,
  editAddress,
  forgotPassword,
  forgetEmailpassword,
  verifyOtpemail,
  resetPassword ,
 
};
