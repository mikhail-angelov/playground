# Run both client and server in development mode
dev: SERVER_DIR=$(shell pwd)/server
dev: CLIENT_DIR=$(shell pwd)/client
dev:
	osascript -e 'tell app "Terminal" to do script "cd ${SERVER_DIR} && npm run dev"'
	osascript -e 'tell app "Terminal" to do script "cd ${CLIENT_DIR} && npm run dev"'

# Build both client and server
build:
	@echo "Building client and server..."
	npm run build --prefix client
	npm run build --prefix server

install:
	@echo "Installing server..."
	-ssh root@js2go.ru "mkdir -p /opt/playground"
	scp ./.env.prod root@js2go.ru:/opt/playground/.env
	scp ./docker-compose.yml root@js2go.ru:/opt/playground/docker-compose.yml

deploy:
	@echo "Deploying server..."
	ssh root@js2go.ru "docker pull docker.pkg.github.com/mikhail-angelov/playground/playground:latest"
	ssh root@js2go.ru "cd /opt/playground && docker-compose down"
	ssh root@js2go.ru "cd /opt/playground && docker-compose up -d"