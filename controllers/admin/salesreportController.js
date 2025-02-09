const orderSchema=require("../../models/orderSchema")
const PDFDocument = require('pdfkit');

const ExcelJS = require('exceljs');
const fs = require('fs');




const getSalesreport = async (req, res) => {
    try {
        const admin = req.session.admin;
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        
        const period=req.query.period||"all"
        const startDate=req.query.startDate
        const endDate = req.query.endDate;
        // console.log(req.query)

        let filterQuery = {status: "Delivered"};
         
        // if(period!=="all"){
        //     let start,endDate
        //     const today=new Date();
        //     switch(period){
        //         case "daily":
        //             start=new Date(today.setHours(0,0,0,0));
        //             end = new Date(today.setHours(23, 59, 59, 999));
        //             break;

        //         case "weekly":
        //             start=new Date(today)
        //             start.setDate(today.getDate() - 7); // 7 days back
        //             end = new Date(today);
        //             break;
                
        //         case "monthly":
        //         start = new Date(today.getFullYear(), today.getMonth(), 1); 
        //         end = new Date(today.getFullYear(), today.getMonth() + 1, 0); 
        //         break;

        //         case "custom":
        //             if (startDate && endDate) {
        //                 start = new Date(startDate);
        //                 end = new Date(endDate);
        //             }
        //             break;
        //     }
        //     if (start && end) {
        //         filterQuery.createdOn = { $gte: start, $lte: end };
        //     }

        // }
        if (period !== "all") {
            let start, end;
            const today = new Date();
        
            switch (period) {
                case "daily":
                    start = new Date();
                    start.setHours(0, 0, 0, 0); 
                    end = new Date();
                    end.setHours(23, 59, 59, 999);
                    break;
        
                case "weekly":
                    start = new Date(today);
                    start.setDate(today.getDate() - 7);
                    start.setHours(0, 0, 0, 0); 
                    end = new Date(today);
                    end.setHours(23, 59, 59, 999);
                    break;
        
                case "monthly":
                    start = new Date(today.getFullYear(), today.getMonth(), 1); 
                    start.setHours(0, 0, 0, 0);
                    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    end.setHours(23, 59, 59, 999);
                    break;
        
                case "custom":
                    if (startDate && endDate) {
                        start = new Date(startDate);
                        start.setHours(0, 0, 0, 0);
                        end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                    }
                    break;
            }
        
            if (start && end) {
                
                const startStr = start.toISOString().split('T')[0];
                const endStr = end.toISOString().split('T')[0];
        
                filterQuery.createdOn = { $gte: startStr, $lte: endStr };
            }
        }
        

        const orders = await orderSchema.find(filterQuery)
            .populate('userId')
            .populate({
                path: 'orderedItems.Product',
                model: 'Product'
            })
            .skip(skip)
            .limit(limit)
            .lean();

       
            const salesCount = await orderSchema.countDocuments(filterQuery);
            const totalPages = Math.ceil(salesCount / limit);

     
        const totals = await orderSchema.aggregate([
            { $match: filterQuery },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$finalAmount" },
                    totalDiscount: { $sum: { $ifNull: ["$discount", 0] } }
                }
            }
        ]);
     
        const overallamount = totals.length > 0 ? totals[0].totalAmount : 0;
        const overallDiscount = totals.length > 0 ? totals[0].totalDiscount : 0;

        return res.render('admin/salesreport', {
            overallamount,
            overallDiscount,
            orders,
            count:salesCount,
            period:  'all',
            currentPage: page,
            totalPages,
            period,
            startDate,
            endDate,
        });

    } catch (error) {
        console.log(error);
    }
};


// const downloadPDF=async(req,res)=>{
//     try{
//      const orders=await orderSchema.find({})
//      .populate('userId')
//      .populate({
//         path:''
//      })
//     }
//     catch(error){
//         console.log(error)
//     }
// }

const downloadExcel = async (req, res) => {
    try {
        const filterQuery = {}; 
        const period=req.query.period||"all"
        const startDate=req.query.startDate
        const endDate = req.query.endDate;
        console.log(req.query)
        if (period !== "all") {
            let start, end;
            const today = new Date();
        
            switch (period) {
                case "daily":
                    start = new Date();
                    start.setHours(0, 0, 0, 0); 
                    end = new Date();
                    end.setHours(23, 59, 59, 999);
                    break;
        
                case "weekly":
                    start = new Date(today);
                    start.setDate(today.getDate() - 7);
                    start.setHours(0, 0, 0, 0); 
                    end = new Date(today);
                    end.setHours(23, 59, 59, 999);
                    break;
        
                case "monthly":
                    start = new Date(today.getFullYear(), today.getMonth(), 1); 
                    start.setHours(0, 0, 0, 0);
                    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    end.setHours(23, 59, 59, 999);
                    break;
        
                case "custom":
                    if (startDate && endDate) {
                        start = new Date(startDate);
                        start.setHours(0, 0, 0, 0);
                        end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                    }
                    break;
            }
        
            if (start && end) {
                
                const startStr = start.toISOString().split('T')[0];
                const endStr = end.toISOString().split('T')[0];
        
                filterQuery.createdOn = { $gte: startStr, $lte: endStr };
            }
        }
        const orders = await orderSchema.find(filterQuery)
            .populate('userId')
            .populate({
                path: 'orderedItems.Product',
                model: 'Product'
            })
            .lean();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 20 },
            { header: 'Date', key: 'createdOn', width: 15 },
            { header: 'Customer', key: 'customer', width: 20 },
            { header: 'Products', key: 'products', width: 30 },
            { header: 'Payment', key: 'paymentMethod', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Amount', key: 'finalAmount', width: 15 }
        ];
        orders.forEach(order => {
            const createdOnDate = new Date(order.createdOn); 
            worksheet.addRow({
                orderId: order.orderId,
                createdOn: createdOnDate.toLocaleDateString(), 
                customer: order.userId.name,
                products: order.orderedItems.map(item => item.Product.productName).join(', '),
                paymentMethod: order.paymentMethod,
                status: order.status,
                finalAmount: order.finalAmount
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.log(error);
        res.status(500).send('Error generating Excel');
    }
};


const downloadPDF=async(req,res)=>{
    try{
    const filterQuery={}
    const period=req.query.period||"all"
    const startDate=req.query.startDate;
    const endDate=req.query.endDate;
    if (period !== "all") {
        let start, end;
        const today = new Date();
    
        switch (period) {
            case "daily":
                start = new Date();
                start.setHours(0, 0, 0, 0); 
                end = new Date();
                end.setHours(23, 59, 59, 999);
                break;
    
            case "weekly":
                start = new Date(today);
                start.setDate(today.getDate() - 7);
                start.setHours(0, 0, 0, 0); 
                end = new Date(today);
                end.setHours(23, 59, 59, 999);
                break;
    
            case "monthly":
                start = new Date(today.getFullYear(), today.getMonth(), 1); 
                start.setHours(0, 0, 0, 0);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                end.setHours(23, 59, 59, 999);
                break;
    
            case "custom":
                if (startDate && endDate) {
                    start = new Date(startDate);
                    start.setHours(0, 0, 0, 0);
                    end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                }
                break;
        }
    
        if (start && end) {
            
            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];
    
            filterQuery.createdOn = { $gte: startStr, $lte: endStr };
        }
    }
    const orders=await orderSchema.find(filterQuery)
    .populate('userId')
    .populate({
        path:'orderedItems.Product',
        model:'Product'
    })
    .lean()

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
    doc.pipe(res); 
    orders.forEach((order, index) => {
        const createdOnDate = new Date(order.createdOn);

        doc.fontSize(14).text(`Order ${index + 1}:`);
        doc.fontSize(12).text(`Order ID: ${order.orderId}`);
        doc.text(`Date: ${createdOnDate.toISOString().split('T')[0]}`);
        doc.text(`Customer: ${order.userId.name}`);
        doc.text(`Products: ${order.orderedItems.map(item => item.Product.productName).join(', ')}`);
        doc.text(`Payment Method: ${order.paymentMethod}`);
        doc.text(`Status: ${order.status}`);
        doc.text(`Amount: $${order.finalAmount}`);
        doc.moveDown();
    });

    doc.end();


    }
    catch(error){
        console.log(error)
        res.status(500).send('Error generating PDF');
    }
}


module.exports={getSalesreport,downloadExcel,downloadPDF}