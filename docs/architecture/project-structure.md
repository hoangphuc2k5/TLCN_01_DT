# Cấu trúc repository

```text
.
├── .github/workflows/       # CI, build image và phát hành GHCR
├── ExpressJS/
│   ├── scripts/             # CLI/worker/fixture entry points
│   └── src/
│       ├── config/          # composition root, singleton và runtime adapters
│       ├── controllers/     # admin | teacher | finance | operations | common
│       ├── dtos/            # admin | teacher | finance | operations | common
│       ├── middleware/      # common cross-cutting middleware
│       ├── models/          # admin | teacher | finance | operations | common schemas
│       ├── repository/      # admin | teacher | finance | common persistence
│       ├── routes/          # admin | teacher | finance | operations | common endpoints
│       ├── services/        # admin | teacher | finance | common business logic
│       ├── tests/           # admin | teacher | finance | common tests
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

Backend dùng cấu trúc `layer/role/<feature>.<layer>.js`. `admin`, `teacher`, `finance` và `operations` biểu thị role sở hữu chính của nghiệp vụ; `common` chứa chức năng dùng chung hoặc hạ tầng xuyên suốt. Một module chỉ có một nơi sở hữu, các role khác tái sử dụng qua service/repository thay vì nhân bản mã. Frontend dùng PascalCase cho React component và kebab-case cho feature folder.
