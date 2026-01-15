# 🚀 Office Management - Minikube Deployment Guide

This guide walks you through deploying the Office Management System to a local Minikube cluster.

## Prerequisites

- **Docker Desktop** (running)
- **Minikube** (`brew install minikube`)
- **kubectl** (`brew install kubectl`)
- At least **8GB RAM** and **4 CPU cores** available

## Quick Start

### 1. Setup Minikube

```bash
./scripts/minikube-setup.sh
```

This will:
- Start Minikube with sufficient resources (4 CPUs, 8GB RAM)
- Enable required addons (ingress, metrics-server, storage)
- Configure Docker to use Minikube's Docker daemon
- Add hosts entries for local domain access

### 2. Build Docker Images

```bash
./scripts/build-images.sh
```

This builds all 11 Docker images directly in Minikube's Docker environment:
- API Gateway (port 3000)
- Auth Service (port 3001)
- Employee Service (port 3002)
- Attendance Service (port 3003)
- Project Service (port 3004)
- Task Service (port 3005)
- Notification Service (port 3006)
- Document Service (port 3007)
- Billing Service (port 3008)
- Report Service (port 3009)
- Web App (port 4000)

### 3. Deploy to Minikube

```bash
./scripts/deploy.sh
```

This deploys:
- Namespace and base configs (ConfigMap, Secrets)
- PostgreSQL and Redis databases
- All backend microservices
- Frontend web application
- Ingress for routing

### 4. Access the Application

After deployment, access the application:

| Service | URL |
|---------|-----|
| Web App (Ingress) | http://office.local |
| Web App (NodePort) | http://$(minikube ip):30080 |
| API Gateway (NodePort) | http://$(minikube ip):30000 |
| Kubernetes Dashboard | `minikube dashboard` |

## Useful Commands

### Check Status
```bash
./scripts/status.sh
```

### View Logs
```bash
# All pods
kubectl logs -f -l app=api-gateway -n office-management

# Specific pod
kubectl logs -f <pod-name> -n office-management
```

### Run Migrations
```bash
./scripts/migrate.sh
```

### Access Database
```bash
# Port forward PostgreSQL
kubectl port-forward svc/postgres 5432:5432 -n office-management

# Connect with psql
psql -h localhost -U postgres -d office_master
# Password: postgres123
```

### Scale Services
```bash
kubectl scale deployment api-gateway --replicas=3 -n office-management
```

### Restart a Service
```bash
kubectl rollout restart deployment api-gateway -n office-management
```

### Cleanup
```bash
./scripts/teardown.sh
```

## Directory Structure

```
k8s/
├── base/
│   ├── namespace.yaml       # Kubernetes namespace
│   ├── configmap.yaml       # Non-sensitive configuration
│   └── secrets.yaml         # Sensitive data (passwords, keys)
├── database/
│   ├── postgres.yaml        # PostgreSQL deployment
│   └── redis.yaml           # Redis deployment
├── services/
│   ├── api-gateway.yaml     # API Gateway deployment
│   ├── auth-service.yaml    # Auth service deployment
│   ├── employee-service.yaml
│   ├── attendance-service.yaml
│   ├── project-service.yaml
│   ├── task-service.yaml
│   ├── notification-service.yaml
│   ├── document-service.yaml
│   ├── billing-service.yaml
│   ├── report-service.yaml
│   └── web.yaml             # Frontend deployment
└── ingress/
    └── ingress.yaml         # Ingress configuration
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Ingress (nginx)                       │
│              office.local / *.office.local                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
    ┌──────────┐                   ┌──────────┐
    │   Web    │                   │   API    │
    │  (Next)  │                   │ Gateway  │
    │  :4000   │                   │  :3000   │
    └──────────┘                   └────┬─────┘
                                        │
          ┌─────────────────────────────┼─────────────────────────────┐
          │           │           │     │     │           │           │
          ▼           ▼           ▼     ▼     ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐ ... ┌─────────┐ ┌─────────┐
    │  Auth   │ │Employee │ │Attendnce│     │ Billing │ │ Report  │
    │ :3001   │ │ :3002   │ │ :3003   │     │ :3008   │ │ :3009   │
    └────┬────┘ └────┬────┘ └────┬────┘     └────┬────┘ └────┬────┘
         │           │           │               │           │
         └───────────┴───────────┴───────┬───────┴───────────┘
                                         │
                           ┌─────────────┴─────────────┐
                           │                           │
                           ▼                           ▼
                    ┌──────────────┐           ┌──────────────┐
                    │  PostgreSQL  │           │    Redis     │
                    │    :5432     │           │    :6379     │
                    └──────────────┘           └──────────────┘
```

## Troubleshooting

### Pods stuck in Pending
```bash
kubectl describe pod <pod-name> -n office-management
```
Usually caused by insufficient resources. Try:
```bash
minikube stop
minikube start --cpus=4 --memory=8192
```

### ImagePullBackOff
Images aren't built in Minikube's Docker. Run:
```bash
eval $(minikube docker-env)
./scripts/build-images.sh
```

### Database connection errors
Wait for PostgreSQL to be ready:
```bash
kubectl wait --for=condition=ready pod -l app=postgres -n office-management --timeout=120s
```

### Ingress not working
Make sure ingress addon is enabled:
```bash
minikube addons enable ingress
```

And hosts file has entries:
```bash
echo "$(minikube ip) office.local" | sudo tee -a /etc/hosts
```

## Environment Variables

### ConfigMap (app-config)
- Service URLs
- Database host/port
- Redis connection
- Storage settings

### Secrets (app-secrets)
- DATABASE_PASSWORD
- JWT_SECRET
- STRIPE keys
- AWS credentials

To update secrets:
```bash
kubectl edit secret app-secrets -n office-management
```

## Resource Limits

Each service is configured with:
- **Requests**: 100m CPU, 128Mi memory
- **Limits**: 200m CPU, 256Mi memory

For production, increase these values based on load testing.
