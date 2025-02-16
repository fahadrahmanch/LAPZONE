const mongoose=require("mongoose");
const{Schema}=mongoose;
const {v4:uuidv4}=require('uuid');
const Product = require("./productSchema");
const orderSchema = new Schema({
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    orderId: {
      type: String,
      default: () => uuidv4(),
      unique: true
    },
    orderedItems: [{
      Product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        default: 0
      },
      totalPrice: {
        type: Number,
        required: true
      },
      variants: {
        type: Schema.Types.ObjectId,
        required: false
      },
      status: {
        type: String,
        required: true,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned', 'Rejected'],
        default: 'Shipped'
      },
    }],
    discount: {
      type: Number,
      default: 0
    },
    finalAmount: {
      type: Number,
      required: true
    },
    address: {
      streetaddress: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true
      },
      landmark: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: Number,
        required: true
      },
      phone: {
        type: String,
        required: true,
      },
    },
    paymentMethod: { type: String, enum: ['razorpay', 'cod', 'wallet'], required: true },
    invoiceDate: {
      type: Date
    },
    razorpayOrderId: {
      type: String,
      required: false
    },
    razorpayPaymentId: {
      type: String,
      required: false
    },
    razorpaySignature: {
      type: String,
      required: false
    },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned', 'Rejected'],
      default: 'Shipped'
    },
    returnRequest: {
      status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: null
      },
      reason: String,
      details: String,
      date: {
        type: Date,
        default: Date.now
      },
      processedDate: {
        type: Date,
        default: null
      }
    },
    DeliveryCharge:{
      type:Number,
      required:true
    },
    createdOn: {
      type: String,
      default: () => {
        const now = new Date();
        return now.toISOString().split('T')[0]; // Get the date part only
      },
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Paid",
      required: true,
    },
  }, { timestamps: true });
const Order=mongoose.model("Order",orderSchema);
module.exports=Order;