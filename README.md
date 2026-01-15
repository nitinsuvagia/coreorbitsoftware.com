# Office Management System

> A comprehensive microservices-based office management platform built with Next.js 14, TypeScript, and modern cloud-native technologies.

## 🌟 Overview

The Office Management System is a complete enterprise solution designed to streamline workplace operations through modular microservices architecture. It provides comprehensive tools for employee management, project tracking, attendance monitoring, billing, and organizational administration with multi-tenant support.

## ✨ Key Features

### 🏢 Core Modules
- **Employee Management** - Complete CRUD operations, department management, role assignments
- **Attendance Tracking** - Clock in/out, leave management, holiday calendars
- **Project Management** - Task tracking, milestone management, time logging
- **Document Management** - File storage, version control, collaborative editing
- **HR & Recruitment** - Job postings, candidate management, interview scheduling
- **Billing & Invoicing** - Client billing, subscription management, payment processing
- **Reports & Analytics** - Comprehensive reporting with data visualization

### 🔐 Authentication & Security
- Multi-tenant architecture with tenant isolation
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Platform admin vs tenant user separation
- Email verification and password reset flows

### 🏗️ Architecture Features
- **Microservices Architecture** - 9 independent backend services
- **Event-Driven Communication** - Redis pub/sub and AWS SQS/SNS integration
- **Database Per Service** - Separate PostgreSQL databases with Prisma ORM
- **API Gateway** - Centralized routing, authentication, and rate limiting
- **Multi-tenant Database** - Master database for platform, tenant-specific schemas

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Modern UI components
- **Zustand** - State management
- **React Hook Form** - Form handling and validation

### Backend Services
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **TypeScript** - Type-safe server development
- **Prisma ORM** - Database toolkit and query builder
- **PostgreSQL** - Primary database
- **Redis** - Caching and pub/sub messaging

### Infrastructure
- **Docker** - Containerization
- **Kubernetes** - Container orchestration
- **Terraform** - Infrastructure as Code
- **AWS** - Cloud services (ECS, RDS, ElastiCache, S3)
- **GitHub Actions** - CI/CD pipelines

### Development Tools
- **Turbo** - Monorepo build system
- **ESLint & Prettier** - Code linting and formatting
- **Jest** - Testing framework
- **Husky** - Git hooks

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Client    │────│   API Gateway    │────│  Load Balancer  │
│   (Next.js)     │    │   (Port 3000)    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
         ┌──────────▼─┐  ┌────▼────┐  ┌─▼─────────┐
         │ Auth       │  │Employee │  │Attendance │
         │Service     │  │Service  │  │Service    │
         │(:3001)     │  │(:3002)  │  │(:3003)    │
         └────────────┘  └─────────┘  └───────────┘
                    │
     ┌──────────────┼──────────────────────┐
     │              │                      │
┌────▼────┐  ┌─────▼──────┐  ┌────────────▼─┐
│Document │  │Notification│  │   Billing    │
│Service  │  │Service     │  │   Service    │
│(:3004)  │  │(:3005)     │  │   (:3006)    │
└─────────┘  └────────────┘  └──────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
   ┌────▼────┐ ┌───▼─────┐ ┌───▼──────┐
   │Project  │ │Report   │ │Task      │
   │Service  │ │Service  │ │Service   │
   │(:3007)  │ │(:3008)  │ │(:3009)   │
   └─────────┘ └─────────┘ └──────────┘
```

### Database Architecture
- **Master Database** - Platform-level data (tenants, admin users, subscriptions)
- **Tenant Databases** - Isolated schemas per organization
- **Service-Specific Tables** - Each microservice manages its domain

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- Docker (optional)
- Git

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/nitinsuvagia/coreorbitsoftware.com.git
   cd office-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your database and service configurations
   ```

4. **Database Setup**
   ```bash
   # Run database migrations
   npm run db:migrate
   
   # Seed initial data
   npm run db:seed
   ```

### Development

#### Quick Start (All Services)
```bash
# Start all services in development mode
npm run dev

# Or use the development script
./scripts/dev-start.sh
```

#### Individual Service Development
```bash
# Frontend only
cd apps/web && npm run dev

# Specific service
cd services/auth-service && npm run dev
```

#### Using Docker
```bash
# Development with Docker Compose
docker-compose -f docker-compose.dev.yml up

# Production build
docker-compose up --build
```

### Available Scripts

```bash
# Development
npm run dev                 # Start all services
npm run dev:web            # Frontend only
npm run dev:services       # Backend services only

# Building
npm run build              # Build all packages
npm run build:web          # Build frontend
npm run build:services     # Build all services

# Database
npm run db:migrate         # Run migrations
npm run db:seed           # Seed data
npm run db:reset          # Reset database

# Testing
npm run test              # Run all tests
npm run test:unit         # Unit tests only
npm run test:e2e          # End-to-end tests

# Deployment
npm run deploy:dev        # Deploy to development
npm run deploy:prod       # Deploy to production
```

## 🌐 Service Endpoints

| Service | Port | Health Check | Description |
|---------|------|-------------|-------------|
| Web App | 3000 | `/` | Next.js frontend application |
| API Gateway | 3000 | `/health` | Central routing and authentication |
| Auth Service | 3001 | `/health` | Authentication and authorization |
| Employee Service | 3002 | `/health` | Employee and HR management |
| Attendance Service | 3003 | `/health` | Time tracking and attendance |
| Document Service | 3004 | `/health` | File and document management |
| Notification Service | 3005 | `/health` | Email, push, and in-app notifications |
| Billing Service | 3006 | `/health` | Invoicing and payment processing |
| Project Service | 3007 | `/health` | Project and task management |
| Report Service | 3008 | `/health` | Analytics and reporting |
| Task Service | 3009 | `/health` | Task tracking and workflows |

## 📁 Project Structure

```
├── apps/
│   └── web/                 # Next.js frontend application
├── services/               # Backend microservices
│   ├── api-gateway/        # Central API gateway
│   ├── auth-service/       # Authentication service
│   ├── employee-service/   # Employee management
│   ├── attendance-service/ # Time tracking
│   ├── document-service/   # Document management
│   ├── notification-service/ # Notifications
│   ├── billing-service/    # Billing and payments
│   ├── project-service/    # Project management
│   ├── report-service/     # Reports and analytics
│   └── task-service/       # Task management
├── packages/               # Shared packages
│   ├── database/          # Prisma schemas and utilities
│   ├── shared-types/      # TypeScript type definitions
│   ├── shared-utils/      # Common utilities
│   ├── event-bus/         # Event system
│   └── tenant-db-manager/ # Multi-tenant database manager
├── infrastructure/        # Infrastructure as Code
│   ├── terraform/         # AWS infrastructure
│   └── k8s/              # Kubernetes manifests
├── scripts/              # Development and deployment scripts
└── docs/                 # Documentation
```

## 🔧 Configuration

### Environment Variables

Key environment variables for each service:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Email (Notification Service)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password

# AWS (Production)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Stripe (Billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Database Configuration

The system uses a multi-tenant database architecture:

- **Master Database**: Platform-level data (tenants, subscriptions, platform admin users)
- **Tenant Schemas**: Isolated data per organization within the same database

## 🧪 Testing

### Running Tests
```bash
# All tests
npm run test

# Specific service tests
cd services/auth-service && npm test

# Frontend tests
cd apps/web && npm test

# E2E tests
npm run test:e2e
```

### Test Coverage
- Unit tests for all services
- Integration tests for API endpoints
- E2E tests for critical user flows
- Database migration tests

## 🚢 Deployment

### Development Deployment
```bash
# Using Docker Compose
docker-compose -f docker-compose.dev.yml up

# Using scripts
./scripts/dev-docker.sh
```

### Production Deployment

#### AWS ECS (Recommended)
```bash
# Build and push images
./scripts/aws-build-push.sh

# Deploy infrastructure
cd infrastructure/terraform && terraform apply

# Deploy services
./scripts/aws-deploy.sh
```

#### Kubernetes
```bash
# Apply manifests
kubectl apply -f k8s/

# Or use the setup script
./scripts/minikube-setup.sh
```

### CI/CD

GitHub Actions workflows handle:
- Automated testing on pull requests
- Building and pushing Docker images
- Deploying to staging and production environments
- Database migrations
- Security scanning

## 📊 Monitoring & Observability

### Health Checks
All services expose health endpoints for monitoring:
```bash
curl http://localhost:3001/health  # Auth service
curl http://localhost:3002/health  # Employee service
```

### Logging
- Centralized logging with structured JSON format
- Log aggregation using ELK stack (Elasticsearch, Logstash, Kibana)
- Application and infrastructure metrics

### Metrics
- Application performance monitoring
- Database query performance
- API response times and error rates
- Business metrics and KPIs

## 🔒 Security

### Authentication
- JWT-based authentication with access and refresh tokens
- Multi-factor authentication (MFA) support
- OAuth 2.0 integration for third-party providers

### Data Protection
- Encryption at rest and in transit
- GDPR compliance features
- Data retention policies
- Audit logging for compliance

### Infrastructure Security
- Network isolation with VPC
- WAF (Web Application Firewall)
- DDoS protection
- Regular security scanning

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow conventional commits
- Ensure CI passes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](./docs/API.md)
- [Database Schema](./docs/DATABASE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Development Setup](./docs/DEVELOPMENT.md)

### Getting Help
- Create an issue for bug reports
- Join our [Discord community](https://discord.gg/your-server)
- Email: support@coreorbitsoftware.com

### Roadmap
- [ ] Mobile application (React Native)
- [ ] Advanced analytics dashboard
- [ ] Integration with popular tools (Slack, Microsoft Teams)
- [ ] AI-powered insights and recommendations
- [ ] Advanced workflow automation

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework for production
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Turbo](https://turbo.build/) - High-performance build system

---

**Built with ❤️ by [Core Orbit Software](https://coreorbitsoftware.com)**

For more information, visit our [website](https://coreorbitsoftware.com) or check out our [documentation](./docs/).