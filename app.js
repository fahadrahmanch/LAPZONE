const express=require("express");
const session = require('express-session');
const nocache = require("nocache");
const app=express()
const path=require("path")
const userRouter=require("./routes/userRouter")
const adminRouter=require("./routes/adminRouter.js")
const db=require("./config/db") 

const passport=require("./config/passport")
// const fileUpload=require('express-fileupload')
const { userAuth,  } = require('./middlewares/auth');
db()
app.use(nocache());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.set("view engine","ejs");

app.use(express.static(path.join(__dirname,"public")))
app.set("views",[path.join(__dirname,"views")])
// app.use(fileUpload())
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(session({
    secret: process.env.your_secret_key, // You can change this to any secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false ,httpOnly:true,maxAge:72*60*60*1000} // Set to true if using HTTPS
  }));
  app.use('/video', express.static(path.join(__dirname, 'public/videos'), {
    setHeaders: (res) => {
      res.setHeader('Content-Type', 'video/mp4');
    }
  }));
// app.set("views",[path.join(__dirname,"views.user"),path.join(__dirname,"views.admin")])
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(passport.initialize())
app.use(passport.session())
app.use("/",userRouter)
app.use('/admin',adminRouter)
app.use(userAuth)
app.listen(process.env.PO_RT,()=>{
    console.log("server is running")
})
module.exports=app
