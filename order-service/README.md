# Bài 4 — Order Management

Order Service dùng Node.js, Express 5, CommonJS và SQLite (`node:sqlite`), mặc định chạy ở cổng 3002. Auth Service (3000) và Product Service (3001) được giữ nguyên.

## Cấu trúc

| Thư mục/tệp | Trách nhiệm |
| --- | --- |
| `routes/` | Khai báo endpoint và gắn controller |
| `controllers/` | Đọc request, gọi service và tạo HTTP response |
| `services/` | Quy tắc nghiệp vụ, kiểm tra tồn kho và điều phối transaction |
| `repositories/` | Truy vấn SQLite và ánh xạ kết quả |
| `clients/` | Gọi Auth Service và Product Service qua HTTP |
| `validation/` | Kiểm tra ID và dữ liệu request |
| `middleware/` | Xác thực Bearer Token qua Auth Service |
| `database.js` | Mở SQLite, tạo bảng và bật khóa ngoại |

Routes không chứa truy vấn hay nghiệp vụ. Service lấy giá hiện tại từ Product Service thay vì tin giá client gửi. Tiền được quy đổi sang số nguyên cents để nhân và cộng, sau đó lưu lại theo đơn vị tiền tệ. Tạo đơn, thêm/sửa/xóa chi tiết và xóa đơn dùng SQLite transaction; khi chuyển chi tiết sang đơn khác, tổng của cả hai đơn được đồng bộ trong cùng transaction.

## Chạy

Yêu cầu Node.js >= 22.13.0. Từ thư mục gốc dự án, mở ba terminal:

```powershell
npm.cmd start
npm.cmd run start:products
npm.cmd run start:orders
```

Order Service mặc định dùng `order-service/data/orders.sqlite`. Có thể cấu hình `ORDER_PORT`, `ORDER_DB_PATH`, `AUTH_SERVICE_URL` và `PRODUCT_SERVICE_URL`. Địa chỉ service là URL gốc, không kèm `/auth` hay `/products`. Nếu chưa có dependency, chạy `npm.cmd install`.

## API

Tất cả 10 endpoint yêu cầu `Authorization: Bearer <token>`.

| Method | Endpoint | Thành công |
| --- | --- | --- |
| GET | `/orders` | 200, danh sách đơn |
| POST | `/orders` | 201, đơn mới kèm `items` |
| GET | `/orders/:id` | 200, đơn kèm `items` |
| PUT | `/orders/:id` | 200, cập nhật trạng thái |
| DELETE | `/orders/:id` | 204 |
| GET | `/order_items` | 200, danh sách chi tiết |
| POST | `/order_items` | 201, chi tiết mới |
| GET | `/order_items/:id` | 200, chi tiết đơn |
| PUT | `/order_items/:id` | 200, cập nhật chi tiết |
| DELETE | `/order_items/:id` | 204 |

Tạo đơn bằng `POST /orders`:

```json
{
  "customer_name": "Nguyen Thanh Tam",
  "customer_email": "tam@example.com",
  "items": [{ "product_id": 1, "quantity": 2 }]
}
```

Cập nhật trạng thái bằng `PUT /orders/:id` với `{"status":"completed"}`. Trạng thái hợp lệ là `pending`, `completed`, `cancelled`.

Thêm chi tiết bằng `POST /order_items` với `{"order_id":1,"product_id":1,"quantity":3}`. Có thể cập nhật từng trường hoặc chuyển chi tiết sang đơn khác bằng `PUT /order_items/:id`. Không chấp nhận giá do client gửi; mỗi lần thêm hoặc sửa chi tiết, service xác minh sản phẩm/tồn kho và lấy tên, giá từ Product Service.

Lỗi được trả dưới dạng `{"message":"..."}`: 400 cho dữ liệu không hợp lệ hoặc thiếu tồn kho; 401 cho thiếu/sai định dạng Bearer Token; 403 cho token không hợp lệ/hết hạn; 404 cho tài nguyên không tồn tại; 503 khi service phụ thuộc không khả dụng (timeout 5 giây); 500 cho lỗi nội bộ.

## Kiểm thử

```powershell
npm.cmd test
```

Bộ test tích hợp kiểm tra cả 10 endpoint, xác thực, tính tổng, chuyển/xóa chi tiết, giới hạn tồn kho, rollback khi ghi SQLite lỗi và các trường hợp service phụ thuộc lỗi.
