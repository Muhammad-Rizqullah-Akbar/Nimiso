// adminmanage.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DEBUGGING: Pastikan script ini jalan
    console.log('Script adminmanage.js loaded and DOM is ready.');

    // --- MENGGUNAKAN ROLE PENGGUNA DARI FLASK ---
    // Mengambil role dan username dari variabel global yang di-set di HTML.
    const currentUserRole = window.currentUserRole;
    const currentUsername = window.currentUsername;
    console.log('Current User Role from Flask:', currentUserRole);
    console.log('Current Username from Flask:', currentUsername);

    // --- Sidebar & Global Elements ---
    const categoriesDropdownToggle = document.getElementById('categoriesDropdownToggle');
    const categoriesDropdownMenu = document.getElementById('categoriesDropdownMenu');
    const categoriesDropdownWrapper = categoriesDropdownToggle ? categoriesDropdownToggle.closest('.nav-item-wrapper') : null;
    const nimisoLogo = document.querySelector('.logo');
    const manageAdminLink = document.getElementById('manageAdminLink');
    const addNewCategoryLink = document.querySelector('.add-new-category'); // Cek keberadaan elemen ini

    // ** Modals & Notifications **
    const adminGrid = document.getElementById('adminGrid');
    const addNewAdminButton = document.getElementById('addNewAdminButton');
    const addAdminModal = document.getElementById('addAdminModal');
    const closeAddAdminModalButton = document.getElementById('closeAddAdminModalButton');
    const addAdminForm = document.getElementById('addAdminForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const fullNameInput = document.getElementById('fullName');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const adminRoleSelect = document.getElementById('adminRole');
    const deleteAdminConfirmModal = document.getElementById('deleteAdminConfirmModal');
    const adminToDeleteNameSpan = document.getElementById('adminToDeleteName');
    const confirmAdminDeleteYesButton = document.getElementById('confirmAdminDeleteYes');
    const confirmAdminDeleteNoButton = document.getElementById('confirmDeleteNo');
    const notificationToast = document.getElementById('notificationToast');
    const notificationMessage = document.getElementById('notificationMessage');
    
    // ** MODAL EDIT ADMIN ELEMENTS (BARU) **
    const editAdminModal = document.getElementById('editAdminModal');
    const closeEditAdminModalButton = document.getElementById('closeEditAdminModalButton');
    const editAdminForm = document.getElementById('editAdminForm');
    const editAdminIdInput = document.getElementById('editAdminId');
    const editUsernameInput = document.getElementById('editUsername');
    const editFullNameInput = document.getElementById('editFullName');
    const editPhoneNumberInput = document.getElementById('editPhoneNumber');
    const editAdminRoleSelect = document.getElementById('editAdminRole');
    const updateAdminButton = document.getElementById('updateAdminButton');

    // ** VARIABEL UNTUK DELETE & EDIT **
    let adminToDeleteId = null;
    let adminToDeleteElement = null;
    let notificationTimeout;

    // --- Global Utility Functions (untuk notifikasi, dll.) ---
    function showNotification(message, duration = 2000) {
        clearTimeout(notificationTimeout);
        if (notificationMessage && notificationToast) {
            notificationMessage.textContent = message;
            notificationToast.classList.add('show');
            notificationTimeout = setTimeout(() => {
                notificationToast.classList.remove('show');
            }, duration);
        }
    }
    
    function closeAllModals() {
        if (addAdminModal) addAdminModal.classList.remove('show-modal');
        if (deleteAdminConfirmModal) deleteAdminConfirmModal.classList.remove('show-modal');
        if (editAdminModal) editAdminModal.classList.remove('show-modal'); // Tutup modal edit
    }

    const getInitials = (name) => {
        if (!name) return '';
        const parts = name.split(' ').filter(p => p.length > 0);
        if (parts.length === 1) return parts[0][0].toUpperCase();
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return '';
    };

    // --- Fetch Admins and render grid ---
    async function fetchAndRenderAdminGrid() {
        console.log('Fungsi fetchAndRenderAdminGrid dijalankan.');
        
        if (!adminGrid) {
            console.error('adminGrid element not found!');
            return;
        }
        
        adminGrid.innerHTML = '';
        try {
            console.log('Fetching data from /api/admins...');
            const response = await fetch('/api/admins');
            
            console.log('API Response Status:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error('API request failed with status: ' + response.status);
            }
            
            const admins = await response.json();
            
            console.log('Data admins dari API:', admins);
            
            if (admins.length === 0) {
                 adminGrid.innerHTML = `<p style="text-align: center; width: 100%; color: #7A695B;">Tidak ada admin yang terdaftar.</p>`;
            } else {
                admins.forEach(admin => {
                    const adminBox = document.createElement('div');
                    adminBox.classList.add('admin-box');
                    adminBox.dataset.adminId = admin.id;

                    // --- LOGIKA KONDISIONAL UNTUK TOMBOL HAPUS DAN EDIT ---
                    let actionButtonsHtml = '';
                    // Tombol Edit (pensil) hanya untuk supervisor, tidak bisa mengedit akun sendiri
                    if (currentUserRole === 'supervisor' && admin.username !== currentUsername) {
                         actionButtonsHtml += `<button class="edit-admin-button" data-admin-id="${admin.id}"><i class="fas fa-pencil-alt"></i></button>`;
                    }
                    // Tombol Hapus hanya untuk supervisor, dan BUKAN admin yang sedang login
                    if (currentUserRole === 'supervisor' && admin.username !== currentUsername) {
                        actionButtonsHtml += `<button class="delete-admin-button" data-admin-id="${admin.id}"><i class="fas fa-trash-alt"></i></button>`;
                    }

                    // Tampilkan div admin-actions hanya jika ada tombol
                    const adminActionsWrapper = actionButtonsHtml ? `<div class="admin-actions">${actionButtonsHtml}</div>` : '';

                    adminBox.innerHTML = `
                        <div class="admin-profile-pic">
                            <span>${getInitials(admin.full_name)}</span>
                        </div>
                        <div class="admin-details">
                            <p><span class="detail-label">Name:</span> <span class="detail-value admin-name">${admin.full_name}</span></p>
                            <p><span class="detail-label">Role:</span> <span class="detail-value admin-role">${admin.role.charAt(0).toUpperCase() + admin.role.slice(1)}</span></p>
                            <p><span class="detail-label">WA:</span> <span class="detail-value admin-wa">${admin.wa_number}</span></p>
                        </div>
                        <p class="admin-account-created">Account created: ${admin.created_date}</p>
                        ${adminActionsWrapper}
                    `;
                    
                    adminGrid.appendChild(adminBox);
                });
            }
            
            // Panggil fungsi untuk atur visibilitas tombol
            if (addNewAdminButton) {
                applyRolePermissions(); 
            }
            attachAdminEventListeners(); // Attach listeners after rendering
            
        } catch (error) {
            console.error('Error fetching admins:', error);
            adminGrid.innerHTML = `<p style="text-align: center; width: 100%; color: #DC3545;">Gagal memuat data admin. Terjadi kesalahan jaringan atau akses ditolak.</p>`;
            showNotification('Gagal memuat data admin. Silakan coba login ulang.', 3000);
        }
    }
    
    // --- Attach Event Listeners to rendered elements ---
    function attachAdminEventListeners() {
        // Pasang event listener untuk tombol yang ada
        document.querySelectorAll('.delete-admin-button').forEach(button => {
            button.addEventListener('click', handleDeleteAdminButtonClick);
        });
        document.querySelectorAll('.edit-admin-button').forEach(button => { // Listener untuk tombol edit
            button.addEventListener('click', handleEditAdminButtonClick);
        });
    }

    // --- Event handler for delete admin button ---
    function handleDeleteAdminButtonClick(event) {
        event.stopPropagation();
        const adminId = event.currentTarget.dataset.adminId;
        const adminName = event.currentTarget.closest('.admin-box').querySelector('.admin-name').textContent;
        
        closeAllModals();
        adminToDeleteId = adminId;
        adminToDeleteElement = event.currentTarget.closest('.admin-box');
        if (adminToDeleteNameSpan) adminToDeleteNameSpan.textContent = adminName;
        if (deleteAdminConfirmModal) deleteAdminConfirmModal.classList.add('show-modal');
    }
    
    // --- Event handler for edit admin button (BARU) ---
    async function handleEditAdminButtonClick(event) {
        event.stopPropagation();
        const adminId = event.currentTarget.dataset.adminId;

        try {
            // Fetch detail admin dari API endpoint baru
            const response = await fetch(`/api/admin/${adminId}`);
            if (!response.ok) throw new Error('Failed to fetch admin details.');
            
            const admin = await response.json();
            
            // Isi form modal edit dengan data admin
            editAdminIdInput.value = admin.id;
            editUsernameInput.value = admin.username;
            editFullNameInput.value = admin.full_name;
            editPhoneNumberInput.value = admin.wa_number;
            editAdminRoleSelect.value = admin.role;
            
            closeAllModals();
            editAdminModal.classList.add('show-modal');
        } catch (error) {
            console.error('Error fetching admin details for edit:', error);
            showNotification('Gagal memuat data admin untuk diedit.');
        }
    }

    // --- Role-based UI Visibility ---
    function applyRolePermissions() {
        console.log('Applying role permissions. Current role:', currentUserRole);
        // Sembunyikan tombol Add New Admin untuk 'admin'
        if (addNewAdminButton) {
            if (currentUserRole === 'admin') {
                addNewAdminButton.style.display = 'none';
            } else { // 'supervisor' atau lainnya
                addNewAdminButton.style.display = 'flex';
            }
        }
        // Tombol delete dan edit sudah diatur visibilitasnya di template string
    }

    // --- Add New Admin Modal Logic ---
    function openAddAdminModal() {
        closeAllModals();
        if (addAdminForm) addAdminForm.reset();
        if (addAdminModal) addAdminModal.classList.add('show-modal');
    }
    
    // Attach event listeners for modals
    if (addNewAdminButton) addNewAdminButton.addEventListener('click', openAddAdminModal);
    if (closeAddAdminModalButton) closeAddAdminModalButton.addEventListener('click', closeAllModals);
    if (addAdminModal) {
        addAdminModal.addEventListener('click', (event) => {
            if (event.target === addAdminModal) { closeAllModals(); }
        });
    }
    
    // Attach event listeners for edit modal (BARU)
    if (closeEditAdminModalButton) closeEditAdminModalButton.addEventListener('click', closeAllModals);
    if (editAdminModal) {
        editAdminModal.addEventListener('click', (event) => {
            if (event.target === editAdminModal) { closeAllModals(); }
        });
    }

    // --- Submit Add Admin Form ---
     if (addAdminForm) {
        addAdminForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            const full_name = fullNameInput.value.trim();
            const wa_number = phoneNumberInput.value.trim();
            const role = adminRoleSelect.value;
            
            if (password !== confirmPassword) {
                showNotification('Password dan konfirmasi password tidak cocok!', 3000);
                return;
            }
            
            const newAdminData = {
                username,
                password,
                full_name,
                role,
                wa_number
            };
            
            try {
                const response = await fetch('/api/admins', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newAdminData)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showNotification(result.message);
                    closeAllModals();
                    fetchAndRenderAdminGrid();
                } else {
                    showNotification(result.error || 'Gagal menambahkan admin.');
                }
            } catch (error) {
                console.error('Error adding admin:', error);
                showNotification('Terjadi kesalahan jaringan.');
                
            }
        });
    }
    
    // --- Submit Edit Admin Form (BARU) ---
    if (editAdminForm) {
        editAdminForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const adminId = editAdminIdInput.value;
            const fullName = editFullNameInput.value.trim();
            const phoneNumber = editPhoneNumberInput.value.trim();
            const role = editAdminRoleSelect.value;

            // Pastikan user adalah supervisor dan tidak mengedit dirinya sendiri
            const adminToEditUsername = editUsernameInput.value;
            if (currentUserRole !== 'supervisor' || adminToEditUsername === currentUsername) {
                showNotification('Akses ditolak. Anda tidak memiliki izin untuk mengedit profil ini.', 3000);
                return;
            }

            const updatedAdminData = {
                full_name: fullName,
                role: role,
                wa_number: phoneNumber
            };
            
            try {
                const response = await fetch(`/api/admin/${adminId}`, {
                    method: 'PUT', // Menggunakan method PUT untuk update
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedAdminData)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showNotification(result.message);
                    closeAllModals();
                    fetchAndRenderAdminGrid(); // Muat ulang grid admin
                } else {
                    showNotification(result.error || 'Gagal mengupdate profil admin.');
                }
            } catch (error) {
                console.error('Error updating admin:', error);
                showNotification('Terjadi kesalahan jaringan.');
            }
        });
    }

    // --- Delete Admin Confirmation Logic ---
    function openDeleteAdminConfirmModal() {
        closeAllModals();
        if (deleteAdminConfirmModal) deleteAdminConfirmModal.classList.add('show-modal');
    }
    
    function closeDeleteAdminConfirmModal() {
        if (deleteAdminConfirmModal) deleteAdminConfirmModal.classList.remove('show-modal');
        adminToDeleteId = null;
        adminToDeleteElement = null;
    }

    if (confirmAdminDeleteYesButton) {
        confirmAdminDeleteYesButton.addEventListener('click', async () => {
            if (adminToDeleteId) {
                try {
                    const response = await fetch(`/api/admin/${adminToDeleteId}`, {
                        method: 'DELETE'
                    });
                    const result = await response.json();
                    
                    if (response.ok) {
                        showNotification(result.message);
                        if (adminToDeleteElement) {
                            adminToDeleteElement.remove();
                        }
                        closeDeleteAdminConfirmModal();
                    } else {
                        showNotification(result.error || 'Gagal menghapus admin.');
                    }
                } catch (error) {
                    console.error('Error deleting admin:', error);
                    showNotification('Terjadi kesalahan jaringan.');
                }
            }
        });
    }

    if (confirmAdminDeleteNoButton) confirmAdminDeleteNoButton.addEventListener('click', closeDeleteAdminConfirmModal);
    if (deleteAdminConfirmModal) {
        deleteAdminConfirmModal.addEventListener('click', (event) => {
            if (event.target === deleteAdminConfirmModal) { closeAllModals(); }
        });
    }
    
    // --- Fetch Categories for Sidebar ---
    async function fetchAndRenderSidebarCategories() {
        try {
            const response = await fetch('/api/categories');
            const categories = await response.json();
            const dropdownMenu = document.getElementById('categoriesDropdownMenu');
            const addNewCategoryListItem = dropdownMenu ? dropdownMenu.querySelector('.add-new-category') : null;
            
            if (dropdownMenu) {
                 dropdownMenu.innerHTML = '';
            
                categories.forEach(cat => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = `/categories?category=${cat.name.toLowerCase().replace(/\s/g, '')}`;
                    a.dataset.category = cat.name.toLowerCase().replace(/\s/g, '');
                    a.textContent = cat.name;
                    li.appendChild(a);
                    dropdownMenu.appendChild(li);
                });

                if (addNewCategoryListItem) {
                    dropdownMenu.appendChild(addNewCategoryListItem.closest('li')); 
                    // MENAMBAHKAN EVENT LISTENER UNTUK LINK "ADD NEW CATEGORIES"
                    const addLink = addNewCategoryListItem.closest('li').querySelector('a');
                    if (addLink) {
                        addLink.addEventListener('click', (event) => {
                            event.preventDefault();
                            // Arahkan ke halaman categories dengan parameter untuk membuka modal
                            window.location.href = '/categories?action=add-new-category';
                        });
                    }
                }
                 dropdownMenu.querySelectorAll('li a:not(.add-new-category)').forEach(item => {
                    item.addEventListener('click', handleCategoryNavLinkClick);
                });
            }
        } catch (error) {
            console.error('Error fetching categories for sidebar:', error);
        }
    }
    
    function handleCategoryNavLinkClick(event) {
        event.preventDefault();
        const categoryName = event.target.dataset.category;
        window.location.href = `/categories?category=${categoryName}`;
    }

    if (nimisoLogo) nimisoLogo.addEventListener('click', () => { window.location.href = '/index'; });
    if (manageAdminLink) manageAdminLink.addEventListener('click', (event) => { event.preventDefault(); window.location.href = '/adminmanage'; });
    
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.href = '/logout';
        });
    }
    
    // --- Initial render when page loads ---
    if (adminGrid) {
        fetchAndRenderAdminGrid();
    } else {
        console.error("Elemen #adminGrid tidak ditemukan di halaman.");
    }
    
    if (categoriesDropdownToggle) {
        fetchAndRenderSidebarCategories();
        if (categoriesDropdownToggle && categoriesDropdownMenu && categoriesDropdownWrapper) {
            categoriesDropdownToggle.addEventListener('click', () => {
                categoriesDropdownMenu.classList.toggle('show');
                categoriesDropdownToggle.classList.toggle('active');
                categoriesDropdownWrapper.classList.toggle('active');
            });
        }
        document.addEventListener('click', (event) => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar && !sidebar.contains(event.target)) {
                if (categoriesDropdownMenu) categoriesDropdownMenu.classList.remove('show');
                if (categoriesDropdownToggle) categoriesDropdownToggle.classList.remove('active');
                if (categoriesDropdownWrapper) categoriesDropdownWrapper.classList.remove('active');
            }
        });
    } else {
        console.error("Elemen #categoriesDropdownToggle tidak ditemukan di halaman.");
    }
});