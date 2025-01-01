
const button = document.getElementById('submit');

button.addEventListener('click', async (e) => {
    // e.preventDefault(); // Prevent default form submission behavior if used within a form

    const name = document.getElementById('name').value;
    const description = document.getElementById('description').value;

    try {
        const response = await fetch('/admin/addCategory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description }),
        });

        if (!response.ok) {
            // Handle error response
            const result = await response.json();
            
            alert(`Error: ${result.message || 'Failed to add category'}`);
        } else {
            // Handle success response
            const result = await response.json();
            Swal.fire({ 
                icon: "success",
                title:result.message,
                showConfirmButton: false,
                timer: 2000})
            // location.reload()
           
        }
    } catch (error) {
        alert(`Error: ${error.message || 'An error occurred'}`);
    }
});
