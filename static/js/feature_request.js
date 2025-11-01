// Feature Request Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('featureForm');
    const successMessage = document.getElementById('successMessage');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            featureTitle: document.getElementById('featureTitle').value,
            priority: document.getElementById('priority').value,
            description: document.getElementById('description').value,
            useCase: document.getElementById('useCase').value,
            type: 'feature_request',
            timestamp: new Date().toISOString()
        };

        try {
            // Show loading state
            const submitBtn = form.querySelector('.btn-submit');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
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
                throw new Error('Failed to submit feature request');
            }
        } catch (error) {
            console.error('Error:', error);
            NotificationModal.error('Sorry, there was an error submitting your request. Please try again.');
            
            // Reset button
            const submitBtn = form.querySelector('.btn-submit');
            submitBtn.textContent = 'Submit Request';
            submitBtn.disabled = false;
        }
    });
});
