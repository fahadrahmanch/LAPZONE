        let countdown = 60; // Countdown in seconds

        const timerElement = document.getElementById('countdown');
        const resendButton = document.getElementById('resend_button');
        const confirmButton = document.getElementById('confirm-btn'); // Removed extra space in ID
        const otp_timer=document.getElementById('otp_timer')
        function updateTimer() {
            if (countdown > 0) {
                confirmButton.style.pointerEvents = "auto";
                confirmButton.style.opacity = "1";
                timerElement.textContent = countdown;

                otp_timer.textContent = `Expires in ${countdown} seconds`;
                
                countdown--;
                resendButton.style.pointerEvents = "none";
                resendButton.style.opacity = "0.6";
                setTimeout(updateTimer, 1000);
            } else {
                timerElement.textContent = "0";
                otp_timer.textContent='Resend otp'
                document.getElementById('otp_timer').style.display = 'none';
                resendButton.style.pointerEvents = "auto";
                resendButton.style.opacity = "1";
                confirmButton.style.pointerEvents = "none";
                confirmButton.style.opacity = "0.6";
            }
        }
    
        function verifyOTP(event) {
            event.preventDefault();
            console.log("Verify OTP triggered");
    
            const otp = document.getElementById('otp').value;
    
            $.ajax({
                type: "POST",
                url: "/otp",
                data: { otp: otp },
                success: function (response) {
                    if (response.success) {
                        Swal.fire({
                            icon: "success",
                            title: "OTP Verified Successfully",
                            showConfirmButton: false,
                            timer: 1500
                        }).then(() => {
                            window.location.href = response.redirectUrl;
                        });
                    } else {
                        Swal.fire({
                            icon: "error",
                            title: "Error",
                            text: response.message
                        });
                    }
                },
                error: function () {
                    Swal.fire({
                        icon: "error",
                        title: "Invalid OTP",
                        text: "Please try again"
                    });
                }
            });
    
            // Disable "Resend OTP" button
            // countdown = 0;
            // resendButton.style.pointerEvents = "none";
            // resendButton.style.opacity = "0.6";
    
            return false;
        }
    
        function sendOTP() {
            console.log("Resending OTP");
    
            $.ajax({
                type: "POST",
                url: "/resend-otp",
                success: function (response) {
                    if (response.success) {
                        countdown = 60; // Reset countdown
                        updateTimer();
                        document.getElementById("otp_timer").style.display = "block";
                        Swal.fire({
                            icon: "success",
                            title: "OTP Resent Successfully",
                            showConfirmButton: false,
                            timer: 1500
                        });
                    } else {
                        Swal.fire({
                            icon: "error",
                            title: "Error",
                            text: response.message
                        });
                    }
                },
                error: function () {
                    Swal.fire({
                        icon: "error",
                        title: "An error occurred",
                        text: "Please try again"
                    });
                }
            });
        }
    
        // Initialize the timer
        updateTimer();
