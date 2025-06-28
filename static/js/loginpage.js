document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessageDiv = document.getElementById('error-message');

    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Mencegah form submit default

        const username = usernameInput.value;
        const password = passwordInput.value;

        // Kirim data login ke backend Flask
        // Kita gunakan Fetch API untuk mengirim POST request ke endpoint /login
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const response = await fetch('/login', {
                method: 'POST',
                body: formData
            });

            // Flask akan menangani redirect, jadi kita hanya perlu cek respons
            if (response.redirected) {
                // Jika redirect berhasil, ikuti redirect-nya
                window.location.href = response.url;
            } else {
                // Jika tidak redirect, berarti login gagal
                errorMessageDiv.textContent = 'Nama pengguna atau kata sandi salah.';
                errorMessageDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Error:', error);
            errorMessageDiv.textContent = 'Terjadi kesalahan saat mencoba masuk. Silakan coba lagi.';
            errorMessageDiv.style.display = 'block';
        }
    });
});