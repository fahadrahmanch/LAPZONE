const mongoose=require("mongoose");
const {Schema}=mongoose;
const coupenSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    createdOn: {
        type: String,
        default: () => {
            const now = new Date();
            
            return now.toISOString().split('T')[0]; // Get the date part only
        },
        required: true,
    },
    expireOn:{
         type: String,
        default: () => {
            const now = new Date();
            
            return String.toISOString().split('T')[0]; // Get the date part only
        },
        required: true,
    },
    offerPrice:{
        type:Number,
        required:true
    },
    minimumPrice:{
        type:Number,
        required:true
    },
    isList:{
        type:Boolean,
        default:true
    },
    userId:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    }]
})
const Coupen=mongoose.model("Coupen",coupenSchema);
module.exports=Coupen