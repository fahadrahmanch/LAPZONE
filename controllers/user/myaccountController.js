const User = require("../../models/userSchema");
const addressSchema = require("../../models/addressSchema");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const product = require("../../models/productSchema");

const editMyaccount = async (req, res) => {
  console.log("hi");
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
      return res
        .status(400)
        .json({
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
      console.log("updateuser");
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
    // console.log(addressData)
    // console.log(addressData)
    if (!users) {
      return res.status(404).send("User not found");
    }
    // const message = req.session.err;
    //  req.session.err=null
    const addresses = addressData ? addressData.address : [];
    res.render("user/my-account", { users: users, addressData: addresses });
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
    res
      .status(500)
      .json({
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
  try {
    const { id, name, streetaddress, landmark, city, state, pincode, phone } =
      req.body;
    console.log(id);
    const findAddress = await addressSchema.findOne({ "address._id": id });
    console.log(findAddress);
    if (!findAddress) {
      return res.status(400).json({ message: "user is not exists" });
    }
    await addressSchema.updateOne(
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
    // const Address = await addressSchema.find({ "address._id": id });
    
    return res.status(400).json({ message: "Address add successfully" });
  } catch (error) {
    console.log(error);
  }
};


const deleteAddress= async (req,res)=>{
try{
 const deleteAddressId=req.body;
 console.log("hi")
 console.log(deleteAddressId)
  const deleteaddress=await addressSchema.findByIdAndDelete(deleteAddressId)
  console.log(deleteaddress)
}
catch(error){

}
}

module.exports = {
  myaccount,
  editMyaccount,
  changePassword,
  addAddress,
  deleteAddress,
  editAddress,
};
