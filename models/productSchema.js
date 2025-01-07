// const mongoose=require("mongoose");
// const {Schema}=mongoose;




// const productSchema= new Schema({
//     productName:{
//         type :String,
//         required:true,
//     },
//     description:{
//         type:String,
//         required:true
//     },
//     // brand:{
//     //     type:String,
//     //     // required:true,
//     // },
//     category:{
//         type:Schema.Types.ObjectId,
//         ref:"Category"
//     },
//     regularPrice:{
//         type:Number,
//         required:true
//     },
//     salePrice:{
//         type:Number,
//         required:true
//     },
//     productOffer:{
//         type:Number,
//         default:0,
//     },
//     quantity:{
//         type:Number,
//         default:true
//     },
//     color:{
//         type:String,
//         // required:true
//     },
//     productImage:{
//         type:[String],
//         required :true
//     },
//     isListed:{
//         type:Boolean,
//         default:true
//     },
//     status:{
//         type:String,
//         enum:["Available","out of stock","Discountinued"],
//         required:true,
//         default:"Available"
//     },
//     variants:[
//        { ram:{
//             type:String,
//             required:false,
//         },
//         storage:{
//             type:String,
//             required:false
//         },
//         processor:{
//             type:String,
//             requried:false
//         },
//         stock:{
//             type:Number,
//             requried:false,
//             defualt:0
//         },
//         price:{
//             type:Number,
//             required:false
//         }
// }],
// },{timestamps:true})
// const Product=mongoose.model("Product",productSchema);
// module.exports=Product;


const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    productName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    // brand: {
    //   type: String,
    //   // required: true,
    // },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
   
    productOffer: {
      type: Number,
      default: 0,
    },
  
    
    productImage: {
      type: [String],
      required: true,
    },
    isListed: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['Available', 'out of stock', 'Discontinued'], // Corrected 'Discountinued' to 'Discontinued'
      required: true,
      default: 'Available',
    },
    variants: [
      {
        ram: {
          type: String,
          required: false,
        },
        storage: {
          type: String,
          required: false,
        },
        processor: {
          type: String,
          required: false, // Corrected 'requried' to 'required'
        },
        stock: {
          type: Number,
          required: false, // Corrected 'requried' to 'required'
          default: 0, // Corrected 'defualt' to 'default'
        },
        price: {
          type: Number,
          required: false,
        },
        // quantity: {
        //     type: Number,
        //     default: 1, // Changed from 'true' to '1' as 'quantity' should be a number
        //   },
          regularPrice: {
            type: Number,
            required: true,
          },
          salePrice: {
            type: Number,
            required: true,
          },
      },
    ],
  },
  { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
