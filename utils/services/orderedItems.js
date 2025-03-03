const orderedItem = (cart, discount) => {
  console.log("cart",cart)
    const orderItems = cart.items.map((item) => {
      return {
        Product: item.productId._id,
        quantity: item.quantity,
        price: item.variant.salePrice,
        totalPrice: item.variant.salePrice * item.quantity,
        variants: item.variant._id,
        totalDiscount: discount,
      };
    });
  
    return orderItems; 
  };
  
  module.exports = { orderedItem };
  