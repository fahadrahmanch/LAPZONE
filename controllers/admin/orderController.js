const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const walletSchema = require("../../models/walletSchema");
const { STATUS_CODES, MESSAGES } = require("../../utils/constants");
const { walletOrder } = require("../user/orderController");

const orderInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const order = await Order.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments();

    const totalPages = Math.ceil(totalOrders / limit);

    res.render("admin/orders", {
      order,
      currentPage: page,
      totalPages,
      limit,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .send({ message: MESSAGES.FAILED_TO_LOAD_ORDERS });
  }
};

module.exports = { orderInfo };

const orderDetails = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.session.id;
    const details = await Order.findById({ _id: id })
      .populate({
        path: "userId",
        model: "User",
      })
      .populate({ path: "orderedItems.Product", model: "Product" });

    res.render("admin/orderDetails", { details });
  } catch (error) {
    console.log(error);
  }
};
const Variants = [];
const updateOrderstatus = async (req, res) => {
  try {
    const { status, orderId } = req.body;

    let order = await Order.findOne({ orderId });
    if (!order) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: MESSAGES.ORDER_NOT_FOUND });
    }
    if (
      order.status == "Delivered" ||
      order.status == "Cancelled" ||
      order.status === "Returned" ||
      order.status === "Rejected"
    ) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.ORDER_STATUS_CANNOT_BE_CHANGED,
      });
    }
    order.status = status;

    for (let i = 0; i < order.orderedItems.length; i++) {
      let item = order.orderedItems[i];
      for (let key in item) {
        if (key == "status" && item[key] != "Cancelled") {
          item[key] = status;
        }
      }
    }
    if (order.status == "Cancelled") {
      for (let item of order.orderedItems) {
        const product = await Product.findOne({
          variants: { $elemMatch: { _id: item.variants } },
        });
        const variant = product.variants.find(
          (variant) => variant._id.toString() === item.variants.toString()
        );

        if (variant) {
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
    await order.save();
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: MESSAGES.ORDER_STATUS_CHANGED_SUCCESS,
    });
  } catch (error) {
    console.log(error);
  }
};

const returnProduct = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findOne({ orderId });
    const userId = order.userId;

    order.returnRequest.status = "Approved";
    order.status = "Returned";
    for (let item of order.orderedItems) {
      if (typeof item == "object") {
        for (let k in item) {
          if (k == "status" && item[k] !== "Cancelled") {
            item.status = "Returned";
            const product = await Product.findById(item.Product);
            if (product) {
              let variant = product.variants.id(item.variants);
              if (variant) {
                variant.stock += item.quantity;
              }
              await product.save();
            }
          }
        }
      }
    }

    const Wallet = await walletSchema.findOne({ userId });
    if (!Wallet) {
      const newWallet = new walletSchema({
        userId,
        totalBalance: order.finalAmount,
        transactions: [
          {
            type: "Refund",
            amount: order.finalAmount,
            orderId: order.orderId,
          },
        ],
      });
      await newWallet.save();
    } else {
      Wallet.totalBalance += order.finalAmount;
      Wallet.transactions.push({
        type: "Refund",
        amount: order.finalAmount,
        orderId: order.orderId,
        date: new Date(),
      });
      await Wallet.save();
    }
    await order.save();
    return res.redirect("/admin/orders");
  } catch (error) {
    console.log(error);
  }
};

const rejectProduct = async (req, res) => {
  try {
    const orderId = req.params.id;
    if (!orderId) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.ORDER_ID_REQUIRED });
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: MESSAGES.ORDER_NOT_FOUND });
    }

    order.returnRequest.status = "Rejected";
    order.status = "Rejected";
    for (let item of order.orderedItems) {
      if (typeof item === "object" && item.status === "Return Request") {
        item.status = "Rejected";
      }
    }
    await order.save();

    return res.redirect("/admin/orders");
  } catch (error) {
    console.error(error);
    res
      .status(STATUS_CODES)
      .json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

let refundAmount = 0;

const approvereturn = async (req, res) => {
  try {
    const { orderId, productId } = req.body;

    const order = await Order.findOne({ orderId });
    const userId = order.userId._id;
    let productVariantId = null;
    order.orderedItems.forEach((item) => {
      if (item._id.toString() === productId.toString()) {
        if (item.status === "Return Request") {
          item.status = "Returned";
          refundAmount = item.price;
          productVariantId = item.variants;
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

    const wallet = await walletSchema.findOne({ userId: userId });
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

    const allreturn = order.orderedItems.every(
      (item) => item.status === "Returned"
    );

    if (allreturn) {
      order.status = "Returned";
    } else {
      console.log(" Some items are not Returned.");
    }
    await order.save();
    res.json({ success: true, message: MESSAGES.RETURN_REQUEST_APPROVED });
  } catch (error) {
    console.log(error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: MESSAGES.ERROR_APPROVING_RETURN_REQUEST,
      });
  }
};

const rejectreturn = async (req, res) => {
  try {
    const { orderId, productId } = req.body;
    const order = await Order.findOne({ orderId });
    const userId = order.userId._id;
    let productVariantId = null;
    order.orderedItems.forEach((item) => {
      if (item._id.toString() === productId.toString()) {
        if (item.status === "Return Request") {
          item.status = "Rejected";
        }
      }
    });
    await order.save();
    res.json({ success: true, message: MESSAGES.REQUEST_REJECTED });
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  orderInfo,
  orderDetails,
  updateOrderstatus,
  returnProduct,
  approvereturn,
  rejectProduct,
  rejectreturn,
};
