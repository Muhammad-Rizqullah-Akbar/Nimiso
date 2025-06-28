// index.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Sidebar & Navigasi ---
    const categoriesDropdownToggle = document.getElementById('categoriesDropdownToggle');
    const categoriesDropdownMenu = document.getElementById('categoriesDropdownMenu');
    const categoriesDropdownWrapper = categoriesDropdownToggle.closest('.nav-item-wrapper');
    const nimisoLogo = document.querySelector('.logo');
    const manageAdminLink = document.getElementById('manageAdminLink');
    const logoutButton = document.getElementById('logoutButton');
    const categoryBoxesSection = document.querySelector('.category-boxes');

    // --- Statistik Elements ---
    const totalItemsElement = document.getElementById('totalItems');
    const totalProductsElement = document.getElementById('totalProducts');
    const totalCategoriesElement = document.getElementById('totalCategories');

    // --- Modal Elements ---
    const addCategoryModal = document.getElementById('addCategoryModal');
    const closeAddCategoryModalButton = document.getElementById('closeAddCategoryModalButton');
    const addCategoryForm = document.getElementById('addCategoryForm');
    const newCategoryNameInput = document.getElementById('newCategoryName');
    const addNewCategoryLink = document.querySelector('.add-new-category');
    
    // ** MODAL DELETE CATEGORY ELEMENTS (BARU) **
    const deleteCategoryConfirmModal = document.createElement('div');
    deleteCategoryConfirmModal.id = 'deleteCategoryConfirmModal';
    deleteCategoryConfirmModal.classList.add('modal');
    deleteCategoryConfirmModal.innerHTML = `
        <div class="modal-content small-modal">
            <p>Delete category <span id="categoryToDeleteName" class="highlight-text"></span>?</p>
            <div class="confirm-buttons">
                <button id="confirmCategoryDeleteYes" class="confirm-button yes-button">Yes</button>
                <button id="confirmCategoryDeleteNo" class="confirm-button no-button">No</button>
            </div>
        </div>
    `;
    document.body.appendChild(deleteCategoryConfirmModal);
    const categoryToDeleteNameSpan = document.getElementById('categoryToDeleteName');
    const confirmCategoryDeleteYesButton = document.getElementById('confirmCategoryDeleteYes');
    const confirmCategoryDeleteNoButton = document.getElementById('confirmCategoryDeleteNo');
    let categoryToDeleteId = null;
    const currentUserRole = window.currentUserRole; // Ambil role dari window

    // --- Notification Elements ---
    const notificationToast = document.getElementById('notificationToast');
    const notificationMessage = document.getElementById('notificationMessage');
    let notificationTimeout;
    
    // --- Global Utility Functions ---
    function showNotification(message, duration = 2000) {
        clearTimeout(notificationTimeout);
        notificationMessage.textContent = message;
        notificationToast.classList.add('show');
        notificationTimeout = setTimeout(() => {
            notificationToast.classList.remove('show');
        }, duration);
    }
    
    function closeAllModals() {
        if (addCategoryModal) addCategoryModal.classList.remove('show-modal');
        if (deleteCategoryConfirmModal) deleteCategoryConfirmModal.classList.remove('show-modal');
    }

    // --- Fetch Categories and render sidebar/boxes ---
    async function fetchAndRenderCategories() {
        try {
            const response = await fetch('/api/categories');
            const categoriesData = await response.json();
            
            renderSidebarCategoriesIndex(categoriesData);
            renderCategoryBoxes(categoriesData);

        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }

    // --- Fetch Statistics ---
    async function fetchAndUpdateStatistics() {
        try {
            const response = await fetch('/api/statistics'); 
            const stats = await response.json();
            
            if (totalItemsElement) totalItemsElement.textContent = stats.total_items.toLocaleString();
            if (totalProductsElement) totalProductsElement.textContent = stats.total_products.toLocaleString();
            if (totalCategoriesElement) totalCategoriesElement.textContent = stats.total_categories.toLocaleString();
        } catch (error) {
            console.error('Error fetching statistics:', error);
        }
    }

    // --- FUNGSI BARU/DIUBAH: Menambahkan ikon hapus ke sidebar ---
    function renderSidebarCategoriesIndex(categories) {
        const dropdownMenu = document.getElementById('categoriesDropdownMenu');
        const addNewCategoryListItem = dropdownMenu.querySelector('.add-new-category')?.closest('li');
        dropdownMenu.innerHTML = '';
        
        categories.forEach(cat => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `/categories?category=${cat.name.toLowerCase().replace(/\s/g, '')}`; 
            a.dataset.category = cat.name.toLowerCase().replace(/\s/g, '');
            a.textContent = cat.name;
            a.classList.add('category-nav-link'); // Tambahkan class untuk target event listener
            
            li.appendChild(a);

            // Tambahkan ikon hapus jika role adalah supervisor
            if (currentUserRole === 'supervisor') {
                const deleteIcon = document.createElement('i');
                deleteIcon.classList.add('fas', 'fa-trash-alt', 'delete-category-icon');
                deleteIcon.dataset.categoryId = cat.id;
                deleteIcon.dataset.categoryName = cat.name;
                li.appendChild(deleteIcon);
            }

            dropdownMenu.appendChild(li);
        });

        if (addNewCategoryListItem) {
            dropdownMenu.appendChild(addNewCategoryListItem);
            // Tambahkan event listener untuk link "Add New Categories"
            const addLink = addNewCategoryListItem.querySelector('a');
            if (addLink) {
                addLink.addEventListener('click', (event) => {
                    event.preventDefault();
                    window.location.href = '/categories?action=add-new-category';
                });
            }
        }

        // Attach event listeners untuk elemen yang baru dirender
        dropdownMenu.querySelectorAll('li a.category-nav-link').forEach(item => {
            item.addEventListener('click', handleCategoryNavLinkClick);
        });
        dropdownMenu.querySelectorAll('.delete-category-icon').forEach(icon => {
            icon.addEventListener('click', handleDeleteCategoryClick);
        });
    }
    
    function renderCategoryBoxes(categories) {
        categoryBoxesSection.innerHTML = '';
        categories.forEach(cat => {
            const categoryBox = document.createElement('div');
            categoryBox.classList.add('category-box');
            let iconClass = 'fas fa-tag';
            if (cat.name.toLowerCase() === 'accessories') iconClass = 'fas fa-gem';
            else if (cat.name.toLowerCase() === 'electronics') iconClass = 'fas fa-laptop';
            else if (cat.name.toLowerCase() === 'toys') iconClass = 'fas fa-robot';
            else if (cat.name.toLowerCase() === 'stationery') iconClass = 'fas fa-pencil-ruler';

            categoryBox.innerHTML = `
                <i class="${iconClass} category-icon"></i>
                <div class="category-label">${cat.name}</div>
            `;
            categoryBox.addEventListener('click', () => {
                 // PASTIKAN INI MENGARAH KE ROUTE FLASK
                 window.location.href = `/categories?category=${cat.name.toLowerCase().replace(/\s/g, '')}`;
            });
            categoryBoxesSection.appendChild(categoryBox);
        });
    }

    // --- Event Handler untuk link kategori di sidebar ---
    function handleCategoryNavLinkClick(event) {
        event.preventDefault();
        const categoryName = event.target.dataset.category;
        window.location.href = `/categories?category=${categoryName}`;
    }

    // --- MODAL DELETE CATEGORY LOGIC (BARU) ---
    function handleDeleteCategoryClick(event) {
        event.preventDefault();
        event.stopPropagation();
        closeAllModals();
        
        categoryToDeleteId = event.target.dataset.categoryId;
        const categoryName = event.target.dataset.categoryName;
        
        categoryToDeleteNameSpan.textContent = categoryName;
        deleteCategoryConfirmModal.classList.add('show-modal');
    }

    if (confirmCategoryDeleteYesButton) {
        confirmCategoryDeleteYesButton.addEventListener('click', async () => {
            if (categoryToDeleteId) {
                try {
                    const response = await fetch(`/api/category/${categoryToDeleteId}`, {
                        method: 'DELETE'
                    });
                    const result = await response.json();
                    
                    if (response.ok) {
                        showNotification(result.message);
                        closeAllModals();
                        // Muat ulang sidebar setelah penghapusan
                        fetchAndRenderCategories();
                    } else {
                        showNotification(result.error || 'Gagal menghapus kategori.');
                    }
                } catch (error) {
                    console.error('Error deleting category:', error);
                    showNotification('Terjadi kesalahan jaringan.');
                }
            }
        });
    }

    if (confirmCategoryDeleteNoButton) confirmCategoryDeleteNoButton.addEventListener('click', closeAllModals);
    if (deleteCategoryConfirmModal) {
        deleteCategoryConfirmModal.addEventListener('click', (event) => {
            if (event.target === deleteCategoryConfirmModal) { closeAllModals(); }
        });
    }

    // --- Sidebar Dropdown Logic ---
    if (categoriesDropdownToggle && categoriesDropdownMenu && categoriesDropdownWrapper) {
        categoriesDropdownToggle.addEventListener('click', () => {
            categoriesDropdownMenu.classList.toggle('show');
            categoriesDropdownToggle.classList.toggle('active');
            categoriesDropdownWrapper.classList.toggle('active');
        });

        document.addEventListener('click', (event) => {
            const sidebar = document.querySelector('.sidebar');
            if (!sidebar.contains(event.target)) {
                categoriesDropdownMenu.classList.remove('show');
                categoriesDropdownToggle.classList.remove('active');
                categoriesDropdownWrapper.classList.remove('active');
            }
        });
    }

    // --- Modal Add Category Logic ---
    if (addNewCategoryLink) {
        addNewCategoryLink.addEventListener('click', (event) => {
            event.preventDefault();
            if (addCategoryModal) {
                addCategoryForm.reset();
                addCategoryModal.classList.add('show-modal');
            }
        });
    }

    if (closeAddCategoryModalButton) {
        closeAddCategoryModalButton.addEventListener('click', closeAllModals);
    }
    
    if (addCategoryModal) {
        addCategoryModal.addEventListener('click', (event) => {
            if (event.target === addCategoryModal) {
                closeAllModals();
            }
        });
    }

    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const newCategoryName = newCategoryNameInput.value.trim();
            if (!newCategoryName) {
                showNotification("Nama kategori tidak boleh kosong!");
                return;
            }

            try {
                const response = await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newCategoryName })
                });
                const result = await response.json();
                
                if (response.ok) {
                    showNotification(result.message);
                    closeAllModals();
                    fetchAndRenderCategories(); // Re-render sidebar and boxes
                } else {
                    showNotification(result.error || 'Gagal menambahkan kategori.');
                }
            } catch (error) {
                console.error('Error adding category:', error);
                showNotification('Terjadi kesalahan jaringan.');
            }
        });
    }

    // --- Navigasi & Logout ---
    // PASTIKAN INI MENGARAH KE ROUTE FLASK
    nimisoLogo.addEventListener('click', () => { window.location.href = '/index'; });
    // PASTIKAN INI MENGARAH KE ROUTE FLASK
    manageAdminLink.addEventListener('click', (event) => { event.preventDefault(); window.location.href = '/adminmanage'; });
    
    if (logoutButton) {
        logoutButton.addEventListener('click', (event) => {
            event.preventDefault();
            // PASTIKAN INI MENGARAH KE ROUTE FLASK
            window.location.href = '/logout';
        });
    }

    // --- Initial Load ---
    fetchAndRenderCategories();
    fetchAndUpdateStatistics();
});