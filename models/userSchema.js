const mongoose=require("mongoose")
const {Schema}=mongoose;
const crypto = require("crypto"); 

const userSchema =new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    phone:{
        type:String,
        required:false,
        unique:false,
        sparse:true,
        default:null
    },
    googleId:{
        type:String,
        unique:true,
        sparse:true, 
        required:false
    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart"
    }],
    wallet:{
        type:Schema.Types.ObjectId,
        ref:"Wallet",
        // required:false,
    },
    wishlist:[{
        type:Schema.Types.ObjectId,
        ref:"wishlist"
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order"
    }],
    createdOn: {
        type: String,
        default: () => {
            const now = new Date();
            
            return now.toISOString().split('T')[0]; // Get the date part only
        },
        required: true,
    },
    referalCode:{
        type:String
    },
    referralOfferCode: { 
        type: String,
        unique: true
    },
   
    redeemed:{
        type:Boolean
    },
    redeemedUsers:[{
        type:Schema.Types.ObjectId,
        ref:"User"
    }],
    searchHistory:[{
        category:{
            type:Schema.Types.ObjectId,
            ref:"Category"
        },
        brand:{
            type:String
        },
        searchOn:{
            type:Date,
            default:Date.now
        }
    }]

})
userSchema.pre("save", function (next) {
    if (!this.referralOfferCode) {
        this.referralOfferCode = crypto.randomBytes(5).toString("hex").toUpperCase();
    }
    next();
});
const User=mongoose.model("User",userSchema);
module.exports=User;