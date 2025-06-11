document.addEventListener('DOMContentLoaded', function () {
    const toasts = document.querySelectorAll('.flash-message');
    toasts.forEach((toast) => {
        setTimeout(() => {
            toast.style.opacity = 0;
            setTimeout(() => {
                toast.remove();
            }, 500);
        }, 2000);
    });
});