# Auth Service và Product Service

Yêu cầu Node.js >= 22.13 (đã kiểm tra trên Node.js 24). Cài thư viện bằng `npm install` nếu chưa có `node_modules`.

Chạy hai terminal riêng:

```powershell
# Terminal 1: Auth Service, http://localhost:3000
npm start
```

```powershell
# Terminal 2: Product Service, http://localhost:3001
npm run start:products
```

Product Service có process, cổng và database riêng tại `product-service/data/products.sqlite`. Database và bảng được tạo tự động, dữ liệu giữ lại khi khởi động lại. Service gọi `POST /auth` của Auth Service để xác thực mỗi request, không truy cập dữ liệu người dùng hay giữ khóa ký JWT.

Các biến môi trường tùy chọn: `AUTH_PORT` (3000), `PRODUCT_PORT` (3001), `AUTH_SERVICE_URL` (`http://localhost:3000`), `PRODUCT_DB_PATH` (đường dẫn file SQLite). Ví dụ trong PowerShell: `$env:PRODUCT_PORT = '4001'`. Khi đổi cổng Auth Service, cần cập nhật `AUTH_SERVICE_URL` tương ứng.

## Đăng nhập và gọi API bằng PowerShell

Tài khoản bài hiện tại là `admin`, mật khẩu được lưu nguyên chuỗi `MTIzNDU2`; dùng chính chuỗi này để tương thích với bài cũ.

```powershell
$login = Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/login' -ContentType 'application/json' -Body '{"userName":"admin","password":"MTIzNDU2"}'
$headers = @{ Authorization = "Bearer $($login.token)" }

$product = Invoke-RestMethod -Method Post -Uri 'http://localhost:3001/products' -Headers $headers -ContentType 'application/json' -Body '{"name":"Laptop","description":"Laptop van phong","price":15000000,"quantity":10}'

Invoke-RestMethod -Uri 'http://localhost:3001/products' -Headers $headers
Invoke-RestMethod -Uri "http://localhost:3001/products/$($product.id)" -Headers $headers

Invoke-RestMethod -Method Put -Uri "http://localhost:3001/products/$($product.id)" -Headers $headers -ContentType 'application/json' -Body '{"name":"Laptop Pro","description":"Da cap nhat","price":18000000,"quantity":8}'

Invoke-RestMethod -Method Delete -Uri "http://localhost:3001/products/$($product.id)" -Headers $headers
```

## REST API

Tất cả API dưới đây yêu cầu header `Authorization: Bearer <token>`.

| Method | Endpoint | Kết quả |
| --- | --- | --- |
| GET | `/products` | 200, mảng sản phẩm |
| GET | `/products/:id` | 200, chi tiết sản phẩm |
| POST | `/products` | 201, sản phẩm mới và header Location |
| PUT | `/products/:id` | 200, sản phẩm sau cập nhật |
| DELETE | `/products/:id` | 204, không có body |

`id` là số nguyên dương thay cho `:id`. POST và PUT yêu cầu `name`, `price`, `quantity`; `description` tùy chọn, mặc định chuỗi rỗng. PUT thay toàn bộ các trường có thể chỉnh sửa. Giá phải là số không âm, tối đa 99999999.99 và tối đa hai chữ số thập phân; số lượng là số nguyên từ 0 đến 2147483647. Tên sau khi bỏ khoảng trắng đầu cuối dài 1–255 ký tự. ID và thời gian do service quản lý.

Lỗi: 400 dữ liệu/ID/JSON không hợp lệ, 401 thiếu Bearer token, 403 token sai hoặc hết hạn, 404 không tìm thấy sản phẩm, 503 Auth Service không hoạt động (timeout 5 giây). Lỗi trả JSON có trường `message`.

Bảng `products` gồm `id`, `name VARCHAR(255)`, `description TEXT`, `price DECIMAL(10,2)`, `quantity INTEGER`, `created_at TIMESTAMP`, `updated_at TIMESTAMP`. SQLite dùng `INTEGER PRIMARY KEY AUTOINCREMENT` cho ID; thời gian lưu theo UTC. SQLite không áp dụng precision/scale của DECIMAL như MySQL, nên controller kiểm tra giới hạn và chữ số thập phân trước khi ghi dữ liệu.

## Kiểm tra

```powershell
npm test
```

Test tích hợp khởi động hai HTTP service trên cổng ngẫu nhiên, dùng database tạm riêng, kiểm tra đăng nhập, bảo vệ cả năm endpoint, CRUD, dữ liệu không hợp lệ, lưu dữ liệu qua kết nối database mới và trường hợp Auth Service ngừng hoạt động.

## Order Management

Order Service chạy ở cổng 3002, dùng SQLite và giữ Auth/Product Service làm dependency độc lập. Để chạy, mở terminal thứ ba:

```powershell
npm.cmd run start:orders
```

Order Service có 10 endpoint CRUD trên `/orders` và `/order_items`. Cấu trúc mới tách routes, controllers, services, repositories, clients và validation. Mỗi request cần Bearer Token được xác thực qua Auth Service; khi thêm/sửa chi tiết đơn, service gọi Product Service để kiểm tra tồn kho và lấy giá. Tổng tiền được tính theo cents và các cập nhật dữ liệu liên quan được thực hiện trong transaction SQLite.

Chi tiết endpoint, payload, biến môi trường và cách kiểm thử: [order-service/README.md](./order-service/README.md).
