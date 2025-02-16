import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ecommerce', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected')).catch(err => console.log(err));

// Models
const Order = mongoose.model('Order', new mongoose.Schema({
    totalAmount: Number,
    createdAt: { type: Date, default: Date.now },
    products: [{ productId: mongoose.Schema.Types.ObjectId, quantity: Number }]
}));
const Product = mongoose.model('Product', new mongoose.Schema({
    name: String,
    category: String,
    brand: String,
    sales: Number
}));
const User = mongoose.model('User', new mongoose.Schema({ name: String }));

// Dashboard Routes
app.get('/dashboard/stats', async (req, res) => {
    try {
        const totalSales = await Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]);
        const totalOrders = await Order.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();

        res.json({
            totalSales: totalSales.length ? totalSales[0].total : 0,
            totalOrders,
            totalUsers,
            totalProducts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Filtered Sales Data
app.get('/dashboard/sales', async (req, res) => {
    try {
        const { filter } = req.query;
        let match = {};
        if (filter === 'monthly') {
            const start = new Date();
            start.setDate(1);
            match.createdAt = { $gte: start };
        } else if (filter === 'yearly') {
            const start = new Date();
            start.setMonth(0, 1);
            match.createdAt = { $gte: start };
        }

        const salesData = await Order.aggregate([
            { $match: match },
            { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$totalAmount' } } },
            { $sort: { _id: 1 } }
        ]);

        res.json(salesData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Best Selling Products
app.get('/dashboard/top-products', async (req, res) => {
    try {
        const topProducts = await Product.find().sort({ sales: -1 }).limit(10);
        res.json(topProducts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Best Selling Categories
app.get('/dashboard/top-categories', async (req, res) => {
    try {
        const topCategories = await Product.aggregate([
            { $group: { _id: '$category', totalSales: { $sum: '$sales' } } },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);
        res.json(topCategories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Best Selling Brands
app.get('/dashboard/top-brands', async (req, res) => {
    try {
        const topBrands = await Product.aggregate([
            { $group: { _id: '$brand', totalSales: { $sum: '$sales' } } },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);
        res.json(topBrands);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
