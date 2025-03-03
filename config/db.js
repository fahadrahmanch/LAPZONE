const mongoose=require("mongoose");
const env =require("dotenv").config()
const connectDB= async()=>{
    try{
       await mongoose.connect(process.env.MONGODB_URI)
       console.log("Db connected")
    }
    catch(error){
       console.log("error")
       console.log(error)
       process.exit(1)
    }
}
module.exports=connectDB;
// const mongoose = require("mongoose");
// const dotenv = require("dotenv").config();

// const connectDB = async () => {
//   try {
//     console.log("MongoDB URI:", process.env.MONGODB_URI); // Debugging
//     await mongoose.connect(process.env.MONGODB_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//       serverSelectionTimeoutMS: 10000, // 10 seconds timeout
//     });
//     console.log("DB connected successfully ✅");
//   } catch (error) {
//     console.error("MongoDB connection error:", error);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;
