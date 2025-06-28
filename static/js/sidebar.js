document.addEventListener('DOMContentLoaded', function() {
    const categoriesMenu = document.getElementById('categories-menu');
    
    // Pastikan elemennya ada di halaman sebelum menambahkan event listener
    if (categoriesMenu) {
        const menuLabel = categoriesMenu.querySelector('.menu-label');

        if (menuLabel) {
            menuLabel.addEventListener('click', function(event) {
                // Mencegah navigasi jika ada link di dalam menu-label
                event.preventDefault(); 
                categoriesMenu.classList.toggle('active');
            });
        }
    }

    // Opsi tambahan: menutup dropdown jika klik di luar area menu
    document.addEventListener('click', function(event) {
        // Cek dulu apakah categoriesMenu ada dan event.target bukan bagian dari menu
        const categoriesMenuElement = document.getElementById('categories-menu');
        if (categoriesMenuElement && !categoriesMenuElement.contains(event.target)) {
            categoriesMenuElement.classList.remove('active');
        }
    });
});