// categories.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Sidebar & Global Elements ---
    const categoriesDropdownToggle = document.getElementById('categoriesDropdownToggle');
    const categoriesDropdownMenu = document.getElementById('categoriesDropdownMenu');
    const categoriesDropdownWrapper = categoriesDropdownToggle.closest('.nav-item-wrapper');
    const nimisoLogo = document.querySelector('.logo');
    const manageAdminLink = document.getElementById('manageAdminLink');
    const categoryTitleElement = document.getElementById('categoryTitle');
    const productGridElement = document.getElementById('productGrid');
    
    // --- MENGGUNAKAN ROLE PENGGUNA DARI FLASK (Pastikan variabel ini disuntikkan di HTML) ---
    const currentUserRole = window.currentUserRole;
    console.log('Current User Role:', currentUserRole);

    // ** MODAL EDIT PRODUCT ELEMENTS **
    const editModal = document.getElementById('editModal');
    const closeEditModalButton = document.getElementById('closeEditModalButton');
    const decrementButton = document.getElementById('decrementStock');
    const incrementButton = document.getElementById('incrementStock');
    const stockChangeValueSpan = document.getElementById('stockChangeValue');
    const updateStockButton = document.getElementById('updateStockButton');
    const editProductNameDisplay = document.getElementById('editProductName');
    const editProductCurrentStockDisplay = document.getElementById('editProductCurrentStock');
    let currentProductData = null;
    let stockChange = 0;
    
    // ** MODAL DELETE PRODUCT ELEMENTS **
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const confirmDeleteYesButton = document.getElementById('confirmDeleteYes');
    const confirmDeleteNoButton = document.getElementById('confirmDeleteNo');
    let productToDeleteElement = null;

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

    // ** MODAL ADD NEW CATEGORY ELEMENTS **
    const addCategoryModal = document.getElementById('addCategoryModal');
    const closeAddCategoryModalButton = document.getElementById('closeAddCategoryModalButton');
    const addCategoryForm = document.getElementById('addCategoryForm');
    const newCategoryNameInput = document.getElementById('newCategoryName');
    const addNewCategoryLink = document.querySelector('.add-new-category');
    
    // ** MODAL ADD NEW PRODUCT ELEMENTS **
    const addProductModal = document.getElementById('addProductModal');
    const closeAddProductModalButton = document.getElementById('closeAddProductModalButton');
    const addProductForm = document.getElementById('addProductForm');
    const productNameInput = document.getElementById('productName');
    const productStockInput = document.getElementById('productStock');
    const productImageUrlInput = document.getElementById('productImageUrl');
    let currentCategoryForProductAdd = '';
    
    // ** NOTIFICATION TOAST ELEMENTS **
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
        editModal.classList.remove('show-modal');
        deleteConfirmModal.classList.remove('show-modal');
        addCategoryModal.classList.remove('show-modal');
        addProductModal.classList.remove('show-modal');
        deleteCategoryConfirmModal.classList.remove('show-modal');
    }

    // --- Fetch Categories and render sidebar ---
    async function fetchAndRenderSidebarCategories() {
        try {
            const response = await fetch('/api/categories');
            const categories = await response.json();
            const dropdownMenu = document.getElementById('categoriesDropdownMenu');
            const addNewCategoryListItem = dropdownMenu ? dropdownMenu.querySelector('.add-new-category')?.closest('li') : null;
            
            if (dropdownMenu) {
                dropdownMenu.innerHTML = '';
            
                categories.forEach(cat => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = `/categories?category=${cat.name.toLowerCase().replace(/\s/g, '')}`; 
                    a.dataset.category = cat.name.toLowerCase().replace(/\s/g, '');
                    a.textContent = cat.name;
                    a.classList.add('category-nav-link');
                    
                    // --- LOGIKA BARU: Tambahkan tombol hapus jika role = supervisor ---
                    if (currentUserRole === 'supervisor') {
                        const deleteIcon = document.createElement('i');
                        deleteIcon.classList.add('fas', 'fa-trash-alt', 'delete-category-icon');
                        deleteIcon.dataset.categoryId = cat.id;
                        deleteIcon.dataset.categoryName = cat.name;
                        li.appendChild(deleteIcon);
                    }
                    // --- AKHIR LOGIKA BARU ---

                    li.prepend(a);
                    dropdownMenu.appendChild(li);
                });

                if (addNewCategoryListItem) {
                    dropdownMenu.appendChild(addNewCategoryListItem);
                }
            
                // Attach event listeners for dynamic elements
                dropdownMenu.querySelectorAll('li a.category-nav-link').forEach(item => {
                    item.addEventListener('click', handleCategoryNavLinkClick);
                });
                // Attach event listener untuk ikon hapus
                dropdownMenu.querySelectorAll('.delete-category-icon').forEach(icon => {
                    icon.addEventListener('click', handleDeleteCategoryClick);
                });
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }

    // --- Event Handlers (BARU/DIPERBAIKI) ---
    function handleCategoryNavLinkClick(event) {
        event.preventDefault();
        const categoryName = event.target.dataset.category;
        loadProductsByCategory(categoryName);
        history.pushState({ category: categoryName }, '', `/categories?category=${categoryName}`); 
    }

    // --- MODAL DELETE CATEGORY LOGIC (BARU) ---
    function handleDeleteCategoryClick(event) {
        event.preventDefault();
        event.stopPropagation(); // Mencegah dropdown tertutup
        closeAllModals();
        
        categoryToDeleteId = event.target.dataset.categoryId;
        const categoryName = event.target.dataset.categoryName;
        
        categoryToDeleteNameSpan.textContent = categoryName;
        deleteCategoryConfirmModal.classList.add('show-modal');
    }

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
                    // Reload sidebar and products
                    fetchAndRenderSidebarCategories();
                    
                    // Arahkan ke kategori pertama atau tampilkan pesan jika tidak ada kategori
                    const responseCategories = await fetch('/api/categories');
                    const updatedCategories = await responseCategories.json();
                    if (updatedCategories.length > 0) {
                        const firstCategoryName = updatedCategories[0].name.toLowerCase().replace(/\s/g, '');
                        loadProductsByCategory(firstCategoryName);
                        history.replaceState({ category: firstCategoryName }, '', `/categories?category=${firstCategoryName}`);
                    } else {
                        categoryTitleElement.textContent = "Tidak Ada Kategori";
                        productGridElement.innerHTML = "<p>Silakan tambahkan kategori baru dari sidebar.</p>";
                    }

                } else {
                    showNotification(result.error || 'Gagal menghapus kategori.');
                }
            } catch (error) {
                console.error('Error deleting category:', error);
                showNotification('Terjadi kesalahan jaringan.');
            }
        }
    });

    confirmCategoryDeleteNoButton.addEventListener('click', closeAllModals);
    deleteCategoryConfirmModal.addEventListener('click', (event) => {
        if (event.target === deleteCategoryConfirmModal) { closeAllModals(); }
    });

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
                    fetchAndRenderSidebarCategories(); // Re-render sidebar
                    loadProductsByCategory(result.category.name.toLowerCase().replace(/\s/g, '')); // Load products for the new category
                    history.pushState({ category: result.category.name.toLowerCase().replace(/\s/g, '') }, '', `/categories?category=${result.category.name.toLowerCase().replace(/\s/g, '')}`);
                } else {
                    showNotification(result.error || 'Gagal menambahkan kategori.');
                }
            } catch (error) {
                console.error('Error adding category:', error);
                showNotification('Terjadi kesalahan jaringan.');
            }
        });
    }

    // --- Produk Logic (Load from API) ---
    async function loadProductsByCategory(categoryName) {
        productGridElement.innerHTML = '';
        const formattedCategoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
        categoryTitleElement.textContent = formattedCategoryName;
        currentCategoryForProductAdd = categoryName;

        try {
            const response = await fetch(`/api/products/${categoryName}`);
            const productsToDisplay = await response.json();
            
            if (productsToDisplay.length === 0) {
                productGridElement.innerHTML = `<p style="text-align: center; width: 100%; color: #7A695B;">Tidak ada produk untuk kategori ini.</p>`;
            } else {
                productsToDisplay.forEach(product => {
                    const productBox = document.createElement('div');
                    productBox.classList.add('product-box');
                    productBox.dataset.productId = product.id;
                    productBox.dataset.productCategory = categoryName;
                    
                    productBox.innerHTML = `
                        <i class="fas fa-trash-alt delete-product-icon" data-product-id="${product.id}"></i>
                        <div class="product-image">
                            <img src="${product.imageUrl}" alt="${product.name}">
                        </div>
                        <div class="product-label">${product.name}</div>
                        <div class="product-info-row">
                            <span class="product-stock">Stock: <span id="stock-${product.id}">${product.stock}</span></span>
                            <button class="edit-button" data-product-id="${product.id}">
                                Edit <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    `;
                    productGridElement.appendChild(productBox);
                });
            }

            const addProductButtonBox = document.createElement('div');
            addProductButtonBox.classList.add('add-product-button-box');
            addProductButtonBox.innerHTML = `
                <i class="fas fa-plus-circle"></i>
                <span>Add New Product</span>
            `;
            addProductButtonBox.addEventListener('click', openAddProductModal);
            productGridElement.appendChild(addProductButtonBox);

            attachProductEventListeners(); 
        } catch (error) {
            console.error('Error loading products:', error);
            productGridElement.innerHTML = `<p style="text-align: center; width: 100%; color: #DC3545;">Gagal memuat produk. Terjadi kesalahan jaringan.</p>`;
        }
    }
    
    function attachProductEventListeners() {
        document.querySelectorAll('.edit-button').forEach(button => {
            button.addEventListener('click', handleEditButtonClick);
        });
        document.querySelectorAll('.delete-product-icon').forEach(icon => {
            icon.addEventListener('click', handleDeleteIconClick);
        });
    }

    function handleEditButtonClick(event) {
        const productId = event.currentTarget.dataset.productId;
        const productCategory = event.currentTarget.closest('.product-box').dataset.productCategory;
        const stockElement = event.currentTarget.closest('.product-info-row').querySelector('.product-stock span');
        const nameElement = event.currentTarget.closest('.product-box').querySelector('.product-label');
        
        currentProductData = {
            id: productId,
            category: productCategory,
            name: nameElement.textContent,
            stock: parseInt(stockElement.textContent)
        };
        
        openEditModal(currentProductData);
    }
    
    async function handleDeleteIconClick(event) {
        event.stopPropagation();
        const productId = event.currentTarget.dataset.productId;
        productToDeleteElement = event.currentTarget.closest('.product-box');
        openDeleteConfirmModal(productId);
    }

    // ** MODAL EDIT LOGIC **
    function openEditModal(product) {
        closeAllModals();
        stockChange = 0;
        stockChangeValueSpan.textContent = stockChange;
        editProductNameDisplay.textContent = product.name;
        editProductCurrentStockDisplay.textContent = `Current Stock: ${product.stock}`;
        updateDecrementButtonState();
        editModal.classList.add('show-modal');
    }

    closeEditModalButton.addEventListener('click', () => { editModal.classList.remove('show-modal'); });
    editModal.addEventListener('click', (event) => {
        if (event.target === editModal) { editModal.classList.remove('show-modal'); }
    });

    decrementButton.addEventListener('click', () => {
        if (currentProductData.stock + (stockChange - 1) >= 0) {
             stockChange--;
        }
        stockChangeValueSpan.textContent = stockChange;
        updateDecrementButtonState();
    });

    incrementButton.addEventListener('click', () => {
        stockChange++;
        stockChangeValueSpan.textContent = stockChange;
        updateDecrementButtonState();
    });

    function updateDecrementButtonState() {
        decrementButton.disabled = (currentProductData.stock + stockChange <= 0);
    }

    updateStockButton.addEventListener('click', async () => {
        if (currentProductData) {
            try {
                const response = await fetch(`/api/product/${currentProductData.id}/stock`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stockChange: stockChange })
                });
                const result = await response.json();
                
                if (response.ok) {
                    const currentStockElement = document.getElementById(`stock-${currentProductData.id}`);
                    if (currentStockElement) {
                        currentStockElement.textContent = result.new_stock;
                    }
                    currentProductData.stock = result.new_stock;
                    showNotification(result.message);
                    closeAllModals();
                } else {
                    showNotification(result.error || 'Gagal memperbarui stock.');
                }
            } catch (error) {
                console.error('Error updating stock:', error);
                showNotification('Terjadi kesalahan jaringan.');
            }
        }
    });

    // ** DELETE PRODUCT MODAL LOGIC **
    function openDeleteConfirmModal(productId) {
        closeAllModals();
        deleteConfirmModal.dataset.productIdToDelete = productId;
        deleteConfirmModal.classList.add('show-modal');
    }
    
    confirmDeleteYesButton.addEventListener('click', async () => {
        const productId = deleteConfirmModal.dataset.productIdToDelete;
        if (productId && productToDeleteElement) {
            try {
                const response = await fetch(`/api/product/${productId}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                
                if (response.ok) {
                    productToDeleteElement.remove();
                    showNotification(result.message);
                    closeAllModals();
                    loadProductsByCategory(productToDeleteElement.dataset.productCategory);
                } else {
                    showNotification(result.error || 'Gagal menghapus produk.');
                }
            } catch (error) {
                console.error('Error deleting product:', error);
                showNotification('Terjadi kesalahan jaringan.');
            }
        }
    });

    confirmDeleteNoButton.addEventListener('click', closeAllModals);
    deleteConfirmModal.addEventListener('click', (event) => {
        if (event.target === deleteConfirmModal) { closeAllModals(); }
    });

    // ** ADD NEW PRODUCT MODAL LOGIC **
    function openAddProductModal() {
        closeAllModals();
        addProductForm.reset();
        productStockInput.value = 0;
        addProductModal.classList.add('show-modal');
    }
    
    closeAddProductModalButton.addEventListener('click', closeAllModals);
    addProductModal.addEventListener('click', (event) => {
        if (event.target === addProductModal) { closeAllModals(); }
    });

    addProductForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const productName = productNameInput.value.trim();
        const productStock = parseInt(productStockInput.value);
        const productImageUrl = productImageUrlInput.value.trim();
        const categoryName = currentCategoryForProductAdd;
        
        if (!productName || isNaN(productStock) || productStock < 0 || !categoryName) {
            showNotification("Data produk tidak valid!");
            return;
        }
        
        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: productName, stock: productStock, imageUrl: productImageUrl, category: categoryName })
            });
            const result = await response.json();
            
            if (response.ok) {
                showNotification(result.message);
                closeAllModals();
                loadProductsByCategory(categoryName); // Reload products for the current category
            } else {
                showNotification(result.error || 'Gagal menambahkan produk.');
            }
        } catch (error) {
            console.error('Error adding product:', error);
            showNotification('Terjadi kesalahan jaringan.');
        }
    });

    // --- Sidebar Dropdown Logic ---
    if (categoriesDropdownToggle && categoriesDropdownMenu && categoriesDropdownWrapper) {
        categoriesDropdownToggle.addEventListener('click', () => {
            categoriesDropdownMenu.classList.toggle('show');
            categoriesDropdownToggle.classList.toggle('active');
            categoriesDropdownWrapper.classList.toggle('active');
        });

        document.addEventListener('click', (event) => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar && !sidebar.contains(event.target)) {
                categoriesDropdownMenu.classList.remove('show');
                categoriesDropdownToggle.classList.remove('active');
                categoriesDropdownWrapper.classList.remove('active');
            }
        });
    }

    // Mengubah link ke route Flask /index
    if (nimisoLogo) nimisoLogo.addEventListener('click', () => { window.location.href = '/index'; });
    // Mengubah link ke route Flask /adminmanage
    if (manageAdminLink) manageAdminLink.addEventListener('click', (event) => { event.preventDefault(); window.location.href = '/adminmanage'; });
    
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', (event) => {
            event.preventDefault();
            // Mengubah link logout ke route Flask /logout
            window.location.href = '/logout';
        });
    }
    
    // --- Initial Load & Popstate ---
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFromUrl = urlParams.get('category');
    const actionFromUrl = urlParams.get('action');

    fetchAndRenderSidebarCategories(); // Always fetch categories for the sidebar

    if (categoryFromUrl) {
        loadProductsByCategory(categoryFromUrl);
    } else {
        // If no category in URL, load the first category after fetching
        // This is handled by a separate function
        async function loadFirstCategory() {
            const response = await fetch('/api/categories');
            const categories = await response.json();
            if (categories.length > 0) {
                const firstCategoryName = categories[0].name.toLowerCase().replace(/\s/g, '');
                loadProductsByCategory(firstCategoryName);
                // Mengubah link history ke route Flask /categories
                history.replaceState({ category: firstCategoryName }, '', `/categories?category=${firstCategoryName}`);
            } else {
                categoryTitleElement.textContent = "Tidak Ada Kategori";
                productGridElement.innerHTML = "<p>Silakan tambahkan kategori baru dari sidebar.</p>";
            }
        }
        loadFirstCategory();
    }

    if (actionFromUrl === 'add-new-category') {
        if (addCategoryModal) {
            addCategoryModal.classList.add('show-modal');
            // Clean up the URL
            history.replaceState({}, document.title, window.location.pathname + window.location.search.replace(/([&?])action=add-new-category/, '$1').replace(/\?$/, ''));
        }
    }

    window.addEventListener('popstate', (event) => {
        const currentUrlParams = new URLSearchParams(window.location.search);
        const currentCategory = currentUrlParams.get('category');
        if (currentCategory) {
            loadProductsByCategory(currentCategory);
        } else {
            categoryTitleElement.textContent = "Pilih Kategori";
            productGridElement.innerHTML = "<p>Silakan pilih kategori dari sidebar untuk melihat produk.</p>";
        }
    });
});