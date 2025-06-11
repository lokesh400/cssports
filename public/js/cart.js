async function updateQuantity(userId, productId, change) {
    try {
        const response = await fetch("/update-quantity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, productId, change })
        });

        if (response.ok) {
            window.location.reload(); // Reload page after update
        } else {
            const data = await response.json();
            alert(data.message || "Error updating quantity");
        }
    } catch (error) {
        console.error("Error updating cart:", error);
        alert("Something went wrong. Please try again.");
    }
}

async function deleteProduct(id) {
    try {
        const response = await fetch("/delete/this/product", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
        });

        if (response.ok) {
            window.location.reload(); // Reload page after update
        } else {
            const data = await response.json();
            alert(data.message || "Error updating quantity");
        }
    } catch (error) {
        console.error("Error updating cart:", error);
        alert("Something went wrong. Please try again.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    async function fetchDeliveryCharges() {
        try {
            const response = await fetch('/get/delivery/charges');
            if (!response.ok) throw new Error("Failed to fetch delivery charges");
            const data = await response.json();


            if (data.message) {
                // Handle case where no cart is found
                document.getElementById("deliveryChargeMessage").innerText =
                    data.message;
            } else {
                // Display the delivery charge
                document.getElementById("deliveryChargeMessage").innerText =
                    `₹${data.charge}`;
            }
        } catch (error) {
            console.error("Error fetching delivery charges:", error);
            document.getElementById("deliveryChargeMessage").innerText =
                "Failed to fetch delivery charges. Please try again later.";
        }
    }

    // Call the fetch function
    fetchDeliveryCharges();
});