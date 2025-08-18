# Build both client and server
build:
	@echo "Building nextjs..."
	npm run build

migrate:
	@echo "Running migrations..."
	scp root@js2go.ru:/opt/playground/database.sqlite database-prod.sqlite
	npm run migration:run
	scp database-prod.sqlite root@js2go.ru:/opt/playground/database.sqlite

install:
	@echo "Installing server..."
	-ssh root@js2go.ru "mkdir -p /opt/playground"
	scp ./.env.prod root@js2go.ru:/opt/playground/.env
	scp ./docker-compose.yml root@js2go.ru:/opt/playground/docker-compose.yml

deploy:
	@echo "Deploying server..."
	ssh root@js2go.ru "docker pull docker.pkg.github.com/mikhail-angelov/playground/playground:latest"
	ssh root@js2go.ru "cd /opt/playground && docker compose down"
	ssh root@js2go.ru "cd /opt/playground && docker compose up -d"
