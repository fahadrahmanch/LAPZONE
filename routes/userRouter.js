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

router.get('/404',userController.pageNotFound)

router.get('/',auth.userBLock,userController.loadHomepage)
router.get('/login',auth.userAuth,userController.loadLoginPage)
router.get('/signup',auth.userAuth,userController.loadregisterPage)
router.post('/signup',userController.signup)
router.post('/login', userController.login)

router.get('/shop',auth.userBLock,shopController.loadShop)
router.post('/resend-otp', userController.resendOtp);
 router.get('/shop/product',auth.userBLock,singleProductController.loadSingleProduct)


router.post('/otp',userController.verifyOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))

router.get('/account',auth.userBLock,myaccountController.myaccount)
router.post('/account/update-user/:id',myaccountController.editProfile)
router.post('/account/password/change/:id',myaccountController.changePassword)
router.get('/password/forgot',auth.userBLock,myaccountController.forgotPassword)
router.post('/password/forgot',myaccountController.forgetEmailpassword)
router.post('/password/otp/verify',myaccountController.verifyOtpemail)
  
router.post('/password/reset',myaccountController.resetPassword)

router.post('/address/add',myaccountController.addAddress)
router.post('/address/edit',myaccountController.editAddress)

router.post("/address/delete",myaccountController.deleteAddress)


//cart
router.get("/cart",auth.userBLock,cartController.getCart)
router.post('/cart/add',cartController.addCart)
router.post('/cart/quantity/update',cartController.updateCartqty)
router.post('/cart/product/delete',cartController.deleteCartProduct)

//checkout
router.get('/checkout',auth.userBLock,checkoutController.getCheckout)
router.post('/order/create',orderController.createOrder)
router.get("/order/confirm/:id",auth.userBLock,orderController.renderConfirmorder)
router.post('/order/wallet/create',orderController.walletOrder)
router.post("/apply-coupon",checkoutController.applyCoupen)


//whishlist
router.get('/wishlist',auth.userBLock,whishlistController.getwishlist)
router.post('/wishlist/add',whishlistController.addWishlist);
router.post('/wishlist/remove',whishlistController.removeWishlist);


//razorpay
router.post('/createRazorpayOrder',orderController.raz)
router.post('/verifyPayment',orderController.verifyRazorpay)
router.post('/failRazorpayOrder',orderController.failRazorpayOrder)
router.post('/retryRazorpayOrder',orderController.retryRazorpayOrder)
//orderDetails
router.get('/viewOrders/:id',auth.userBLock,orderController.orderDetails)
router.post('/cancelorder',orderController.cancelOrder)
router.post('/api/submit-return',orderController.refund)
// router.get('/search',shopController.searchInfo)
router.post('/productCancel',orderController.productCancel)

router.post('/return-product',orderController.returnproduct)

//pdf
router.get('/download-pdf/:orderId',orderController.pdf)


  
  

router.get('/logout',userController.logout)

router.get('/about',userController.aboutPage)
router.get('/contact',userController.contactPage)

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









