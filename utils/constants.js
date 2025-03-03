const Errors = {
  nameAlreadyExists: new Error("this coupen already exists"),
};

const MESSAGES = {
  coupenMustAllfields: "coupen must be all fields",
  USER_ALREADY_EXISTS: "User already exists with this email",
  USER_NOT_FOUND: "User not found",
  EDIT_USER_SUCCESS: "Edit user successfully",
  EDIT_USER_FAILED: "Edit user is failed",
  OLD_PASSWORD_INCORRECT: "Old password is incorrect",
  PASSWORD_CHANGED_SUCCESS: "Password changed successfully!",
  INTERNAL_SERVER_ERROR: "Internal server error. Please try again later.",
  USER_NOT_LOGGED_IN: "User not logged in",
  ALL_FIELDS_REQUIRED: "All fields are required",
  ADDRESS_NOT_FOUND: "Address not found",
  EMAIL_NOT_FOUND: "Email not found",
  EMAIL_ERROR: "Email error",
  OTP_VERIFIED_SUCCESS: "OTP verified successfully",
  INVALID_OTP: "Invalid OTP. Please try again.",
  ADDRESS_PAYMENT_REQUIRED: "Address and payment method are required.",
  COD_NOT_AVAILABLE:
    "Cash on Delivery is not available for orders above Rs 1000.",
  CART_EMPTY: "Your cart is empty.",
  SOMETHING_WENT_WRONG: "An error occurred",
  INVALID_REQUEST: "Invalid request",
  EMAIL_SEND_ERROR: "Error sending email",
  OTP_SENT_SUCCESS: "OTP sent successfully",

  // Payment Messages
  PAYMENT_VERIFIED: "Payment successfully verified.",
  PAYMENT_VERIFICATION_FAILED:
    "Payment verification failed. Invalid signature.",
  PAYMENT_VERIFICATION_ERROR: "An error occurred while verifying the payment.",
  MISSING_PAYMENT_DETAILS: "Missing payment details.",
  INVALID_PAYMENT_SIGNATURE: "Invalid payment signature.",

  // Order Messages
  ORDER_NOT_FOUND: "Order not found.",
  ORDER_CANCELLED_SUCCESS: "Order cancelled successfully.",
  INSUFFICIENT_WALLET_BALANCE: "Insufficient wallet balance.",
  PRODUCT_RETURN_SUCCESS: "Product return request successful.",
  PRODUCT_RETURN_FAILED: "Failed to process return request.",

  // Wishlist Messages
  WISHLIST_FETCH_FAILED: "Failed to fetch wishlist",
  WISHLIST_NOT_FOUND: "Wishlist not found",
  PRODUCT_ALREADY_IN_WISHLIST: "Product already in wishlist",
  PRODUCT_ADDED_TO_WISHLIST: "Product added to wishlist",
  FAILED_TO_ADD_TO_WISHLIST: "Failed to add to wishlist",
  PRODUCT_NOT_FOUND_IN_WISHLIST: "Product not found in the wishlist",
  VARIANT_REMOVED_FROM_WISHLIST: "Variant removed from wishlist",
  VARIANT_NOT_FOUND_IN_WISHLIST: "Variant not found in the wishlist",
  PRODUCT_REMOVED_FROM_WISHLIST: "Product removed from wishlist",

  //admin side messages

  USER_STATUS_UPDATED: (status) => `User successfully ${status}`,

  //brand
  BRAND_NOT_FOUND: "Brand not found",

  //CATEGORY
  CATEGORY_ALREADY_EXISTS: "Category already exists",
  CATEGORY_NOT_FOUND: "Category not found",
  CATEGORY_EXISTS: "Category exists, please choose another name",
  USER_ID_ACTION_REQUIRED: "User ID and action are required",
  CATEGORY_STATUS_UPDATED: (status) => `Category successfully ${status}`,
  INVALID_CATEGORY_NAME: "Invalid category name",


  // Order Messages
  FAILED_TO_LOAD_ORDERS: "Failed to load orders",
  ORDER_NOT_FOUND: "Order not found",
  ORDER_ID_REQUIRED: "Order ID is required.",
  ORDER_STATUS_CANNOT_BE_CHANGED: (status) =>
    `The order status cannot be changed because it is already "${status}".`,
  ORDER_STATUS_CHANGED_SUCCESS: "The order status changed successfully",
  RETURN_REQUEST_APPROVED: "Return request approved.",
  ERROR_APPROVING_RETURN_REQUEST: "Error approving return request.",
  REQUEST_REJECTED: "Request rejected",




   // Product Messages
   PRODUCT_ALREADY_EXISTS: "Product already exists, please try with another name.",
   PRODUCT_NAME_EXISTS: "Product with this name exists. Please try with another name.",
   PRODUCT_NOT_FOUND: "Product not found",
   INVALID_PRODUCT_ID: "Product ID action is required",
   NO_FILES_UPLOADED: "No files uploaded.",
   PRODUCT_ADD_ERROR: "An error occurred while adding the product.",
   PRODUCT_UPDATE_ERROR: "An error occurred while updating the product.",
   PRODUCT_STATUS_UPDATED: (status) => `Product successfully ${status}`,
};




const STATUS_CODES = {
  // Success Codes
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Redirection Codes
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // Client Error Codes
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,

  // Server Error Codes
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

const CART = {
  LOGIN_REQUIRED: "Please login to add products to the cart",
  PRODUCT_OUT_OF_STOCK: "Product is out of stock",
  INVALID_QUANTITY: "Invalid quantity",
  MAX_QUANTITY_EXCEEDED: "Maximum 5 items allowed per product",
  ONLY_FEW_LEFT: (productQty) => `Only ${productQty} items available in stock`,
  PRODUCT_ADDED: "Product added to cart successfully",
  QUANTITY_LIMIT: "Quantity must be between 1 and 5",
  PRODUCT_NOT_FOUND: "Product not found in cart.",
  CART_NOT_FOUND: "Cart or variant not found.",
  VARIANT_NOT_FOUND: "Product variant not found.",
  VARIANT_REMOVED: "Variant removed from cart.",

  ERROR: {
    INTERNAL_SERVER_ERROR: "Internal server error.",
  },
};

const ERROR = {
  INTERNAL_SERVER_ERROR: "Internal server error.",
};

// Coupon Messages
const DISCOUNT_MESSAGES = {
  MINIMUM_PURCHASE: (amount) =>
    `Minimum purchase amount of ₹${amount} is required`,
  DISCOUNT_EXCEEDS_TOTAL:
    "Discount amount cannot be greater than the total amount.",
};

module.exports = {
  Errors,
  MESSAGES,
  CART,
  STATUS_CODES,
  ERROR,
  DISCOUNT_MESSAGES,
};
