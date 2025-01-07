const loadShop = async (req, res) => {
    try {
      const search = req.query.search || "";
      const page = req.query.page || 1;
      const limit = 15;
      const sort = req.query.sort || "";
      const catt = req.query.cat ? req.query.cat.split(',') : [];  // Get selected categories from query
      const priceMin = req.query.priceMin ? parseFloat(req.query.priceMin) : 0;  // Min price
      const priceMax = req.query.priceMax ? parseFloat(req.query.priceMax) : Infinity;  // Max price
  
      let sortCriteria = {};
      switch (sort) {
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
          sortCriteria = { "variants.salePrice": -1 };
          break;
        case "new-arrivals":
          sortCriteria = { createdAt: -1 };
          break;
      }
  
      // Build query to filter by category and price range
      let query = {
        productName: { $regex: new RegExp(".*" + search + ".*", "i") },
        "variants.salePrice": { $gte: priceMin, $lte: priceMax }
      };
  
      if (catt.length > 0) {
        query.category = { $in: catt };  // Filter by selected categories
      }
  
      // Count the total number of products based on the query
      const count = await product.find(query).countDocuments();
  
      // Fetch the filtered products with sorting and pagination
      const products = await product.find(query)
                                     .sort(sortCriteria)
                                     .skip((page - 1) * limit)
                                     .limit(limit);
  
      // Fetch categories for rendering in the frontend
      const categories = await categorySchema.find({});
  
      // Render the shop page with filtered products and categories
      res.render("user/Shop", {
        products: products,
        cat: categories,
        limit: limit,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        selectedCategory: catt  // Pass selected categories to highlight in the frontend
      });
    } catch (error) {
      console.log(error);
    }
  };
  