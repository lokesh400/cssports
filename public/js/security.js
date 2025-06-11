// Disable Right Click
document.addEventListener("contextmenu", (event) => event.preventDefault());

// Disable DevTools (F12, Ctrl+Shift+I, Ctrl+U, etc.)
document.addEventListener("keydown", (event) => {
    if (
        event.keyCode === 123 || // F12
        (event.ctrlKey && event.shiftKey && (event.key === "I" || event.key === "J" || event.key === "C")) || // Ctrl+Shift+I, J, C
        (event.ctrlKey && event.key === "U") // Ctrl+U (View Source)
    ) {
        event.preventDefault();
    }
});

// Detect and Block DevTools
(function () {
    let threshold = 160;
    setInterval(() => {
        let widthThreshold = window.outerWidth - window.innerWidth > threshold;
        let heightThreshold = window.outerHeight - window.innerHeight > threshold;
        if (widthThreshold || heightThreshold) {
            window.location.href = "about:blank"; // Redirect to blank page
        }
    }, 1000);
})();