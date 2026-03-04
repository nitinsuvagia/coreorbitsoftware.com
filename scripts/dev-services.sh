#!/bin/bash
# Development Services Manager
# Manages local microservices for faster development

ACTION="${1:-status}"

case "$ACTION" in
  start)
    echo "🚀 Starting all backend services..."
    # Kill any existing processes on the ports first
    lsof -ti :3000,:3001,:3002,:3003,:3004,:3005,:3006,:3007,:3008,:3009 2>/dev/null | xargs kill -9 2>/dev/null
    
    # Start services in background
    npm run services:dev -- --concurrency=15 > /tmp/oms-services.log 2>&1 &
    echo "Process ID: $!"
    echo "Waiting for services to start..."
    sleep 5
    
    # Check status
    $0 status
    ;;
    
  stop)
    echo "🛑 Stopping all services..."
    pkill -f "turbo run dev"
    pkill -f "tsx watch"
    echo "Services stopped"
    ;;
    
  restart)
    echo "🔄 Restarting services..."
    $0 stop
    sleep 2
    $0 start
    ;;
    
  status)
    echo "📊 Service Status:"
    echo ""
    
    # Check each service port
    check_port() {
      local port=$1
      local name=$2
      if lsof -ti :$port >/dev/null 2>&1; then
        echo "✅ Port $port: $name"
      else
        echo "❌ Port $port: $name (not running)"
      fi
    }
    
    check_port 3000 "API Gateway"
    check_port 3001 "Auth Service"
    check_port 3002 "Employee Service"
    check_port 3003 "Attendance Service"
    check_port 3004 "Project Service"
    check_port 3005 "Task Service"
    check_port 3006 "Notification Service"
    check_port 3007 "Document Service"
    check_port 3008 "Billing Service"
    check_port 3009 "Report Service"
    
    echo ""
    echo "Infrastructure:"
    if lsof -ti :5432 >/dev/null 2>&1; then
      echo "✅ PostgreSQL (port 5432)"
    else
      echo "❌ PostgreSQL (port 5432) - Run: docker compose up -d postgres"
    fi
    
    if lsof -ti :6379 >/dev/null 2>&1; then
      echo "✅ Redis (port 6379)"
    else
      echo "❌ Redis (port 6379) - Run: docker compose up -d redis"
    fi
    ;;
    
  logs)
    if [ -f /tmp/oms-services.log ]; then
      tail -f /tmp/oms-services.log
    else
      echo "No log file found. Services may not be running."
    fi
    ;;
    
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "Commands:"
    echo "  start   - Start all backend services"
    echo "  stop    - Stop all backend services"
    echo "  restart - Restart all backend services"
    echo "  status  - Show service status"
    echo "  logs    - Show service logs (tail -f)"
    exit 1
    ;;
esac
