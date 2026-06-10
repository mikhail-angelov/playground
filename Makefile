HOST := $(shell grep '^HOST=' .env 2>/dev/null | cut -d '=' -f 2)

# Build both client and server
build:
	@echo "Building nextjs..."
	npm run build

migrate:
	@echo "Running migrations..."
	scp root@$(HOST):/opt/playground/database.sqlite database-prod.sqlite
	npm run migration:run
	scp database-prod.sqlite root@$(HOST):/opt/playground/database.sqlite

install:
	@echo "Installing server..."
	-ssh root@$(HOST) "mkdir -p /opt/playground"
	scp ./.env.prod root@$(HOST):/opt/playground/.env
	scp ./docker-compose-prod.yml root@$(HOST):/opt/playground/docker-compose.yml

deploy:
	@echo "Deploying server..."
	ssh root@$(HOST) "docker pull ghcr.io/mikhail-angelov/playground/playground:latest"
	ssh root@$(HOST) "cd /opt/playground && docker compose down"
	ssh root@$(HOST) "cd /opt/playground && docker compose up -d"
