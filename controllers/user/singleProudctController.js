const Category = require("../../models/categorySchema");
const productSchema = require("../../models/productSchema");
const wishlistSchema = require("../../models/WhislistSchema");
const Cart = require("../../models/cartSchema");

//load single product page

const loadSingleProduct = async (req, res) => {
  try {
    const productId = req.query.id;
    const userId = req.session.user||null;
    const product = await productSchema
      .findById(productId)
      .populate("category");
    const findCategory = product.category;
    const relatedProducts = await productSchema
      .find({
        category: findCategory._id,
        _id: { $ne: productId },
      })
      .populate("category")
      .limit(5);
      const relatedProductsWithOffer = relatedProducts.map((relatedProduct) => {
        let bestoffer =
          relatedProduct.productOffer > relatedProduct.category.categoryOffer
            ? relatedProduct.productOffer
            : relatedProduct.category.categoryOffer;
        
        const productData = JSON.parse(JSON.stringify(relatedProduct.toObject()));
        productData.bestoffer = bestoffer;
  
        if (bestoffer > 0) {
          productData.variants.forEach((variant) => {
            variant.salePrice = variant.salePrice - variant.salePrice * (bestoffer / 100);
          });
        }
  
        return productData;
      });
    console.log("relatedproducts",relatedProducts)
    const userWishlist = await wishlistSchema.findOne({ userId });
    const productWithOffer = JSON.parse(JSON.stringify(product.toObject()));
    
    let bestoffer;
    if (productWithOffer.productOffer > productWithOffer.category.categoryOffer) {
      bestoffer = productWithOffer.productOffer;
      productWithOffer.bestoffer=bestoffer
    } else {
      bestoffer = productWithOffer.category.categoryOffer;
      productWithOffer.bestoffer=bestoffer
    }

    if (bestoffer > 0) {
      productWithOffer.variants.map((item) => {
        item.salePrice = item.salePrice - item.salePrice * (bestoffer / 100);
        
      });
    }

    productWithOffer.variants.forEach((item) => {
      const variantId = item._id;

      const iswish =
        userWishlist?.products?.some(
          (wishlistItem) =>
            wishlistItem.variants.toString() === variantId.toString()
        ) || false;
      if (iswish) {
        for (let key of productWithOffer.variants) {
          if (key._id === variantId) {
            for (let k in key) {
              key.isInwishlist = true;
            }
          } else {
            key.isInwishlist = false;
          }
        }
      } else {
      }
    });
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    res.render("user/singleProduct", {
      products: productWithOffer,
      relatedProducts: relatedProductsWithOffer || [],
      message: req.session.user||"",
      cart: cart || { items: [] },
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = { loadSingleProduct };
