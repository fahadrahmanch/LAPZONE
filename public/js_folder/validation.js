document.addEventListener('DOMContentLoaded', function() {
    // Signup form validation

    const signupform = document.getElementById('signupForm');// Prevent form submission
    if (signupform) {
    signupform.addEventListener('submit', (event) => {
      
        if (!validateUsername() | !validateEmail() | !validatePassword() | !validateMobile()|!validateConfirmPassword()) {
          event.preventDefault(); // Prevent form submission if validation fails
        }
      });
    }
  })

    // User Login form validation

    const userloginform = document.getElementById("userloginForm");// Prevent form submission
    if (userloginform) { 
    userloginform.addEventListener('submit', (event) => {
    
        if (!validateEmail() | !validatePassword()) {
          event.preventDefault(); // Prevent form submission if validation fails
        }
      });
    }

    // Admin Login form validation

    const adminloginform = document.getElementById("adminloginForm");// Prevent form submission
    if (adminloginform) { 
    adminloginform.addEventListener('submit', (event) => {
    // console.log("vannallo!...")
        if (!validateEmail() | !validatePassword()) {
          event.preventDefault(); // Prevent form submission if validation fails
        }
      });
    }

   





      function validateUsername(){
      let isValid = true;
      
        let username = document.getElementById('name');
        let usernameError = document.getElementById('name_error');
        name_error.textContent = "";
        //Username validation
        if (username.value.trim() === "") {
           name_error.textContent = "Username is required.";
           isValid = false;
         }else if (username.value.trim().length < 3) {
           name_error.textContent = "Username must be at least 3 characters.";
           isValid = false;
        }
        return isValid;
      } 
    
      function validateEmail(){
        let isValid = true;
        const emailPattern = /^([a-z0-9_\.\-])+@([a-z0-9_\.\-])+\.([a-z]{2,4})$/;
        let email = document.getElementById('email');
        let email_error = document.getElementById('email_error');
        email_error.textContent = "";
        // Email validation
        if (email.value.trim() === "") {
          email_error.textContent = "Email is required.";
          isValid = false;
        } else if (!emailPattern.test(email.value)) {
          email_error.textContent = "E-mail is not in the correct format.";
          isValid = false;
        }
        return isValid;
      }
    
      function validatePassword(){
        let isValid = true;
        let password = document.getElementById('password');
        let passwordError = document.getElementById('password_error');
        passwordError.textContent = "";
        // Password validation
        if (password.value.trim() === "") {
          passwordError.textContent = "Password is required.";
          isValid = false;
        } else if (password.value.trim().length < 6) {
          passwordError.textContent = "Password must be at least 6 characters.";
          isValid = false;
        }
        return isValid;
      }
    
      function validateMobile(){
        let isValid = true;
        const mobilePattern = /^[0-9]{10}$/; // Simple mobile number validation (10 digits)
        let mobile = document.getElementById('phone');
        let mobileError = document.getElementById('phone_error');
        mobileError.textContent = "";
        // Mobile validation
        if (mobile.value.trim() === "") {
          mobileError.textContent = "Mobile number is required.";
          isValid = false;
        } else if (!mobilePattern.test(mobile.value)) {
          mobileError.textContent = "Enter a valid 10-digit mobile number.";
          isValid = false;
        }
        return isValid;
      }
      function validateConfirmPassword(){
        let isValid=true;
        let password=document.getElementById('password')
        const confirmpassword=document.getElementById('confirmpassword')
        let confirmpassword_error=document.getElementById("confirmpassword_error")
        confirmpassword_error.innerHTML='';
        if(password.value!=confirmpassword.value){
          confirmpassword_error.innerHTML='password do not match'
          isValid=false
           
        }  else if(confirmpassword.value.trim()==''||confirmpassword.value.trim()==null){
          confirmpassword_error.innerHTML='confirm password is required';
           isValid=false
          }
          return isValid
      };

     