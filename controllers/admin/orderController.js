const Order=require("../../models/orderSchema");
const Product=require("../../models/productSchema")
const walletSchema=require("../../models/walletSchema");
const { walletOrder } = require("../user/orderController");


const orderInfo = async (req, res) => {
    try {
      
        const page = parseInt(req.query.page) || 1;
        const limit =  10;
        const skip = (page - 1) * limit;

       
        const order = await Order.find()
            .populate("userId", "name email")
            .sort({ createdAt: -1 }) 
            .skip(skip) 
            .limit(limit);

            console.log(order)
      
        const totalOrders = await Order.countDocuments();

     
        const totalPages = Math.ceil(totalOrders / limit);

        
        res.render("admin/orders", {
            order,
            currentPage: page,
            totalPages,
            limit
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).render("error", { message: "Failed to load orders" });
    }
};

module.exports = { orderInfo };

const orderDetails=async(req,res)=>{
    try{
    const id =req.params.id;
    console.log(id)
    const userId=req.session.id;
     const details = await Order.findById({_id:id})
     .populate({
        path:'userId',
        model:"User"
     }).populate({path:'orderedItems.Product',model:'Product'})
    
    //  console.log("heloooo",details)
     res.render('admin/orderDetails',{details})
    }
    catch(error){
          console.log(error)
    }
}
const Variants = []; 
const updateOrderstatus=async(req,res)=>{
    console.log("workdsss")
    
    try{
     const {status,orderId}=req.body;
      
     console.log(orderId,status)
     let order= await Order.findOne({orderId});
     if(!order){
        return res.status(400).json({success:false,message:"order not found"})
     }
     console.log("ordered",order)
     if(order.status=='Delivered'||order.status=='Cancelled'||order.status==='Returned'||order.status==='Rejected'){
        
      
        return res.status(401).json({
            success: false,
            message: `The order status cannot be changed because it is already "${order.status}".`
        });

    }
    order.status=status;

    for (let i = 0; i < order.orderedItems.length; i++) {
      let item = order.orderedItems[i]; 
      for (let key in item) {
        if(key=="status"&&item[key]!="Cancelled"){
          item[key]=status
        }
          

      }
  }
    if(order.status=='Cancelled'){
      for(let item of order.orderedItems){
        const product = await Product.findOne({
          variants: { $elemMatch: { _id: item.variants } },
        });
        const variant = product.variants.find((variant)=>variant._id.toString() === item.variants.toString())
        console.log("orderd", variant)
        console.log("products",product)
        if(variant){
          
          Variants.push(variant); 
          const quantityToIncrease = item.quantity; 
          variant.stock += quantityToIncrease;
        }
      }
      for (const item of Variants) {
        await Product.updateOne(
            { "variants._id": item._id },
            { $set: { "variants.$.stock": item.stock } }
        );
    }
    
    }
    await order.save()
    return res.status(200).json({
        success: true,
        message: `The order status changed successfully `
    });
   

    }
    catch(error){
    console.log(error)
    }
}

const returnProduct=async(req,res)=>{
  try{
 const orderId=req.params.id

const order=await Order.findOne({orderId})
const userId=order.userId

 order.returnRequest.status='Approved';
 order.status='Returned';
for (let item of order.orderedItems) {
  console.log("item", item);
  
  if (typeof item == "object") {
    for (let k in item) {
      if (k == "status"&&item[k]!=='Cancelled') {
        item.status = "Returned"; 
        const product = await Product.findById(item.Product);
if (product) {
  let variant = product.variants.id(item.variants); 
  console.log('variant',variant)
  if (variant) {
    variant.stock += item.quantity; 
  }
  await product.save(); 
}
        console.log(item)
      }
    }
  }
}


 console.log("order",order)
 const Wallet=await walletSchema.findOne({userId});
      console.log("wallet",Wallet)
      if(!Wallet){
      const newWallet= new walletSchema({
        userId,
        totalBalance:order.finalAmount,
        transactions:[{
          type:'Refund',
          amount:order.finalAmount,
          orderId:order.orderId,
          // description:
        }]
      })
      // console.log("newWalllet",Wallet)
      await newWallet.save()
      }else{
        Wallet.totalBalance += order.finalAmount;
                Wallet.transactions.push({
                    type: 'Refund',
                    amount: order.finalAmount,
                    orderId:order.orderId,
                      date: new Date()
                });
                await Wallet.save()
      }
 await order.save();
 return res.redirect('/admin/orders')

  }
  catch(error){
    console.log(error)
  }
}

const rejectProduct = async (req, res) => {
  try {

    const orderId = req.params.id
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required." });
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    order.returnRequest.status = "Rejected";
    order.status = "Rejected";
console.log("here 1")
    for (let item of order.orderedItems) {
      if (typeof item === "object" && item.status === "Return Request") {
        console.log("item", item);
        item.status = "Rejected";
      }
    }
    await order.save();

    return res.redirect('/admin/orders');
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};









let refundAmount = 0;

const approvereturn= async (req, res) => {
  try {
      const { orderId, productId } = req.body;
      console.log(true)
      console.log(req.body)
       
      const order=await Order.findOne({orderId})
      const userId=order.userId._id
      console.log('userId',userId)
      let productVariantId = null; 
      order.orderedItems.forEach((item) => {
        if (item._id.toString() === productId.toString()) {
     
  
          if (item.status === "Return Request") {
            item.status = "Returned";
            refundAmount = item.price; 
            productVariantId = item.variants
         
          }
        }
      });
      const product = await Product.findOne({ "variants._id": productVariantId });
      if (product) {
        product.variants.forEach((variant) => {
          if (variant._id.toString() === productVariantId.toString()) {
            variant.stock += 1; 
          }
        });
        await product.save();
      }

      const wallet=await walletSchema.findOne({userId:userId})
      if (!wallet) {
        const newWallet = new walletSchema({
          userId,
          totalBalance: refundAmount,
          transactions: [
            {
              type: "Refund",
              amount: refundAmount,
              orderId: order.orderId,
              date: new Date(),
            },
          ],
        });
  
        console.log("New Wallet:", newWallet);
        await newWallet.save();
      } else {
        wallet.totalBalance += refundAmount;
        wallet.transactions.push({
          type: "Refund",
          amount: refundAmount,
          orderId: order.orderId,
          date: new Date(),
        });
  
        await wallet.save();
      }
  

      console.log("wallet",wallet)
      const allreturn = order.orderedItems.every(item => item.status === "Returned");

      if (allreturn) {
          console.log(" All items are Returned!");
          console.log('orders',order)
          order.status='Returned'
      } else {
          console.log(" Some items are not Returned.");
      }
      await order.save()
      // console.log("product",product)
      console.log('Order',order)
      res.json({ success: true, message: "Return request approved." });
  } catch (error) {
    console.log(error)
      res.status(500).json({ success: false, message: "Error approving return request." });
  }
};


const rejectreturn=async(req,res)=>{
  try{
    const { orderId, productId } = req.body;
    const order=await Order.findOne({orderId})
    const userId=order.userId._id
    console.log('userId',userId)
    let productVariantId = null; 
    order.orderedItems.forEach((item) => {
      if (item._id.toString() === productId.toString()) {
   

        if (item.status === "Return Request") {
          item.status = "Rejected";
          
       
        }
      }
    });
    await order.save()
    res.json({success:true,message:"request rejected"})
  }
  catch(error){
    console.log("erooorroor",error)
  }
}


module.exports={orderInfo,orderDetails,updateOrderstatus,returnProduct,approvereturn,rejectProduct,rejectreturn }