# Cấu trúc repository

```text
.
├── .github/workflows/       # CI, build image và phát hành GHCR
├── ExpressJS/
│   ├── scripts/             # CLI/worker/fixture entry points
│   └── src/
│       ├── config/          # composition root, singleton và runtime adapters
│       ├── controllers/     # administration | finance | common
│       ├── dtos/            # administration | finance | common
│       ├── middleware/      # common cross-cutting middleware
│       ├── models/          # administration | finance | common schemas
│       ├── repository/      # administration | finance | common persistence
│       ├── routes/          # administration | finance | common endpoints
│       ├── services/        # administration | finance | common business logic
│       ├── tests/           # administration | finance | common tests
│       ├── utils/           # common pure helpers
│       ├── app.js           # cấu hình Express
│       └── server.js        # bootstrap/listen
├── ReactJS/
│   ├── e2e/                 # Playwright theo chức năng
│   ├── tests/unit/          # unit test frontend
│   └── src/
│       ├── components/      # component dùng chung và guards
│       ├── config/          # HTTP client/runtime config
│       ├── constants/       # hằng số giao diện
│       ├── features/        # page và component theo nghiệp vụ
│       ├── layouts/         # khung giao diện
│       ├── services/        # API service
│       ├── store/           # Redux store/slices
│       ├── styles/          # CSS dùng chung
│       ├── utils/           # helper thuần
│       ├── App.jsx
│       └── main.jsx
└── docs/
    ├── architecture/
    ├── deployment/
    ├── features/
    ├── planning/
    └── quality/
```

Backend dùng cấu trúc `layer/role/<feature>.<layer>.js`. `administration` gom nghiệp vụ quản trị hệ thống/trường, `finance` chứa nghiệp vụ do khối tài chính sở hữu, và `common` chứa chức năng dùng bởi nhiều role hoặc hạ tầng dùng chung. Không tạo thư mục riêng cho giáo viên, học sinh hay phụ huynh khi cùng một module phục vụ nhiều nhóm. Frontend dùng PascalCase cho React component và kebab-case cho feature folder.
