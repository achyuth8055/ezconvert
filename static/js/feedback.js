// Feedback Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('feedbackForm');
    const successMessage = document.getElementById('successMessage');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            category: document.getElementById('category').value,
            message: document.getElementById('message').value,
            type: 'feedback',
            timestamp: new Date().toISOString()
        };

        try {
            // Show loading state
            const submitBtn = form.querySelector('.btn-submit');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            // Send to server
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                // Hide form and show success message
                form.style.display = 'none';
                successMessage.classList.add('show');
            } else {
                throw new Error('Failed to submit feedback');
            }
        } catch (error) {
            console.error('Error:', error);
            NotificationModal.error('Sorry, there was an error submitting your feedback. Please try again.');
            
            // Reset button
            const submitBtn = form.querySelector('.btn-submit');
            submitBtn.textContent = 'Send Feedback';
            submitBtn.disabled = false;
        }
    });
});
