const Coupon = require("../../models/coupenSchema");
const { Errors, message } = require("../../utils/constants");

// COUPON PAGE RENDER
const getcoupen = async (req, res) => {
    try {
        const admin = req.session.admin;
        if (!admin) return res.redirect("/admin/login");
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        const totalCoupons = await Coupon.countDocuments();
        const coupons = await Coupon.find()
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit);

        res.render("admin/coupen", {
            coupons,
            totalPages: Math.ceil(totalCoupons / limit),
            currentPage: page,
        });
    } catch (error) {
        console.log(error);
    }
};

// ADD COUPEN

const addCoupen = async (req, res) => {
    try {
        const admin = req.session.admin;

        if (admin) {
            const message = req.session.message;
            req.session.message = "";
            res.render("admin/addCoupen", { message: message });
        } else {
            res.redirect("/admin/login");
        }
    } catch (error) {
        console.log(error);
    }
};

/// ADD COUPEN

const addCoupenPost = async (req, res) => {
    try {
        const { name, price, Amount, date } = req.body;
        const coupen = await Coupon.find({});

        const coupon_name = await Coupon.findOne({ name: name });
        if (coupon_name) {
            req.session.message = Errors.nameAlreadyExists.message;
            return res.redirect("/admin/addCoupen");
        }
        const admin = req.session.admin;
        if (!admin) return res.redirect("/admin/login");
        if (!name || !price || !Amount || !date) {
            req.session.message = message.coupenMustAllfields.message;
            return res.redirect("/admin/addCoupen");
        }
        const newCoupen = new Coupon({
            name,
            expireOn: date,
            offerPrice: price,
            minimumPrice: Amount,
        });
        const currentDate = new Date();
        const expiryDate = new Date(date);

        if (expiryDate < currentDate) {
            req.session.message = "Cannot create a coupon with a past date";
            return res.redirect("/admin/addCoupen");
        }
        req.session.message = "";
        await newCoupen.save();
        return res.redirect("/admin/coupen");
    } catch (error) {
        console.log(error);
    }
};

// LIST AND UNLIST COUPEN

const islist = async (req, res) => {
    try {
        const { name } = req.params;
        const coupen = await Coupon.findOne({ name: name });
        if (coupen.isList) {
            coupen.isList = false;
        } else {
            coupen.isList = true;
        }
        await coupen.save();

        return res.redirect("/admin/coupen");
    } catch (error) {
        console.log(error);
    }
};

module.exports = { getcoupen, addCoupen, addCoupenPost, islist };
