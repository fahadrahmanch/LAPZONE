const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const productSchema = require("../../models/productSchema");
const Coupon = require("../../models/coupenSchema");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const env = require("dotenv");
const moment = require("moment");
env.config();
const crypto = require("crypto");
const walletSchema = require("../../models/walletSchema");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const { getUserCart } = require("../../utils/services/getUserCart");
const { orderedItem } = require("../../utils/services/orderedItems");

const { MESSAGES, STATUS_CODES, ERROR } = require("../../utils/constants");
const { log } = require("console");

const DELIVERY_CHARGE = 50;

// STOCK MANAGEMENT REUSEBLE FUNCTION

async function STOCK_MANAGEMENT(cart, userId) {
  const matchedVariants = [];

  for (const item of cart.items) {
    const product = await productSchema.findById(item.productId._id);

    const matchedVariant = product.variants.find(
      (variant) => variant._id.toString() === item.variant._id.toString()
    );

    if (matchedVariant) {
      matchedVariants.push(matchedVariant);

      const quantityToDecrease = item.quantity;
      matchedVariant.stock -= quantityToDecrease;
    } else {
      console.log("no, variant not matched");
    }
  }

  for (const item of matchedVariants) {
    await productSchema.updateOne(
      { "variants._id": item._id },
      { $set: { "variants.$.stock": item.stock } }
    );
  }

  //UPDATE CART
  await Cart.updateOne({ userId }, { $set: { items: [] } });
}

// CREATE ORDER
const createOrder = async (req, res) => {
  try {
    const {
      selectedAddressId,
      selectPayment,
      totalAMount,
      couponSelect,
      Disount,
    } = req.body;
    const userId = req.session.user;
    if (!userId) {
      return res
        .status(STATUS_CODES.UNAUTHORIZED)
        .json({ message: MESSAGES.USER_NOT_FOUND });
    }

    if (!selectPayment || !selectedAddressId) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ message: MESSAGES.ADDRESS_PAYMENT_REQUIRED });
    }
    if (totalAMount > 1050) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        message: MESSAGES.COD_NOT_AVAILABLE,
      });
    }

    // TO FIND ADDRESS
    const address = await Address.findOne(
      { userId, "address._id": selectedAddressId },
      { address: { $elemMatch: { _id: selectedAddressId } } }
    );

    if (!address) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ message: MESSAGES.ADDRESS_NOT_FOUND });
    }

    const cart = await getUserCart(userId);
    if (!cart || !cart.items.length) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ message: MESSAGES.CART_EMPTY });
    }

    // ITRATE CART ITEMS AND FIND VAIRANT ID AND CREATE ORDER

    cart.items = cart.items.map((item) => {
      const variantId = item.variantId;
      const variant = item.productId.variants.find(
        (variant) => variant._id.toString() === variantId.toString()
      );
      delete item.variants;
      item.variant = variant;
      return item;
    });

    const orderedItems = await orderedItem(cart, Disount);

    // FIND BEST OFFER

    for (let item of orderedItems) {
      let offer = 0;
      let originalPrice = item.price;

      if (item.Product) {
        const bestOffer = await productSchema
          .findOne({ _id: item.Product })
          .populate("category");
        offer = Math.max(bestOffer.category.offerPrice, bestOffer.productOffer);
      }

      item.price = originalPrice - (originalPrice * offer) / 100;
      item.totalPrice = item.price * item.quantity;
    }

    const addressObject = address.address[0];


    const coupon = await Coupon.findOne({ name: couponSelect });
    if (coupon) {
      coupon.userId.push(userId);
      await coupon.save();
    }
 console.log("coupon",coupon)
    //CREATE NEW ORDER

    const newOrder = new Order({
      userId: userId,
      orderedItems,
      finalAmount: totalAMount,
      address: {
        name: addressObject.name,
        streetaddress: addressObject.streetaddress,
        city: addressObject.city,
        landmark: addressObject.landmark,
        state: addressObject.state,
        pincode: addressObject.pincode,
        phone: addressObject.phone,
      },
      status: "Shipped",
      paymentMethod: selectPayment,
      discount: req.session.totalDiscount,
      DeliveryCharge: DELIVERY_CHARGE,
      couponAmount:coupon.offerPrice||0
    });

    await newOrder.save();

    //Stock management

    await STOCK_MANAGEMENT(cart, userId);
    //COUPON FIND

  

    res.status(STATUS_CODES.OK).json({ success: true, newOrder });
  } catch (error) {
    console.error(error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render("errorPage", {
      message: MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

// RAZORPAY INSTANCE

const razorpayInstance = new Razorpay({
  key_id: process.env.YOUR_RAZORPAY_KEY_I_D,
  key_secret: process.env.YOUR_RAZORPAY_KEY_SECRE_T,
});

//RAZORPAY

const raz = async (req, res) => {
  try {
    const { selectedAddressId, selectPayment, totalAMount, couponSelect } =
      req.body;
    const amount = totalAMount * 100;

    const options = {
      amount,
      currency: "INR",
      receipt: `order_rcptid_${new Date().getTime()}`,
    };
    const razorpayOrder = await razorpayInstance.orders.create(options);

    res.json({
      success: true,
      razorpayOrder: razorpayOrder,
      razorpayInstance: razorpayInstance,
    });
  } catch (error) {
    console.log(error);
  }
};

//VERIFY RAZORPAY

const verifyRazorpay = async (req, res) => {
  try {
    const userId = req.session.user;
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      selectedAddressId,
      selectPayment,
      totalAMount,
      couponSelect,
      Disount,
    } = req.body;

    const body = razorpayOrderId + "|" + razorpayPaymentId;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.YOUR_RAZORPAY_KEY_SECRE_T)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpaySignature) {
      const address = await Address.findOne(
        { userId, "address._id": selectedAddressId },
        { address: { $elemMatch: { _id: selectedAddressId } } }
      );
      if (!address) {
        return res
          .status(STATUS_CODES.NOT_FOUND)
          .json({ message: MESSAGES.ADDRESS_NOT_FOUND });
      }

      //FIND CART AND POPULATE PRODUCT ID

      const cart = await getUserCart(userId);
      if (!cart || !cart.items.length) {
        return res
          .status(STATUS_CODES.BAD_REQUEST)
          .json({ message: MESSAGES.CART_EMPTY });
      }

      cart.items = cart.items.map((item) => {
        const variantId = item.variantId;
        const variant = item.productId.variants.find(
          (variant) => variant._id.toString() === variantId.toString()
        );
        delete item.variants;
        item.variant = variant;
        return item;
      });

      const orderedItems = orderedItem(cart, Disount);
      for (let item of orderedItems) {
        let offer = 0;
        let originalPrice = item.price;

        if (item.Product) {
          const bestOffer = await productSchema
            .findOne({ _id: item.Product })
            .populate("category");

          offer = Math.max(
            bestOffer.category.offerPrice,
            bestOffer.productOffer
          );
        }

        item.price = originalPrice - (originalPrice * offer) / 100;
        item.totalPrice = item.price * item.quantity;
      }

      const addressObject = address.address[0];

      // NEW ORDER
      const coupon = await Coupon.findOne({ name: couponSelect });
      if (coupon) {
        coupon.userId.push(userId);
        await coupon.save();
      }
      const newOrder = new Order({
        userId: userId,
        orderedItems,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        finalAmount: totalAMount,
        address: {
          name: addressObject.name,
          streetaddress: addressObject.streetaddress,
          city: addressObject.city,
          landmark: addressObject.landmark,
          state: addressObject.state,
          pincode: addressObject.pincode,
          phone: addressObject.phone,
        },
        status: "Shipped",
        paymentMethod: selectPayment,
        discount: req.session.totalDiscount,
        DeliveryCharge: DELIVERY_CHARGE,
        couponAmount:coupon?.offerPrice||0
      });

      await newOrder.save();

      // STOCK MANAGMENT

      await STOCK_MANAGEMENT(cart, userId);

    

      return res.json({
        success: true,
        message: MESSAGES.PAYMENT_VERIFIED,
        newOrder: newOrder,
      });
    } else {
      return res.json({
        success: false,
        message: MESSAGES.PAYMENT_VERIFICATION_FAILED,
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.PAYMENT_VERIFICATION_ERROR,
    });
  }
};

//FAIL RAZORPAY ORDER

const failRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const {
      selectedAddressId,
      selectPayment,
      totalAMount,
      couponSelect,
      Disount,
    } = req.body;
    const address = await Address.findOne(
      { userId, "address._id": selectedAddressId },
      { address: { $elemMatch: { _id: selectedAddressId } } }
    );
    if (!address) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ message: MESSAGES.ADDRESS_NOT_FOUND });
    }

    const cart = await Cart.findOne({ userId })
      .populate({
        path: "items.productId",
        model: "Product",
      })
      .lean();

    if (!cart || !cart.items.length) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ message: MESSAGES.CART_EMPTY });
    }

    cart.items = cart.items.map((item) => {
      const variantId = item.variantId;
      const variant = item.productId.variants.find(
        (variant) => variant._id.toString() === variantId.toString()
      );
      delete item.variants;
      item.variant = variant;
      return item;
    });

    const orderedItems = orderedItem(cart, Disount);

    for (let item of orderedItems) {
      let offer = 0;
      let originalPrice = item.price;

      if (item.Product) {
        const bestOffer = await productSchema
          .findOne({ _id: item.Product })
          .populate("category");

        offer = Math.max(bestOffer.category.offerPrice, bestOffer.productOffer);
      }

      item.price = originalPrice - (originalPrice * offer) / 100;
      item.totalPrice = item.price * item.quantity;
    }

    const addressObject = address.address[0];

    // NEW ORDER

    const newOrder = new Order({
      userId: userId,
      orderedItems,

      finalAmount: totalAMount,
      address: {
        name: addressObject.name,
        streetaddress: addressObject.streetaddress,
        city: addressObject.city,
        landmark: addressObject.landmark,
        state: addressObject.state,
        pincode: addressObject.pincode,
        phone: addressObject.phone,
      },
      status: "Pending",
      paymentMethod: selectPayment,
      discount: req.session.totalDiscount,
      DeliveryCharge: DELIVERY_CHARGE,
      paymentStatus: "Failed",
    });

    //UPDATE CART
    await Cart.updateOne({ userId }, { $set: { items: [] } });

    await newOrder.save();
  } catch (error) {
    console.log(error);
  }
};

//RETRY RAZORPAY ORDER

const retryRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      totalAmount,
      orderId,
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.MISSING_PAYMENT_DETAILS });
    }

    const hmac = crypto.createHmac(
      "sha256",
      process.env.YOUR_RAZORPAY_KEY_SECRE_T
    );
    hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.INVALID_PAYMENT_SIGNATURE });
    }

    const orderUpdate = await Order.findOne({ orderId: orderId });
    if (orderUpdate) {
      orderUpdate.status = "Shipped";
      orderUpdate.paymentStatus = "Paid";
      orderUpdate.razorpayPaymentId = razorpayPaymentId;
      orderUpdate.razorpaySignature = razorpayPaymentId;
      orderUpdate.razorpayOrderId = razorpayOrderId;
    }

    // stock management
    for (let item of orderUpdate.orderedItems) {
      const quantity = item.quantity;
      const variantsId = item.variants;
      const products = await productSchema.findOne({
        "variants._id": variantsId,
      });
      if (products) {
        const variant = await products.variants.find(
          (v) => v._id.toString() === variantsId.toString()
        );
        variant.stock = variant.stock - quantity;
        await products.save();
      }
    }

    await orderUpdate.save();
    res.json({
      success: true,
      message: MESSAGES.PAYMENT_VERIFIED,
      newOrder: orderUpdate,
    });
  } catch (error) {
    console.error("Retry Payment Error:", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.SOMETHING_WENT_WRONG });
  }
};

//RENDER CONFIRM PAGE

const renderConfirmorder = async (req, res) => {
  try {
    let id = req.params.id;
    let user = req.session.user;
    if (!user) {
      return res.redirect("/");
    }
    const orderDetails = await Order.findOne({ _id: id }).populate({
      path: "orderedItems.Product",
      model: "Product",
    });

    res.render("user/orderConfirm", {
      orderDetails,
      message: req.session.user || "",
    });
  } catch (error) {
    console.log(error);
  }
};

//RENDER ORDER DETAILS PAGE

const orderDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const id = req.params.id;

    const order = await Order.findOne({ orderId: id })
      .populate({ path: "userId", model: "User" })
      .populate({ path: "orderedItems.Product", model: "Product" });

    res.render("user/viewOrders", { order, message: req.session.user || "" });
  } catch (error) {
    console.log(error);
  }
};

//CANCEL ORDER

const Variants = [];
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.body;
    const userId = req.session.user;

    const order = await Order.findOne({ userId, orderId: id });
    const Wallet = await walletSchema.findOne({ userId });
    // if (!Wallet) {
    //   const newWallet = new walletSchema({
    //     userId,
    //     totalBalance: order.finalAmount,
    //     transactions: [
    //       {
    //         type: "Refund",
    //         amount: order.finalAmount,
    //         orderId: order.orderId,
    //       },
    //     ],
    //   });
    //   await newWallet.save();
    // } else {
    //   Wallet.totalBalance += order.finalAmount;
    //   Wallet.transactions.push({
    //     type: "Refund",
    //     amount: order.finalAmount,
    //     orderId: order.orderId,
    //     date: new Date(),
    //   });
    //   await Wallet.save();
    // }

    if (!order) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: MESSAGES.ORDER_NOT_FOUND });
    }

    order.status = "Cancelled";
    await order.save();

    for (const item of order.orderedItems) {
      item.status = "Cancelled";
      const product = await productSchema.findOne({
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

      await order.save();
    }
    for (const item of Variants) {
      await productSchema.updateOne(
        { "variants._id": item._id },
        { $set: { "variants.$.stock": item.stock } }
      );
    }

    if (order.paymentMethod == "razorpay" || order.paymentMethod === "wallet") {
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
              // description:
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
    }

    return res
      .status(STATUS_CODES.OK)
      .json({ success: true, message: MESSAGES.ORDER_CANCELLED_SUCCESS });
  } catch (error) {
    console.error(error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// GET REFUND

const refund = async (req, res) => {
  try {
    const userId = req.session.userId;

    const { orderId, returnReason, additionalReason } = req.body;
    const order = await Order.findOne({ orderId: orderId });
    if (!order) {
      return res.json({ success: false });
    }
    order.returnRequest.status = "Pending";
    order.returnRequest.reason = returnReason;
    order.returnRequest.details = additionalReason;

    order.status = "Return Request";
    for (let i = 0; i < order.orderedItems.length; i++) {
      let item = order.orderedItems[i];
      for (let key in item) {
        if (key == "status" && item[key] != "Cancelled") {
          item[key] = "Return Request";
        }
      }
    }
    if (order) await order.save();
    return res.json({ success: true });
  } catch (error) {
    console.log(error);
  }
};

// ORDER WITH WALLET

const walletOrder = async (req, res) => {
  try {
    const {
      selectedAddressId,
      selectPayment,
      totalAMount,
      couponSelect,
      Disount,
    } = req.body;
    const userId = req.session.user;

    //FIND WALLET

    const wallet = await walletSchema.findOne({ userId: userId });
    if (!wallet) {
      const newWallet = new walletSchema({ userId });
      await newWallet.save();
    }

    const address = await Address.findOne(
      { userId, "address._id": selectedAddressId },
      { address: { $elemMatch: { _id: selectedAddressId } } }
    );
    if (!address) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ message: MESSAGES.NOT_FOUND });
    }
    const cart = await getUserCart(userId);
    if (wallet.totalBalance == 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.INSUFFICIENT_WALLET_BALANCE,
      });
    }
    if (wallet.totalBalance < totalAMount) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.INSUFFICIENT_WALLET_BALANCE,
      });
    }

    if (wallet.totalBalance >= totalAMount) {
      const cart = await Cart.findOne({ userId })
        .populate({
          path: "items.productId",
          model: "Product",
        })
        .lean();

      if (!cart || !cart.items.length) {
        return res
          .status(STATUS_CODES.BAD_REQUEST)
          .json({ message: MESSAGES.CART_EMPTY });
      }

      cart.items = cart.items.map((item) => {
        const variantId = item.variantId;
        const variant = item.productId.variants.find(
          (variant) => variant._id.toString() === variantId.toString()
        );
        delete item.variants;
        item.variant = variant;
        return item;
      });

      const orderedItems = orderedItem(cart, Disount);

      for (let item of orderedItems) {
        let offer = 0;
        let originalPrice = item.price;

        if (item.Product) {
          const bestOffer = await productSchema
            .findOne({ _id: item.Product })
            .populate("category");
          offer = Math.max(
            bestOffer.category.offerPrice,
            bestOffer.productOffer
          );
        }

        item.price = originalPrice - (originalPrice * offer) / 100;
        item.totalPrice = item.price * item.quantity;
      }

      const addressObject = address.address[0];


      const coupon = await Coupon.findOne({ name: couponSelect });
      if (coupon) {
        coupon.userId.push(userId);
        await coupon.save();
      }

      // NEW ORDER

      const newOrder = new Order({
        userId: userId,
        orderedItems,
        finalAmount: totalAMount,
        address: {
          name: addressObject.name,
          streetaddress: addressObject.streetaddress,
          city: addressObject.city,
          landmark: addressObject.landmark,
          state: addressObject.state,
          pincode: addressObject.pincode,
          phone: addressObject.phone,
        },
        status: "Shipped",
        paymentMethod: selectPayment,
        discount: req.session.totalDiscount,
        DeliveryCharge: DELIVERY_CHARGE,
        couponAmount:coupon?.offerPrice||0
      });

      await newOrder.save();

      //STOCK MANAGEMENT

      await STOCK_MANAGEMENT(cart, userId);

      // FIND COUPON

     
      wallet.totalBalance = wallet.totalBalance - totalAMount;
      wallet.transactions.push({
        type: "Withdrawal",
        amount: totalAMount,
        orderId: newOrder.orderId,
        date: new Date(),
      });
      await wallet.save();
      res.status(STATUS_CODES.OK).json({ success: true, newOrder });
    }
  } catch (error) {
    console.log(error);
  }
};

//INDIVIDUAL PRODUCT CANCEL

const productCancel = async (req, res) => {
  try {
    const { orderId, productId } = req.body;
    const user = req.session.user;
    const orders = await Order.findOne({ orderId: orderId });

    for (let i = 0; i < orders.orderedItems.length; i++) {
      if (productId === orders.orderedItems[i]._id.toString()) {
        orders.orderedItems[i].status = "Cancelled";
        const price = orders.orderedItems[i].price;
        orders.finalAmount = orders.finalAmount - price;
        const product = orders.orderedItems[i].Product;
        const variantId = orders.orderedItems[i].variants;
        const quantity = orders.orderedItems[i].quantity;
        const products = await productSchema.findOne({ _id: product });
        const wallet = await walletSchema.findOne({ userId: user });
        for (let i = 0; i < products.variants.length; i++) {
          for (let key in products.variants[i]) {
            if (
              products.variants[i][key] &&
              products.variants[i][key].toString() === variantId.toString()
            ) {
              if ("stock" in products.variants[i]) {
                products.variants[i].stock += quantity;
              } else {
                console.log("Stock key not found!");
              }
            }
          }
        }
        if (
          orders.paymentMethod == "razorpay" ||
          orders.paymentMethod == "wallet"
        ) {
          if (!wallet) {
            const newWallet = new walletSchema({
              userId: user,
              totalBalance: refundAmount,
              transactions: [
                {
                  type: "Refund",
                  amount: price,
                  orderId: orderId,
                  date: new Date(),
                },
              ],
            });

            await newWallet.save();
          } else {
            wallet.totalBalance += price;
            wallet.transactions.push({
              type: "Refund",
              amount: price,
              orderId: orderId,
              date: new Date(),
            });

            await wallet.save();
          }
        }

        const allCancelled = orders.orderedItems.every(
          (item) => item.status === "Cancelled"
        );

        if (allCancelled) {
          orders.status = "Cancelled";
        } else {
          console.log(" Some items are not cancelled.");
        }

        await products.save();
      } else {
        console.log(false);
      }
    }

    await orders.save();
    return res.json({ success: true });
  } catch (error) {
    console.log(error);
  }
};

//INDIVIDUAL RETURN PRODUCT

const returnproduct = async (req, res) => {
  const { productId } = req.body;
  try {
    await Order.updateOne(
      { "orderedItems._id": productId },
      { $set: { "orderedItems.$.status": "Return Request" } }
    );

    res
      .status(STATUS_CODES.OK)
      .json({ message: MESSAGES.PRODUCT_RETURN_SUCCESS });
  } catch (error) {
    console.error("Error processing return:", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.PRODUCT_RETURN_FAILED });
  }
};

// ORFER PDF

const pdf = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findOne({ orderId }).populate([
      {
        path: "userId",
        select: "name address phone",
      },
      {
        path: "orderedItems.Product",
      },
    ]);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const user = order.userId;

    const doc = new PDFDocument({ margin: 50 });
    const filename = `invoice_${orderId}.pdf`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // Helper function to draw a line
    const drawLine = (y) => {
      doc.moveTo(50, y).lineTo(550, y).stroke();
    };

    // Header
    doc.fontSize(24).text("INVOICE", { align: "center" });
    doc.moveDown(1);

    // Invoice details
    doc.fontSize(12).text(`Invoice Number: INV-${orderId}`, { align: "right" });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: "right" });
    doc.moveDown(1);

    drawLine(doc.y);
    doc.moveDown(1);

    // Order and Customer details in two columns
    const leftColumnX = 50;
    const rightColumnX = 400;

    doc
      .fontSize(14)
      .text("Order Details", leftColumnX, doc.y, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Order ID: ${order.orderId}`, leftColumnX);
    doc.text(
      `Order Date: ${new Date(order.createdAt).toLocaleDateString()}`,
      leftColumnX
    );
    doc.text(`Payment Method: ${order.paymentMethod}`, leftColumnX);

    doc
      .fontSize(14)
      .text(
        "Customer Details",
        rightColumnX,
        doc.y - doc.currentLineHeight() * 4.5,
        { underline: true }
      );
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Name: ${user?.name || "N/A"}`, rightColumnX);
    doc.text(`Address: ${order.address.streetaddress || "N/A"}`, rightColumnX);
    doc.text(`${order.address.pincode || "N/A"}`, rightColumnX + 20);
    doc.text(`Phone: ${order.address.phone || "N/A"}`, rightColumnX);

    doc.moveDown(2);

    // Order Items Table
    const startX = 50;
    const productWidth = 250;
    const qtyWidth = 50;
    const priceWidth = 100;
    const totalWidth = 100;

    // Table Header
    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("Product", startX, doc.y, { width: productWidth, align: "left" });
    doc.text("Qty", startX + productWidth, doc.y - doc.currentLineHeight(), {
      width: qtyWidth,
      align: "center",
    });
    doc.text(
      "Price",
      startX + productWidth + qtyWidth,
      doc.y - doc.currentLineHeight(),
      { width: priceWidth, align: "right" }
    );
    doc.text(
      "Total",
      startX + productWidth + qtyWidth + priceWidth,
      doc.y - doc.currentLineHeight(),
      { width: totalWidth, align: "right" }
    );

    doc.moveDown(0.5);
    drawLine(doc.y);
    doc.moveDown(0.5);

    // Table Content
    doc.font("Helvetica");
    order.orderedItems.forEach((item) => {
      const y = doc.y;
      doc
        .fontSize(10)
        .text(item.Product.productName, startX, y, {
          width: productWidth,
          align: "left",
        })
        .text(item.quantity.toString(), startX + productWidth, y, {
          width: qtyWidth,
          align: "center",
        })
        .text(
          `₹${item.price.toFixed(2)}`,
          startX + productWidth + qtyWidth,
          y,
          { width: priceWidth, align: "right" }
        )
        .text(
          `₹${(item.price * item.quantity).toFixed(2)}`,
          startX + productWidth + qtyWidth + priceWidth,
          y,
          { width: totalWidth, align: "right" }
        );

      doc.moveDown();
    });

    // Totals
    doc.moveDown(0.5);
    drawLine(doc.y);
    doc.moveDown(0.5);

    const totalsX = startX + productWidth + qtyWidth;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Subtotal:", totalsX, doc.y, { width: priceWidth, align: "left" });
    doc.text(
      `₹${order.finalAmount.toFixed(2)}`,
      totalsX + priceWidth,
      doc.y - doc.currentLineHeight(),
      { width: totalWidth, align: "right" }
    );
    doc.moveDown(0.5);
    doc.text("Total Amount:", totalsX, doc.y, {
      width: priceWidth,
      align: "left",
    });
    doc.text(
      `₹${order.finalAmount.toFixed(2)}`,
      totalsX + priceWidth,
      doc.y - doc.currentLineHeight(),
      { width: totalWidth, align: "right" }
    );

    // Footer
    doc.fontSize(10).font("Helvetica");
    doc.text("Thank you for shopping with us!", 50, 700, { align: "center" });

    doc.end();
  } catch (error) {
    console.log("Error generating PDF:", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: "Failed to generate PDF" });
  }
};

module.exports = {
  createOrder,
  renderConfirmorder,
  orderDetails,
  cancelOrder,
  raz,
  walletOrder,
  razorpayInstance,
  verifyRazorpay,
  refund,
  productCancel,
  returnproduct,
  pdf,
  failRazorpayOrder,
  retryRazorpayOrder,
};
