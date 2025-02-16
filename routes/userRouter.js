const express=require("express")
const router=express.Router()
const passport=require("passport")
const auth=require('../middlewares/auth')
const userController=require("../controllers/user/userController")
const singleProductController=require("../controllers/user/singleProudctController")
const myaccountController=require("../controllers/user/myaccountController")
const cartController=require('../controllers/user/cartController')
const shopController=require('../controllers/user/shopController')
const checkoutController=require('../controllers/user/checkoutController')
const orderController=require('../controllers/user/orderController')
const users=require('../models/userSchema')
const whishlistController=require('../controllers/user/wishlistController')

router.get('/pagenotfound',userController.pageNotFound)
router.get('/',userController.loadHomepage)
router.get('/login',auth.userAuth,userController.loadLoginPage)
router.get('/signup',auth.userAuth,userController.loadregisterPage)
router.post('/signup',userController.signup)
router.post('/login', userController.login)
// router.get('/otp',userController.otp)
router.get('/shop',shopController.loadShop)
router.post('/resend-Otp', userController.resendOtp);
router.get('/productdetails',singleProductController.loadSingleProduct)
// router.get('/filer',shopController.filter)


router.post("/variant",singleProductController.variant)
router.post('/otp',userController.verifyOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))

router.get('/myaccount',myaccountController.myaccount)
router.post('/update-user/:id',myaccountController.editMyaccount)
router.post('/change-password/:id',myaccountController.changePassword)
router.get('/forget-password',myaccountController.forgotPassword)
router.post('/forget-password',myaccountController.forgetEmailpassword)
router.post('/Otpemail',myaccountController.verifyOtpemail)
  
// router.get('/resetpassword',myaccountController.resetPasswordpage)
router.post('/resetpassword',myaccountController.resetPassword)

router.post('/addAddress',myaccountController.addAddress)
router.post('/editAddress',myaccountController.editAddress)

router.post("/deleteAddress",myaccountController.deleteAddress)


//cart
router.get("/cart",cartController.getCart)
router.post('/addToCart',cartController.postCart)
router.post('/cart/update-quantity',cartController.updateqty)
router.post('/cart/delete-product',cartController.deleteCartProduct)

//checkout
router.get('/checkout',checkoutController.getCheckout)
router.post('/createOrder',orderController.createOrder)
router.get("/orderConfirm/:id",orderController.renderConfirmorder)
router.post('/createOrderwallet',orderController.walletOrder)
router.post("/apply-coupon",checkoutController.applyCoupen)


//whishlist
router.get('/wishlist',whishlistController.getwishlist)
router.post('/wishlist/add',whishlistController.addWishlist);
router.post('/wishlist/remove',whishlistController.removeWishlist);


//razorpay
router.post('/createRazorpayOrder',orderController.raz)
router.post('/verifyPayment',orderController.verRaz)
router.post('/failRazorpayOrder',orderController.failRazorpayOrder)
router.post('/retryRazorpayOrder',orderController.retryRazorpayOrder)
//orderDetails
router.get('/viewOrders/:id',orderController.orderDetails)
router.post('/cancelorder',orderController.cancelOrder)
router.post('/api/submit-return',orderController.refund)
// router.get('/search',shopController.searchInfo)
router.post('/productCancel',orderController.productCancel)

router.post('/return-product',orderController.returnproduct)

//pdf
router.get('/download-pdf/:orderId',orderController.pdf)


  
  

router.get('/logout',userController.logout)
// router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
//     res.redirect('/')
// })
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/signup', 
}), async (req, res) => {
    const user = await users.findOne({googleId:req.user.googleId});
    if(user.isBlocked){
        return res.status(400).send("your account is blocked");
    }
    req.session.user = req.session.passport.user
    res.redirect('/'); 
});

module.exports=router