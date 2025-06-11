async function initiatePayment(userId, amount) {
    try {
        const orderResponse = await fetch('/cart/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, amount })
        });
        if (!orderResponse.ok) throw new Error('Failed to create order');
        const order = await orderResponse.json();
        
        const options = {
            key: RAZORPAY_KEY_ID, // Use the injected variable
            amount: amount,
            currency: 'INR',
            name: 'Your Store',
            description: 'Shopping Cart Checkout',
            order_id: order.orderId,
            handler: async function (response) {
                const verifyResponse = await fetch('/cart/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        userId
                    })
                });
                if (verifyResponse.ok) {
                    alert('Payment successful! Order placed.');
                    window.location.href = '/my/order-success';
                } else {
                    alert('Payment verification failed.');
                }
            },
            prefill: {
                email: CURRENT_USER.email, // Use the injected variable
                contact: CURRENT_USER.mobile // Use the injected variable
            },
            theme: { color: '#28a745' }
        };
        const rzp = new Razorpay(options);
        rzp.open();
    } catch (error) {
        console.error('Error during payment:', error);
        alert('Something went wrong. Please try again.');
    }
}