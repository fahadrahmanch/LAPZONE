const categorySchema = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const { MESSAGES, STATUS_CODES, ERROR } = require("../../utils/constants");

// GET CATEGORY PAGE

const CategoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const categoryData = await categorySchema
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalCategories = await categorySchema.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);
    res.render("admin/categories", {
      cat: categoryData,
      currentPage: page,
      totalPages: totalPages,
      totalCategories: totalCategories,
    });
  } catch (error) {
    console.log(error);
    res.redirect();
  }
};

// ADD CATEGORY

const addCategory = async (req, res) => {
  const { name, description } = req.body;
  try {
    const existingCategory = await categorySchema.findOne({
      name: { $regex: `^${name}$`, $options: "i" } 
  });
    if (existingCategory) {
      
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ message: MESSAGES.CATEGORY_ALREADY_EXISTS });
    }
    const newCategory = new categorySchema({
      name,
      description,
    });
    await newCategory.save();
    return res
      .status(STATUS_CODES.OK)
      .json({ message: MESSAGES.CATEGORY_STATUS_UPDATED });
  } catch (error) {
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// ADD CATEGORY PAGE RENDER

const loadaddCategory = async (req, res) => {
  try {
    res.render("admin/addCategory");
  } catch (error) {
    console.log("error");
  }
};

//CATEGORY LIST AND UNLIST

const list = async (req, res) => {
  try {
    const { userId, action } = req.body;
    if (!userId || !action) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ messege: MESSAGES.USER_ID_ACTION_REQUIRED });
    }
    const category = await categorySchema.findById(userId);
    if (!category) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ message: MESSAGES.CATEGORY_NOT_FOUND });
    }
    category.isListed = action === "unlist";
    await category.save();
    const status = action === "list" ? "unlist" : "list";
    res
      .status(STATUS_CODES.OK)
      .json({ message: MESSAGES.CATEGORY_STATUS_UPDATED });
  } catch (error) {
    console.log(error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// EDIT CATEGORY PAGE RENDER

const editcategory = async (req, res) => {
  const categoryId = req.query.id;
  const category = await categorySchema.findOne({ _id: categoryId });

  const message = req.session.error || ''; 
  req.session.error = null; 

  res.render("admin/editCategories", { category, message });
};


// CATEGORY EDIT

const postcategory = async (req, res) => {
  try {
    const id = req.params.id;
    
    const { name, description } = req.body;
    const existingCategory = await categorySchema.findOne({ name: name });
    if (existingCategory&& existingCategory._id.toString() !== id) {
  
      req.session.error=MESSAGES.CATEGORY_ALREADY_EXISTS

     return res.redirect(`/admin/editCategory?id=${id}`)
    }
    const updateCategory = await categorySchema.findByIdAndUpdate(
      id,
      {
        name: name,
        description: description,
      },
      { new: true }
    );
    if (updateCategory) {
      res.redirect("/admin/categories");
    } else {
      req.session.error=MESSAGES.CATEGORY_ALREADY_EXISTS
    }
  } catch (error) {
    console.log(error)
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ error: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// CATEGORY SEARCH

const categorySearch = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
    const limit = 6;
    const cat = await categorySchema
      .find({
        $or: [{ name: { $regex: ".*" + search + ".*" } }],
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await categorySchema
      .find({
        $or: [{ name: { $regex: ".*" + search + ".*" } }],
      })
      .countDocuments();
    const totalPages = Math.ceil(count / limit);
    const currentPage = page;
    res.render("admin/categories", { cat, totalPages, currentPage });
  } catch (error) {}
};

// CATEGORY OFFER

const addOffer = async (req, res) => {
  try {
    const { categoryId, offerPercentage } = req.body;
    const admin = req.session.admin;
    if (!admin) {
      return res.redirect("/admin/login");
    }
    if (!categoryId && !offerPercentage) {
      return res.json({ success: false });
    }
    const category = await categorySchema.findOne({ _id: categoryId });
    category.categoryOffer = offerPercentage;
    const product = await Product.find({ category: categoryId });
    await category.save();
    return res.json({ success: true });
  } catch (error) {
    console.log(error);
  }
};

// CATEGORY OFFER REMOVE

const removeCatOffer = async (req, res) => {
  try {
    const { categoryId } = req.body;
    const admin = req.session.admin;
    if (!admin) {
      return res.redirect("/admin/login");
    }
    const category = await categorySchema.findOne({ _id: categoryId });
    category.categoryOffer = 0;
    await category.save();
    return res.json({ success: true });
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  CategoryInfo,
  categorySchema,
  addCategory,
  loadaddCategory,
  list,
  editcategory,
  postcategory,
  categorySearch,
  addOffer,
  removeCatOffer,
};
