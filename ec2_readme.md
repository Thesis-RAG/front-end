# Hướng dẫn team truy cập hệ thống trên EC2

Tài liệu này dành cho thành viên team cần truy cập backend đang chạy trên AWS EC2.

## 1. Các link đang sử dụng

### Link public

| Thành phần | Link |
|---|---|
| Frontend Amplify | https://main.d37e45ukb2hsrw.amplifyapp.com |
| API backend | https://rolesawarerag.duckdns.org |
| Swagger API | https://rolesawarerag.duckdns.org/docs |
| ReDoc API | https://rolesawarerag.duckdns.org/redoc |
| OpenAPI JSON | https://rolesawarerag.duckdns.org/openapi.json |
| Health check | https://rolesawarerag.duckdns.org/health |

Health check cần trả về trạng thái của API, MySQL, MinIO và ChromaDB.

### Các service Docker nội bộ

Các service dưới đây không được mở trực tiếp ra Internet. Chúng chỉ truy cập được
từ bên trong Docker network hoặc bằng lệnh `docker compose exec` trên EC2.

| Service | Địa chỉ nội bộ | Mục đích |
|---|---|---|
| FastAPI | `http://api:8000` | Backend API |
| MySQL | `mysql:3306` | Database chính |
| Redis | `redis:6379` | Cache và queue |
| MinIO API | `http://minio:9000` | Object storage |
| MinIO Console | `http://minio:9001` | Quản trị object storage |
| ChromaDB | `http://chroma:8000` | Vector database |
| OpenFGA | `http://openfga:8080` | Phân quyền |
| PostgreSQL FGA | `postgres-fga:5432` | Database của OpenFGA |

Không dùng các địa chỉ nội bộ trên trực tiếp trong trình duyệt của máy cá nhân.
Production hiện chỉ public port 80/443 thông qua Caddy.

## 2. Thông tin EC2

- User SSH: `ubuntu`
- EC2 public IP hiện tại: `98.94.197.217`
- EC2 private hostname: `ip-172-31-38-208`
- Thư mục project: `~/project`
- Domain API: `rolesawarerag.duckdns.org`

Public IP có thể thay đổi nếu instance không dùng Elastic IP. Trước khi SSH,
hãy kiểm tra lại Public IPv4 trong AWS Console và dùng địa chỉ đó.

`ip-172-31-38-208` là hostname/private name bên trong AWS, không dùng làm địa
chỉ SSH từ Internet.

## 3. SSH vào EC2 từ Windows

Mỗi thành viên cần được cấp private key qua kênh bảo mật. Không commit file `.pem`
vào GitHub và không gửi private key trong nhóm chat.

PowerShell:

```powershell
$key = "C:\Work\Thesis\fixbugs\roles-aware-rag.pem"
ssh -o IdentitiesOnly=yes -i $key ubuntu@98.94.197.217
```

Nếu IP đã thay đổi, thay `98.94.197.217` bằng Public IPv4 hiện tại của EC2.

Kiểm tra trước khi SSH:

```powershell
Test-NetConnection 98.94.197.217 -Port 22
```

Kết quả cần có:

```text
TcpTestSucceeded : True
```

Nếu không kết nối được, kiểm tra Security Group của EC2 có rule SSH TCP `22`
cho phép public IP hiện tại của thành viên team hay chưa.

## 4. Kiểm tra Docker trên EC2

```bash
cd ~/project

docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 api
docker compose -f docker-compose.prod.yml logs --tail=100 worker
```

Kiểm tra API từ bên trong EC2:

```bash
curl http://localhost:8000/health
```

Kiểm tra API public:

```bash
curl https://rolesawarerag.duckdns.org/health
```

## 5. Các lệnh vận hành thường dùng

Xem log realtime:

```bash
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f worker
docker compose -f docker-compose.prod.yml logs -f caddy
```

Khởi động lại API sau khi thay đổi `.env`:

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate api
```

Build và deploy lại API sau khi source code đã được push lên GitHub:

```bash
cd ~/project
git pull --ff-only
docker compose -f docker-compose.prod.yml up -d --build --force-recreate api
```

Deploy lại toàn bộ stack:

```bash
docker compose -f docker-compose.prod.yml up -d --build --force-recreate
```

Không chạy `docker compose down -v` trong production vì lệnh này có thể xóa
các volume dữ liệu MySQL, MinIO, ChromaDB và PostgreSQL.

## 6. Cập nhật CORS cho frontend Amplify

Origin frontend hiện tại là:

```text
https://main.d37e45ukb2hsrw.amplifyapp.com
```

Trong file `~/project/.env` trên EC2 cần có:

```dotenv
CORS_ORIGINS=https://main.d37e45ukb2hsrw.amplifyapp.com
```

Sau khi thay đổi:

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate api
```

## 7. Sự cố DNS/DuckDNS

Domain API cần trỏ tới EC2 public IP:

```text
rolesawarerag.duckdns.org -> 98.94.197.217
```

Kiểm tra từ Windows:

```powershell
Resolve-DnsName rolesawarerag.duckdns.org -Server 8.8.8.8 -Type A
```

Nếu kết quả là `208.91.112.55`, mạng đang dùng có thể chặn DuckDNS bằng
FortiGuard/DNS filtering. Không cập nhật DuckDNS thành địa chỉ này; hãy dùng
mạng khác hoặc nhờ quản trị mạng whitelist domain.

## 8. Quy tắc bảo mật

- Chỉ mở public port `80` và `443` cho ứng dụng.
- Port SSH `22` chỉ cho phép IP của thành viên team cần truy cập.
- Không mở public MySQL `3306`, Redis `6379`, MinIO `9000/9001`, ChromaDB,
  OpenFGA hoặc PostgreSQL.
- Không commit `.env`, private key, JWT secret, database password hoặc API key.
- Không chạy `docker compose down -v` trên production.