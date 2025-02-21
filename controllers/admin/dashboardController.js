const Order=require('../../models/orderSchema')
const Product=require('../../models/productSchema');
const User=require('../../models/userSchema');
const Category=require('../../models/categorySchema');
const dashboard = async (req, res) => {
    try {
        const { salesFilter = 'daily' } = req.query;
        const currentDate = new Date();

        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);

        // const startOfWeek = new Date(currentDate);
        // startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        // startOfWeek.setHours(0, 0, 0, 0);

        // const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        // const startOfYear = new Date(currentDate.getFullYear(), 0, 1);

        let dateMatch = { status: 'Delivered' };
        let groupFormat;

        const topProducts = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $unwind: '$orderedItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.Product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$orderedItems.Product',
                    name: { $first: '$productDetails.productName' },
                    totalQuantity: { $sum: '$orderedItems.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] } }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]);
        const topBrands = await Order.aggregate([
            { 
                $match: { status: 'Delivered' } 
            },
            { $unwind: '$orderedItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.Product',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
        
            {
                $lookup: {
                    from: 'brands', 
                    localField: 'product.brand',
                    foreignField: '_id',
                    as: 'brandDetails'
                }
            },
            { $unwind: '$brandDetails' },
        
            {
                $group: {
                    _id: '$product.brand',  
                    name: { $first: '$brandDetails.brandName' },  
                    totalSales: { $sum: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] } },
                    totalQuantity: { $sum: '$orderedItems.quantity' }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);
        

        const topCategory = await Category.aggregate([
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: 'category',
                    as: 'products'
                }
            },
            { $unwind: { path: '$products', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'orders',
                    let: { productId: '$products._id' },
                    pipeline: [
                        {
                            $match: {
                                status: 'Delivered'
                            }
                        },
                        { $unwind: '$orderedItems' },
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$orderedItems.Product', '$$productId']
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalSales: { $sum: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] } },
                                totalQuantity: { $sum: '$orderedItems.quantity' }
                            }
                        }
                    ],
                    as: 'orderStats'
                }
            },
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    totalSales: {
                        $sum: {
                            $cond: [
                                { $gt: [{ $size: '$orderStats' }, 0] },
                                { $arrayElemAt: ['$orderStats.totalSales', 0] },
                                0
                            ]
                        }
                    },
                    totalQuantity: {
                        $sum: {
                            $cond: [
                                { $gt: [{ $size: '$orderStats' }, 0] },
                                { $arrayElemAt: ['$orderStats.totalQuantity', 0] },
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { totalQuantity: -1 } }
        ]);

      
        switch (salesFilter) {
            case 'daily':
              
                const sevenDaysAgo = new Date(currentDate);
                sevenDaysAgo.setDate(currentDate.getDate() - 7);
                sevenDaysAgo.setHours(0, 0, 0, 0);
                dateMatch.createdAt = { $exists: true  };
                groupFormat = "%Y-%m-%d";
                break;
            case 'weekly':
                dateMatch.createdAt = { $exists: true  };
                groupFormat = "%Y-%m-%d";
                break;
            case 'monthly':
                dateMatch.createdAt = { $exists: true };
                groupFormat = "%Y-%m";
                break;
            case 'yearly':
                dateMatch.createdAt = { $exists: true  };
                groupFormat = "%Y";
                break;
            default:
                dateMatch.createdAt = { $exists: true  };
                groupFormat = "%Y-%m-%d";
        }

        const salesData = await Order.aggregate([
            { $match: dateMatch },
            { $unwind: '$orderedItems' },
            {
                $group: {
                    _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
                    totalRevenue: {
                        $sum: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] }
                    },
                    totalProductsSold: { $sum: '$orderedItems.quantity' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        if (salesFilter === 'daily') {
            const filledData = [];
            const sevenDaysAgo = new Date(currentDate);
            sevenDaysAgo.setDate(currentDate.getDate() - 7);

            for (let d = new Date(sevenDaysAgo); d <= currentDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const existingData = salesData.find(item => item._id === dateStr);
                filledData.push(existingData || {
                    _id: dateStr,
                    totalRevenue: 0,
                    totalProductsSold: 0
                });
            }
            salesData.length = 0;
            salesData.push(...filledData);
        }

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ salesData });
        }

        console.log('topBrands',topBrands)
        res.render('admin/index.ejs', {
            salesData: JSON.stringify(salesData),
            currentFilter: salesFilter,
            topCategory,
            topProducts,
            topBrands
        });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = { dashboard };
