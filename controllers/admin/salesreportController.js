const orderSchema=require("../../models/orderSchema")





const getSalesreport=async(req,res)=>{
    try{
        const admin=req.session.admin
        // if(!admin){
        //     return res.redirect('/admin/login')
        // }
        const orders= await orderSchema.find().populate('userId')
        const salesCount=await orderSchema.countDocuments();
        console.log("salesCount",salesCount)
        const overallamount=await orders.reduce((acc,curr)=>{
            console.log(curr.finalAmount)
            const sum=acc+curr.finalAmount
            return sum
        },0)
        
        console.log("overallamount",overallamount)
        // console.log(orders)
        return res.render('admin/salesreport')
    }
    catch(error){
    console.log(error)
    }
}
module.exports={getSalesreport}