const product = require("../../models/productSchema");
const categorySchema = require("../../models/categorySchema");
const User = require("../../models/userSchema");

const loadShop = async (req, res) => {
  try {
    const search = req.query.search || "";
    console.log(search)
    const page = req.query.page || 1;
    const limit = 15;
     const sort = req.query.sort||""
     const catt=req.query.cat||"";
     console.log(catt)
    let sortCriteria={};
    switch (sort) {
        //  case 
        case "a-z":
          sortCriteria = { productName: 1 }; 
          break;
        case "z-a":
          sortCriteria = { productName: -1 }; 
          break;
        case "price-asc":
          sortCriteria = { "variants.salePrice": 1 };
          break;
        case "price-desc":
          sortCriteria = {  "variants.salePrice": -1 }; 
          break;
        // case "ratings":
        //   sortCriteria = { ratings: -1 }; 
        //   break;
        case "new-arrivals":
          sortCriteria = { createdAt: -1 }; 
          break;
        // // case "popularity":
        // default:
        //   sortCriteria = { salesCount: -1 }; 
      }
    // const count=await product.find({
    // productName:{$regex:new RegExp("."+search+".","i")}
    // }).countDocuments()
    let filterQuery = {
      isListed: true,
      productName: { $regex: new RegExp(".*" + search + ".*", "i") }, // Case-insensitive search
  };
  const count = await product.countDocuments(filterQuery);
    const products = await product.find(filterQuery).sort(sortCriteria).skip((page-1)*limit).limit(limit)
    const cat = await categorySchema.find({});
    res.render("user/Shop", {
      products: products,
      cat: cat,
      // search: search,
      message:req.session.user||null,
      limit:limit,
      currentPage:page,
      totalPages:Math.ceil(count/limit),
      
    });
  } catch (error) {
    console.log(error);
  }
};


module.exports = { loadShop};
