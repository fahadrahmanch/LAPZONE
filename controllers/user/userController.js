const User = require("../../models/userSchema");
const addressSchema = require("../../models/addressSchema");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const product = require("../../models/productSchema");
const categorySchema = require("../../models/categorySchema");
const walletSchema = require("../../models/walletSchema");
const Cart = require("../../models/cartSchema");
const wishlistSchema = require("../../models/walletSchema");
const { STATUS_CODES, MESSAGES } = require("../../utils/constants");

//load pagenot found page

const pageNotFound = async (req, res) => {
  try {
    await res.render("user/pageNotFound");
  } catch (error) {
    res.redirect("/user/pageNotFound");
  }
};

//LOAD HOME PAGE

const loadHomepage = async (req, res) => {
  try {
    const userId = req.session.user || null;
    const products = await product.find({ isListed: true }).populate('category');
    const productWithoffer = products.map((product) => {
      const productOffer = product.productOffer || 0;
      const categoryOffer = product.category?.categoryOffer || 0;
      const bestOffer = Math.max(productOffer, categoryOffer);

      let finalProduct = {
        ...product.toObject(),
        bestOffer,
        offerType:
          bestOffer === productOffer ? "Product Offer" : "Category Offer",
      };

      if (bestOffer > 0) {
        for (let i = 0; i < product.variants.length; i++) {
          const offerPrice =
            product.variants[i].salePrice -
            product.variants[i].salePrice * (bestOffer / 100);
          finalProduct.variants[i].salePrice = offerPrice;
        }
      }
      return finalProduct;
    });
    let cart = null;
    if (userId) {
      cart = await Cart.findOne({ userId }).populate("items.productId");
    }
    await res.render("user/home", {
      message: req.session.user,
      products: productWithoffer,
      cart: cart || { items: [] },
    });
  } catch (error) {
    console.log(error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .send(MESSAGES.INTERNAL_SERVER_ERROR);
  }
};

//login page render

const loadLoginPage = async (req, res) => {
  try {
    let message = req.session.error || null;
    req.session.error = null;
    await res.render("user/login", { message });
  } catch (error) {
    console.log(error);
  }
};

//load signup page

const loadregisterPage = async (req, res) => {
  try {
    const { code } = req.query || "";
    req.session.code = code;
    // console.log(code);
    const msg = req.session.err || null;
    console.log(msg)
    req.session.err = null;
    return res.render("user/register", { msg });
  } catch (error) {
    console.log(error);
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWOR_D,
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

// POST SIGN UP

const signup = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    const findUser = await User.findOne({ email });
    if (findUser) {
      req.session.err='user already exists with this email'
      return res.redirect("/signup");
    }
    console.log(req.session.userOtp);
    let otp;
    if (!req.session.userOtp) {
      otp = generateOtp();
      req.session.userOtp = otp;
      console.log("Generated OTP:", otp);
    } else {
      otp = req.session.userOtp;
      console.log("Using existing OTP:", otp);
    }

    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
      req.session.err = "email-error";
      return res.redirect("/signup");
    }
    req.session.userOtp = otp;
    req.session.userData = { name, phone, email, password };
    res.render("user/otp");
  } catch (error) {
    console.error("signup error", error);
    res.redirect("/pagenotfound");
  }
};

//OTP PAGE RENDER

const otp = async (req, res) => {
  try {
    await res.render("user/otp", { message: req.session.user });
  } catch (error) {
    console.log(error);
  }
};
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error);
  }
};

//OTP PASTE

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password);
      const saveUserData = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
      });
      await saveUserData.save();

      req.session.user = saveUserData._id;
      if (req.session.code) {
        const user = await User.findOne({
          referralOfferCode: req.session.code,
        }).lean();
        const userId = user._id;
        const Wallet = await walletSchema.findOne({ userId });
        if (!Wallet) {
          const newWallet = new walletSchema({
            userId,
            totalBalance: 100,
            transactions: [
              {
                type: "Referal",
                amount: 100,
              },
            ],
          });
          await newWallet.save();
        } else {
          Wallet.totalBalance += 100;
          Wallet.transactions.push({
            type: "Referal",
            amount: 100,
            date: new Date(),
          });
          await Wallet.save();
        }

        const newUser = await User.findOne({
          _id: req.session.user.toString(),
        });
        if (newUser) {
          const Wallet = await walletSchema.findOne({
            userId: req.session.user.toString(),
          });
          if (!Wallet) {
            const newWallet = new walletSchema({
              userId: req.session.user,
              totalBalance: 25,
              transactions: [
                {
                  type: "Referal",
                  amount: 25,
                },
              ],
            });
            await newWallet.save();
          } else {
            Wallet.totalBalance += 25;
            Wallet.transactions.push({
              type: "Referal",
              amount: 25,
              date: new Date(),
            });
            await Wallet.save();
          }
        }
      }

      return res.json({ success: true, redirectUrl: "/" });
    } else {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.INVALID_OTP });
    }
  } catch (error) {
    console.log("Error verufying OTP", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.SOMETHING_WENT_WRONG });
  }
};

//RESENT OTP

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;

    if (!req.session.userData || req.session.userData.email != email) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.INVALID_REQUEST });
    }
    const otp = generateOtp();
    console.log("resend", otp);
    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res
        .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: MESSAGES.EMAIL_SEND_ERROR });
    }
    
    req.session.otp=otp // this is for my forgot password otp
    req.session.userOtp = otp; 
    return res.json({ success: true, message: MESSAGES.OTP_SENT_SUCCESS });
  } catch (error) {
    console.log("error",error)
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// POST LOGIN PAGE

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    req.session.error = "";
    const user = await User.findOne({ email });
    if (!user) {
      req.session.error = "user does not exist";
      return res.redirect("/login");
    }
    if (user.isBlocked === true) {
      req.session.error = "user is blocked";
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      req.session.error = "Incorrect password";
      return res.redirect("/login");
    }
    req.session.error = "";
    req.session.user = user._id;

    return res.redirect("/");
  } catch (error) {
    console.log(error);
  }
};

//LOGOUT

const logout = async (req, res) => {
  req.session.user = false;
  res.redirect("/");
};

const aboutPage=('/about',async(req,res)=>{
  try{
    const userId = req.session.user || null;
    let cart = null;
    if (userId) {
      cart = await Cart.findOne({ userId }).populate("items.productId");
    }
  res.render('user/about',{
    message: req.session.user||"",
    cart: cart || { items: [] },
  })
  }
  catch(error){
      console.log(error)
  }
})
const contactPage=('/about',async(req,res)=>{
  try{
    const userId = req.session.user || null;
    let cart = null;
    if (userId) {
      cart = await Cart.findOne({ userId }).populate("items.productId");
    }
  res.render('user/contact',{
    message: req.session.user||"",
    cart: cart || { items: [] },
  })
  }
  catch(error){
      console.log(error)
  }
})

module.exports = {
  loadHomepage,
  pageNotFound,
  loadLoginPage,
  loadregisterPage,
  signup,
  login,
  otp,
  verifyOtp,
  resendOtp,
  logout,
  aboutPage,
  contactPage
};
