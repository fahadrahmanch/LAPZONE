const Order=require("../../models/orderSchema");


const orderInfo= async (req, res) => {
    try {
        console.log("hi")
      const order = await Order.find()
        .populate("userId", "name email")
        // .populate("items.productId") 
        // .sort({ orderDate: -1 }); 
        //  console.log("orders",order)
  
      res.render("admin/orders", { order });
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).render("error", { message: "Failed to load orders" });
    }
  };

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

const updateOrderstatus=async(req,res)=>{
    console.log("work")
    
    try{
     const {status,orderId}=req.body;
    
    console.log(orderId,status)
     let order= await Order.findOne({orderId});
     if(!order){
        return res.status(400).json({success:false,message:"order not found"})
     }
     if(order.status=='Delivered'||order.status=='Cancelled'){
        return res.status(401).json({
            success: false,
            message: `The order status cannot be changed because it is already "${order.status}".`
        });

    }
    order.status=status;
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


module.exports={orderInfo,orderDetails,updateOrderstatus}