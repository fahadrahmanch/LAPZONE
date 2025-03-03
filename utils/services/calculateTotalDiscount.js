const calculateTotalDiscount = (items) => {
    return items.reduce((acc, item) => acc + (item.discount || 0), 0);
  };

module.exports={calculateTotalDiscount}