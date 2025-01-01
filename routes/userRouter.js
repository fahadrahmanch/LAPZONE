const express=require("express")
const router=express.Router()
const passport=require("passport")
const auth=require('../middlewares/auth')
const userController=require("../controllers/user/userController")
const singleProductController=require("../controllers/user/singleProudctController")
const myaccountController=require("../controllers/user/myaccountController")
router.get('/pagenotfound',userController.pageNotFound)
router.get('/',userController.loadHomepage)
router.get('/login',auth.userAuth,userController.loadLoginPage)
router.get('/signup',auth.userAuth,userController.loadregisterPage)
router.post('/signup',userController.signup)
router.post('/login', userController.login)
// router.get('/otp',userController.otp)
router.get('/shop',userController.loadShop)
router.post('/resend-Otp', userController.resendOtp);
router.get('/productdetails',singleProductController.loadSingleProduct)
router.post('/otp',userController.verifyOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))

router.get('/myaccount',myaccountController.myaccount)
router.post('/update-user/:id',myaccountController.editMyaccount)
router.post('/change-password/:id',myaccountController.changePassword)
router.get('/forget-password',myaccountController.forgotPassword)
router.post('/forget-password',myaccountController.forgetEmailpassword)
router.post('/Otpemail',myaccountController.verifyOtpemail)

router.post('/addAddress',myaccountController.addAddress)
router.post('/editAddress',myaccountController.editAddress)

router.post("/deleteAddress",myaccountController.deleteAddress)







router.get('/logout',userController.logout)
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
})
module.exports=router