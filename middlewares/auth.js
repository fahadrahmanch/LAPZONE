// const { session } = require("passport")

const User=require("../models/userSchema")

const userAuth = async (req,res,next)=>{
  
    try {
        // console.log("auth session", req.session)
        if(req.session.user){
            
          const user=await User.findById(req.session.user)
            if(user&& !user.isBlocked){
                res.locals.user =user
                return res.redirect("/");
                
            }
           
        }else{
            res.locals.user = null;
            return next()
        }
    } catch (error) {
        console.log('Error in user auth middleware', error);
        res.locals.user = null;
        return res.status(500).send('Internal server error')
    }

}

const checkSession=(req,res,next)=>{
    if(req.session.admin){
        next()
    }else{
        res.redirect('/admin/login')
    }
}
const  isLogin=(req,res,next)=>{
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    if(req.session.admin){
        
        res.redirect('/admin/dashboard')
    }else{
        
        next();
    }
}


module.exports={
    userAuth,
    checkSession,
    isLogin
}