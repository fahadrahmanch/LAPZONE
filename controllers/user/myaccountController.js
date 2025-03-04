const User = require("../../models/userSchema");
const addressSchema = require("../../models/addressSchema");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const walletSchema = require("../../models/walletSchema");
const Cart = require("../../models/cartSchema");
const { MESSAGES, STATUS_CODES, ERROR } = require("../../utils/constants");


//edit profile

const editProfile = async (req, res) => {
  try {
    const usersId = req.params.id;
    const { name, email, phone } = req.body;

    const existemail = await User.findOne({
      email: email,
      _id: { $ne: usersId },
    });
    if (existemail) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.USER_ALREADY_EXISTS,
      });
    }
    const user = User.find({ _id: usersId });
    if (!user) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.USER_NOT_FOUND });
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
        .status(STATUS_CODES.OK)
        .json({ success: true, message: MESSAGES.EDIT_USER_SUCCESS });
    } else {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.EDIT_USER_FAILED });
    }
  } catch (error) {
    console.log(error);

    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: ERROR.INTERNAL_SERVER_ERROR });
  }
};


//render my account page

const myaccount = async (req, res) => {
  try {
    const userId = req.session.user;
    const users = await User.findById(userId);
    const addressData = await addressSchema.findOne({ userId: userId });
    const wallet = await walletSchema.findOne({ userId }).lean();
    if (!userId) {
      return res.redirect("/");
    }
    if (!wallet) {
      const newWallet = new walletSchema({ userId });
      await newWallet.save();
    }

    if (!users) {
      return res.redirect("/");
    }

    if (wallet && wallet.transactions) {
      wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    const walletPage = parseInt(req.query.walletPage) || 1;
    const walletLimit = 10;
    const walletSkip = (walletPage - 1) * walletLimit;
    const totalTransactions = wallet ? wallet.transactions.length : 0;
    const paginatedTransactions = wallet
      ? wallet.transactions.slice(walletSkip, walletSkip + walletLimit)
      : [];

    const totalWalletPages = Math.ceil(totalTransactions / walletLimit);

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const totalOrders = await Order.countDocuments({ userId });

    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalOrders / limit);

    const addresses = addressData ? addressData.address : [];
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    res.render("user/my-account", {
      users,
      addressData: addresses,
      orders,
      wallet: { ...wallet, transactions: paginatedTransactions },
      totalPages,
      currentPage: page,
      totalWalletPages,
      currentWalletPage: walletPage,
      message: req.session.user || "",
      cart: cart || { items: [] },
    });
  } catch (error) {
    console.log("Error fetching user data", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(ERROR.INTERNAL_SERVER_ERROR);
  }
};


//CHANGE PASSWORD 

const changePassword = async (req, res) => {
  try {
    let userId = req.params.id;
    const { currentpassword, newpassword } = req.body;
    let user = await User.findById(userId);
    if (!user) {
      return res.status(STATUS_CODES.UNAUTHORIZED).send(MESSAGES.USER_NOT_FOUND);
    }
    const Match = await bcrypt.compare(currentpassword, user.password);
    if (!Match) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.OLD_PASSWORD_INCORRECT });
    }
    const hashedPassword = await bcrypt.hash(newpassword, 10);
    user.password = hashedPassword;
    await user.save();
    res.json({ success: true, message: MESSAGES.PASSWORD_CHANGED_SUCCESS });
  } catch (error) {
    console.error(error);
    res.status(ERROR.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};


//ADD ADDRESS


const addAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res
        .status(STATUS_CODES.UNAUTHORIZED)
        .json({ success: false, message: MESSAGES.USER_NOT_LOGGED_IN });
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
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.ALL_FIELDS_REQUIRED });
    }

    const userData = await User.findById(userId);

    if (!userData) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: MESSAGES.USER_NOT_FOUND });
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
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: ERROR.INTERNAL_SERVER_ERROR });
  }
};


//EDIT ADDRESS


const editAddress = async (req, res) => {
  try {
    const { id, name, streetaddress, landmark, city, state, pincode, phone } =
      req.body;
    const findAddress = await addressSchema.findOne({ "address._id": id });
    if (!findAddress) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.USER_NOT_LOGGED_IN });
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

    return res.status(STATUS_CODES.OK).json({ address: newAddress });
  } catch (error) {
    console.log(error);
  }
};


// DELETE ADDRESS


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
      res.status(STATUS_CODES.OK).json({ deletedAddressId: addressId });
    } else {
      res.status(STATUS_CODES.NOT_FOUND).json({ message: MESSAGES.ADDRESS_NOT_FOUND });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: ERROR.INTERNAL_SERVER_ERROR });
  }
};


// FORGOT PASSWORD PAGE RENDER

const forgotPassword = async (req, res) => {
  try {
    req.session.user = null;
    const errorMessage = req.session.error;
    req.session.error = null;
    res.render("user/forgot-password",{message: errorMessage});
  } catch (error) {
    res.redirect("user/pageNotFound");
  }
};


// FORGET PASSWORD

const forgetEmailpassword = async (req, res) => {
  const { email } = req.body;
  req.session.userData=req.body
  const findemail = await User.findOne({ email: email });
  if (!findemail) {
    req.session.error='email not found'
    return res.redirect('/password/forgot')
  }
  const otp = generateOtp();
  console.log(otp);

  const verifyemail = sendVerificationEmailpassword(email, otp);
  if (!verifyemail) {
    return res.json(MESSAGES.EMAIL_ERROR);
  }
  req.session.otp = otp;
  req.session.email = email;
  res.render("user/forget-otp", { messag: req.session.user });
};
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
async function sendVerificationEmailpassword(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });
    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `<b>Your OTP ${otp}</b>`,
      html: `<b>Your OTP ${otp}</b>`,
    });
    return info.accepted.length > 0;
  } catch (error) {
    console.log("Error sending email", error);
    return false;
  }
}


// OTP VERIFIED for forget password

const verifyOtpemail = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log("inputotp",otp)
    console.log("req.session.otp",req.session.otp)
    if (otp === req.session.otp) {
      return res.render("user/changepassword", {
        success: true,
        message: MESSAGES.OTP_VERIFIED_SUCCESS,
      });
    } else {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.INVALID_OTP,
      });
    }
  } catch (error) {
    console.error("Error verifying OTP", error);
    res.status(ERROR.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};


//RESET PASSWORD

const resetPassword = async (req, res) => {
  try {
    let findemail = await User.findOne({ email: req.session.email });

    const { newpassword } = req.body;

    if (!findemail) {
      return res.status(STATUS_CODES.NOT_FOUND).send(MESSAGES.USER_NOT_FOUND);
    }

    const hashedPassword = await bcrypt.hash(newpassword, 10);
    findemail.password = hashedPassword;
    await findemail.save();
    return res.json({
      success: true,
      message: MESSAGES.PASSWORD_CHANGED_SUCCESS,
    });
  } catch (error) {
    console.error(error);
    res.status(ERROR.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

module.exports = {
  myaccount,
  editProfile,
  changePassword,
  addAddress,
  deleteAddress,
  editAddress,
  forgotPassword,
  forgetEmailpassword,
  verifyOtpemail,
  resetPassword,
};
