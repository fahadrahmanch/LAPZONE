const calculateOffers = (cart) => {
    console.log(cart)
    return cart.items.map((item) => {
      const variant = item.productId.variants.find(
        (variant) => variant._id.toString() === item.variantId.toString()
      );
      delete item.variants;
      item.variant = variant;
  
      const categoryOffer = item.productId.category.categoryOffer;
      const productOffer = item.productId.productOffer;
      const bestOffer = Math.max(categoryOffer, productOffer);
      const originalPrice = item.variant.salePrice;
      const quantity = item.quantity;
      const discountedPrice = Number(originalPrice - (originalPrice * bestOffer) / 100);
  
      item.variant.salePrice = discountedPrice;
      item.totalPrice = Number(discountedPrice * quantity);
      item.discount = (originalPrice - discountedPrice) * quantity;
      
      return { ...item, bestOffer };
    });
  };
  module.exports={calculateOffers}