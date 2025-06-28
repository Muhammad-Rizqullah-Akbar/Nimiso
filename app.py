import os
from flask import Flask, render_template, request, redirect, url_for, jsonify, flash, session
from flask_sqlalchemy import SQLAlchemy
from functools import wraps

# Inisialisasi aplikasi Flask
app = Flask(__name__, instance_relative_config=True)

# Konfigurasi database SQLite
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Konfigurasi SECRET_KEY untuk sesi dan form. WAJIB ADA!
# Ganti dengan string yang lebih acak dan aman di production.
app.config['SECRET_KEY'] = 'ini-kunci-rahasia-super-aman-buat-sesi' 

# Inisialisasi SQLAlchemy
db = SQLAlchemy(app)

# ====================================================================
# MODEL DATABASE
# ====================================================================

# Model untuk tabel Admin
class Admin(db.Model):
    id = db.Column(db.String(100), primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(50), nullable=False) # 'admin' or 'supervisor'
    wa_number = db.Column(db.String(20))
    created_date = db.Column(db.String(20))

    def __repr__(self):
        return f"<Admin {self.username}>"

# Model untuk tabel Category
class Category(db.Model):
    id = db.Column(db.String(100), primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    products = db.relationship('Product', backref='category', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Category {self.name}>"

# Model untuk tabel Product
class Product(db.Model):
    id = db.Column(db.String(100), primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    stock = db.Column(db.Integer, default=0)
    image_url = db.Column(db.String(200), default='https://via.placeholder.com/150')
    category_id = db.Column(db.String(100), db.ForeignKey('category.id'), nullable=False)

    def __repr__(self):
        return f"<Product {self.name} | Stock: {self.stock}>"

# ====================================================================
# DECORATOR untuk Proteksi Route
# ====================================================================

# Fungsi decorator yang akan mengecek apakah user sudah login
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            # flash('Anda harus login terlebih dahulu.') # Bisa diaktifkan untuk pesan pop-up
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function

# ====================================================================
# ROUTING (URL ENDPOINTS)
# ====================================================================

# Route utama, akan redirect ke halaman login atau dashboard
@app.route('/')
def home():
    if 'logged_in' in session:
        return redirect(url_for('index'))
    return redirect(url_for('login_page'))

# Route untuk halaman login (GET) dan proses login (POST)
@app.route('/login', methods=['GET', 'POST'])
def login_page():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        # --- DEBUGGING PRINT (sudah ditambahkan) ---
        print(f"Percobaan login diterima:")
        print(f"  Username: '{username}'")
        print(f"  Password: '{password}'")
        # --- AKHIR DEBUGGING PRINT ---
        
        # Cek admin dari database
        admin = Admin.query.filter_by(username=username, password=password).first()
        
        # --- PERBAIKAN LOGIC LOGIN: cek admin tidak None dan password cocok
        if admin and admin.password == password:
            # Login berhasil, simpan status di session
            session['logged_in'] = True
            session['username'] = admin.username
            session['role'] = admin.role # Simpan role untuk cek akses
            print(f"Login berhasil untuk user: {admin.username}")
            return redirect(url_for('index'))
        else:
            # Login gagal, redirect kembali ke halaman login
            print("Login gagal: Username atau password salah.")
            return redirect(url_for('login_page'))
    
    # Untuk request GET, tampilkan halaman login
    return render_template('loginpage.html')

# Route untuk proses logout
@app.route('/logout')
@login_required
def logout():
    session.clear() # Hapus semua data dari session
    return redirect(url_for('login_page'))

# Route untuk halaman dashboard utama (dilindungi)
@app.route('/index')
@login_required
def index():
    # Ambil data statistik dari database
    total_items = db.session.query(db.func.sum(Product.stock)).scalar() or 0
    total_products = Product.query.count()
    total_categories = Category.query.count()
    
    # Ambil daftar kategori untuk sidebar
    categories = Category.query.all()
    
    return render_template('index.html', 
                           total_items=total_items, 
                           total_products=total_products, 
                           total_categories=total_categories,
                           categories=categories)

# Route untuk halaman kategori (dilindungi)
@app.route('/categories')
@login_required
def categories():
    category_name_url = request.args.get('category')
    
    # Ambil semua kategori untuk sidebar
    categories = Category.query.all()
    
    # Ambil produk dari kategori yang dipilih
    products = []
    category_title = "Pilih Kategori" # Judul default
    if category_name_url:
        category_obj = Category.query.filter(db.func.lower(Category.name) == category_name_url.lower()).first()
        if category_obj:
            products = category_obj.products
            category_title = category_obj.name
        else:
            category_title = "Kategori Tidak Ditemukan"
    else:
        # Jika tidak ada kategori di URL, tampilkan kategori pertama dari sidebar
        if categories:
            category_title = categories[0].name
            products = categories[0].products
    
    # Tambahkan passing session role ke template
    return render_template('categories.html',
                           category_name=category_title,
                           products=products,
                           categories=categories,
                           current_user_role=session.get('role')) # BARU: Pass role ke HTML

# Route untuk halaman manage admin (dilindungi)
@app.route('/adminmanage')
@login_required
def admin_manage():
    admins = Admin.query.all()
    categories = Category.query.all()
    # Pass role dan username ke template agar bisa digunakan di JS
    return render_template('adminmanage.html', 
                           admins=admins, 
                           categories=categories,
                           current_user_role=session.get('role'), # BARU
                           current_username=session.get('username')) # BARU


# ====================================================================
# API ENDPOINTS (dilindungi)
# ====================================================================

# API untuk mendapatkan data statistik dashboard (BARU)
# Ini fix untuk error 404 di log
@app.route('/api/statistics')
@login_required
def api_get_statistics():
    total_items = db.session.query(db.func.sum(Product.stock)).scalar() or 0
    total_products = Product.query.count()
    total_categories = Category.query.count()
    
    return jsonify({
        'total_items': total_items,
        'total_products': total_products,
        'total_categories': total_categories
    })

# API untuk mendapatkan data produk berdasarkan kategori
@app.route('/api/products/<category_name>')
@login_required
def api_get_products(category_name):
    # --- PERBAIKAN BUG CASE-SENSITIVE ---
    # Lo mengirim 'accessories' dari JS, tapi DB punya 'Accessories'
    category = Category.query.filter(db.func.lower(Category.name) == category_name.lower()).first()
    # ------------------------------------
    if category:
        products = [{'id': p.id, 'name': p.name, 'stock': p.stock, 'imageUrl': p.image_url} for p in category.products]
        return jsonify(products)
    return jsonify([])

# API untuk mendapatkan semua kategori
@app.route('/api/categories')
def api_get_categories():
    categories = Category.query.all()
    categories_list = [{'id': cat.id, 'name': cat.name} for cat in categories]
    return jsonify(categories_list)

# API untuk menambahkan kategori baru
@app.route('/api/categories', methods=['POST'])
@login_required
def api_add_category():
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Nama kategori tidak boleh kosong!'}), 400
    
    normalized_name = name.lower().replace(' ', '')
    new_category_id = f'cat-{normalized_name}-{os.urandom(4).hex()}'
    existing_category = Category.query.filter(db.func.lower(Category.name) == name.lower()).first()
    if existing_category:
        return jsonify({'error': f'Kategori "{name}" sudah ada!'}), 409
        
    new_category = Category(id=new_category_id, name=name)
    db.session.add(new_category)
    db.session.commit()
    
    return jsonify({'message': f'Kategori "{name}" berhasil ditambahkan!', 'category': {'id': new_category.id, 'name': new_category.name}}), 201

# API untuk menambahkan produk baru
@app.route('/api/products', methods=['POST'])
@login_required
def api_add_product():
    data = request.get_json()
    name = data.get('name')
    stock = data.get('stock', 0)
    image_url = data.get('imageUrl')
    category_name = data.get('category')
    
    if not all([name, category_name]):
        return jsonify({'error': 'Data produk tidak lengkap!'}), 400
        
    category = Category.query.filter(db.func.lower(Category.name) == category_name.lower()).first()
    if not category:
        return jsonify({'error': 'Kategori tidak ditemukan!'}), 404
        
    new_product_id = f'prod-{category.id}-{os.urandom(4).hex()}'
    new_product = Product(id=new_product_id, name=name, stock=stock, image_url=image_url, category_id=category.id)
    
    db.session.add(new_product)
    db.session.commit()
    
    return jsonify({'message': f'Produk "{name}" berhasil ditambahkan!', 'product': {'id': new_product.id, 'name': new_product.name}}), 201

# API untuk update stock produk
@app.route('/api/product/<product_id>/stock', methods=['PUT'])
@login_required
def api_update_stock(product_id):
    data = request.get_json()
    stock_change = data.get('stockChange')
    
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Produk tidak ditemukan!'}), 404
        
    new_stock = product.stock + stock_change
    if new_stock < 0:
        return jsonify({'error': 'Stok tidak bisa kurang dari nol!'}), 400
        
    product.stock = new_stock
    db.session.commit()
    
    return jsonify({'message': f'Stok {product.name} berhasil diperbarui!', 'new_stock': product.stock}), 200

# API untuk menghapus produk
@app.route('/api/product/<product_id>', methods=['DELETE'])
@login_required
def api_delete_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Produk tidak ditemukan!'}), 404
        
    db.session.delete(product)
    db.session.commit()
    
    return jsonify({'message': 'Produk berhasil dihapus!'}), 200

# API untuk mendapatkan semua admin (untuk manage admin)
@app.route('/api/admins')
@login_required
def api_get_admins():
    admins = Admin.query.all()
    # --- PERBAIKAN KEY 'fullName' menjadi 'full_name' agar cocok dengan JS ---
    admins_list = [{'id': a.id, 'username': a.username, 'full_name': a.full_name, 'role': a.role, 'wa_number': a.wa_number, 'created_date': a.created_date} for a in admins]
    # ------------------------------------------------------------------------------------------------
    return jsonify(admins_list)
    
# API untuk menambahkan admin baru
@app.route('/api/admins', methods=['POST'])
@login_required
def api_add_admin():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    full_name = data.get('full_name')
    role = data.get('role')
    wa_number = data.get('wa_number')
    
    if not all([username, password, full_name, role, wa_number]):
        return jsonify({'error': 'Data admin tidak lengkap!'}), 400
        
    existing_admin = Admin.query.filter_by(username=username).first()
    if existing_admin:
        return jsonify({'error': 'Username sudah ada, gunakan username lain!'}), 409
    
    new_admin_id = f'admin-{os.urandom(4).hex()}'
    created_date = '2025-06-27' 
    
    new_admin = Admin(id=new_admin_id, username=username, password=password, full_name=full_name, role=role, wa_number=wa_number, created_date=created_date)
    
    db.session.add(new_admin)
    db.session.commit()
    
    return jsonify({'message': f'Admin "{full_name}" berhasil ditambahkan!', 'admin': {'id': new_admin.id, 'username': new_admin.username}}), 201
    
# API untuk menghapus admin
@app.route('/api/admin/<admin_id>', methods=['DELETE'])
@login_required
def api_delete_admin(admin_id):
    admin = Admin.query.get(admin_id)
    if not admin:
        return jsonify({'error': 'Admin tidak ditemukan!'}), 404
        
    db.session.delete(admin)
    db.session.commit()
    
    return jsonify({'message': 'Admin berhasil dihapus!'}), 200

# API untuk menghapus kategori (BARU)
@app.route('/api/category/<category_id>', methods=['DELETE'])
@login_required
def api_delete_category(category_id):
    # Cek role pengguna dari session. Hanya supervisor yang diizinkan.
    if session.get('role') != 'supervisor':
        # Mengembalikan error 403 Forbidden jika role bukan supervisor
        return jsonify({'error': 'Akses Ditolak. Hanya supervisor yang dapat menghapus kategori.'}), 403
    
    category = Category.query.get(category_id)
    if not category:
        return jsonify({'error': 'Kategori tidak ditemukan!'}), 404
    
    # Hapus kategori dan semua produk terkait (karena cascade="all, delete-orphan")
    db.session.delete(category)
    db.session.commit()
    
    return jsonify({'message': f'Kategori "{category.name}" dan semua produknya berhasil dihapus!'}), 200

# ====================================================================
# INISIALISASI DATABASE & DATA AWAL
# ====================================================================
def initialize_database():
    if not os.path.exists('instance'):
        os.makedirs('instance')
    
    with app.app_context():
        db.create_all()
        
        # Cek apakah ada data di tabel Admin
        if not Admin.query.first():
            print("Memasukkan data admin awal...")
            default_admins = [
                Admin(id='admin-default', username='admin', password='password123', full_name='Default Admin', role='supervisor', wa_number='+6281234567890', created_date='2023-01-15'),
                Admin(id='admin-johndoe', username='john.doe', password='password', full_name='John Doe', role='supervisor', wa_number='+6281234567890', created_date='2023-01-15'),
                Admin(id='admin-janesmith', username='jane.smith', password='password', full_name='Jane Smith', role='admin', wa_number='+6287654321098', created_date='2023-03-20'),
                Admin(id='admin-peterj', username='peter.jones', password='password', full_name='Peter Jones', role='admin', wa_number='+6281122334455', created_date='2023-05-10'),
                Admin(id='admin-saraw', username='sara.williams', password='password', full_name='Sara Williams', role='supervisor', wa_number='+6285566778899', created_date='2023-07-01'),
            ]
            db.session.add_all(default_admins)
            db.session.commit()
            print("Data admin awal berhasil ditambahkan.")

        # Cek apakah ada data di tabel Category
        if not Category.query.first():
            print("Memasukkan data kategori dan produk awal...")
            default_categories_and_products = {
                'Accessories': [
                    {'name': "Headband Contoh", 'stock': 25, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Acc+1"},
                    {'name': "Kalung Contoh", 'stock': 15, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Acc+2"},
                    {'name': "Gelang Contoh", 'stock': 30, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Acc+3"},
                    {'name': "Anting Contoh", 'stock': 20, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Acc+4"},
                    {'name': "Cincin Contoh", 'stock': 10, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Acc+5"},
                    {'name': "Topi Contoh", 'stock': 18, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Acc+6"},
                    {'name': "Syal Contoh", 'stock': 12, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Acc+7"},
                    {'name': "Kacamata Contoh", 'stock': 22, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Acc+8"},
                ],
                'Electronics': [
                    {'name': "Earbuds Contoh", 'stock': 50, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Elec+1"},
                    {'name': "Power Bank Contoh", 'stock': 35, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Elec+2"},
                    {'name': "Kipas Portabel", 'stock': 40, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Elec+3"},
                    {'name': "Lampu LED Contoh", 'stock': 60, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Elec+4"},
                    {'name': "Mouse Wireless", 'stock': 28, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Elec+5"},
                    {'name': "Speaker Bluetooth", 'stock': 17, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Elec+6"},
                    {'name': "Kabel Charger", 'stock': 75, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Elec+7"},
                    {'name': "Smartwatch Contoh", 'stock': 20, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Elec+8"},
                ],
                'Toys': [
                    {'name': "Robot Mini", 'stock': 45, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Toy+1"},
                    {'name': "Boneka Lucu", 'stock': 30, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Toy+2"},
                    {'name': "Puzzle Contoh", 'stock': 25, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Toy+3"},
                    {'name': "Mainan Edukasi", 'stock': 22, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Toy+4"},
                    {'name': "Model Kit", 'stock': 15, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Toy+5"},
                    {'name': "Balon Udara", 'stock': 50, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Toy+6"},
                    {'name': "Lego Set", 'stock': 10, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Toy+7"},
                    {'name': "Mobil Remote", 'stock': 18, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=Toy+8"},
                ],
                'Stationery': [
                    {'name': "Pulpen Gel", 'stock': 100, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=St+1"},
                    {'name': "Buku Catatan", 'stock': 80, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=St+2"},
                    {'name': "Spidol Warna", 'stock': 60, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=St+3"},
                    {'name': "Pensil Mekanik", 'stock': 90, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=St+4"},
                    {'name': "Penghapus Unik", 'stock': 70, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=St+5"},
                    {'name': "Sticker Set", 'stock': 55, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=St+6"},
                    {'name': "Kertas Binder", 'stock': 120, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=St+7"},
                    {'name': "Binder Klip", 'stock': 95, 'imageUrl': "https://via.placeholder.com/150/CDE9F9/A28C7A?text=St+8"},
                ]
            }

            for cat_name, product_list in default_categories_and_products.items():
                category_id = f'cat-{cat_name.lower()}'
                existing_category = Category.query.get(category_id)
                if not existing_category:
                    category_obj = Category(id=category_id, name=cat_name)
                    db.session.add(category_obj)
                    
                    for prod_data in product_list:
                        product_id = f'prod-{category_id}-{prod_data["name"].lower().replace(" ", "")}'
                        existing_product = Product.query.get(product_id)
                        if not existing_product:
                            product_obj = Product(
                                id=product_id,
                                name=prod_data['name'],
                                stock=prod_data['stock'],
                                image_url=prod_data['imageUrl'],
                                category_id=category_id
                            )
                            db.session.add(product_obj)
            
            db.session.commit()
            print("Data kategori dan produk awal berhasil ditambahkan.")

if __name__ == '__main__':
    initialize_database()
    app.run(debug=True)