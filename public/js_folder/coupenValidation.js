function validateForm() {
  let isValid = true;

  // Clear previous error messages
  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

  // Coupon Name Validation
  const couponNameInput = document.getElementById('coupon-name');
  const couponName = couponNameInput.value.trim();
  const couponNamePattern = /^[A-Za-z0-9]+$/; // Only letters and numbers
  if (!couponName) {
    document.getElementById('coupon-name-error').textContent = 'Coupon Name is required.';
    isValid = false;
  } else if (!couponNamePattern.test(couponName)) {
    document.getElementById('coupon-name-error').textContent = 
      'Only letters and numbers are allowed (no spaces or special characters).';
    isValid = false;
  }

  // Offer Price Validation
  const offerPriceInput = document.getElementById('offer-price');
  const offerPrice = parseFloat(offerPriceInput.value);
  if (!offerPriceInput.value) {
    document.getElementById('offer-price-error').textContent = 'Offer Price is required.';
    isValid = false;
  } else if (offerPrice <= 0) {
    document.getElementById('offer-price-error').textContent = 'Offer Price should be greater than zero.';
    isValid = false;
  }

  // Minimum Purchase Amount Validation
  const minPriceInput = document.getElementById('min-price');
  const minPrice = parseFloat(minPriceInput.value);
  if (!minPriceInput.value) {
    document.getElementById('min-price-error').textContent = 'Minimum Purchase Amount is required.';
    isValid = false;
  } else if (minPrice <= 0) {
    document.getElementById('min-price-error').textContent = 'Minimum Purchase Amount should be greater than zero.';
    isValid = false;
  } else if (minPrice <= offerPrice) { 
    document.getElementById('min-price-error').textContent = 'Minimum Purchase Amount must be greater than Offer Price.';
    isValid = false;
  }

  // Expiry Date Validation
  const expiryDateInput = document.getElementById('expiry-date');
  const expiryDateError = document.getElementById('expiry-date-error');
  const expiryDateValue = expiryDateInput.value;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Remove time part to compare only dates

  if (!expiryDateValue) {
    expiryDateError.textContent = 'Please select the expiry date.';
    isValid = false;
  } else {
    const selectedDate = new Date(expiryDateValue);
    if (selectedDate <= today) {
      expiryDateError.textContent = 'Expiry Date should be in the future.';
      isValid = false;
    }
  }

  return isValid; 
}
