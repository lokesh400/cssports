async function initiatePayment(productId, amount, email) {
    const studentId = '<%=email%>'; // Replace with actual student ID

    // Create order on server
    const orderResponse = await fetch('/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, productId, email }) // Send email here
    });

    if (!orderResponse.ok) {
        const errorResponse = await orderResponse.json();
        alert(`Failed to create order: ${errorResponse.error || 'Unknown error'}`);
        console.error('Order creation error:', errorResponse);
        return;
    }

    const order = await orderResponse.json();

    const options = {
        key: '<%= keyId %>', // Razorpay Key ID
        amount: amount,
        currency: 'INR',
        name: 'My Store',
        description: 'Batch Enrollment',
        order_id: order.orderId, // Ensure this is passed correctly
        handler: async function (response) {
            console.log("🟢 Payment Successful! Response:", response);

            const verifyResponse = await fetch('/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    productId,   // Ensure this is included
                    email,       // Ensure this is included
                    amount,      // Ensure amount is correctly passed
                })
            });

            if (verifyResponse.ok) {
                window.location.href = '/my/order-success'; // Redirect to a confirmation page
            } else {
                const errorVerification = await verifyResponse.json();
                alert(`❌ Payment verification failed: ${errorVerification.message || 'Unknown error'}`);
            }
        },
        prefill: {
            name: '<%= currUser.name %>',
            email: '<%= email %>',
            contact: '<%= currUser.mobile %>'
        },
        theme: { color: '#3399cc' }
    };

    const rzp = new Razorpay(options);
    rzp.open();
}