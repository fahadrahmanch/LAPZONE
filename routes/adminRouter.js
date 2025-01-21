const express=require("express");
const router=express.Router()
const upload = require('../helpers/multer')
const auth=require('../middlewares/auth')
const adminController=require('../controllers/admin/adminController')
const categoriesController=require('../controllers/admin/categoriesController')
const customerController=require("../controllers/admin/customerController")
const productController=require('../controllers/admin/productController')
const orderController=require('../controllers/admin/orderController')
const coupenController=require('../controllers/admin/coupenController')
router.get('/login',auth.isLogin,adminController.loadlogin)
router.post('/login',adminController.login)
router.get('/logout',adminController.isLogout)
router.get('/dashboard',auth.checkSession,adminController.dashboard)

router.get('/users',auth.checkSession,customerController.customerInfo)
router.get('/search',auth.checkSession,customerController.customerInfo)

router.post('/blockCustomer',customerController.block)

router.get('/categories',auth.checkSession,categoriesController.CategoryInfo)
router.post('/addCategory',categoriesController.addCategory)
router.post('/listed',categoriesController.list)

router.get('/editCategory',auth.checkSession,categoriesController.editcategory)
router.post('/editCategory/:id',categoriesController.postcategory)
router.get('/searchCategory',auth.checkSession,categoriesController.categorySearch)


router.get('/products',auth.checkSession,productController.productpage)
router.get('/addProducts',auth.checkSession,productController.getPrductAddPage)
// router.post('/addProducts',productController.addProducts)
router.post('/addProducts', upload.array('images', 10),productController.addProducts)
router.get('/editProduct',auth.checkSession,productController.getEditProduct)
router.post('/editProduct/:id',auth.checkSession,upload.array("images",4),productController.editProduct)
router.post('/deleteImage',auth.checkSession,productController.deleteSingleImage)
router.get('/searchProducts',auth.checkSession,productController.productsInfo)
router.post('/listedProducts',productController.listed)

router.get("/orders",auth.checkSession,orderController.orderInfo)


router.get('/orderdetails/:id',auth.checkSession,orderController.orderDetails)

router.post('/updateorderstatus',orderController.updateOrderstatus)

//coupen
router.get('/coupen',coupenController.getcoupen)
router.get('/addCoupen',coupenController.addCoupen)
// router.get('/editCoupen',coupenController.editCoupen)

router.post('/addCoupen',coupenController.addCoupenPost)
router.post('/list/:name',coupenController.islist)


router.post('/approve/:id',orderController.returnProduct)
router.post('/addproductOffer',productController.addOffer)
module.exports=router;