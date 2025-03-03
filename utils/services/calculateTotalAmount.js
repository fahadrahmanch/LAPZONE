const calculateTotalAmount = (items) => {
    return items.reduce((sum, item) => sum + item.quantity * item.variant.salePrice, 0);
  };

  module.exports={calculateTotalAmount}