# Run both client and server in development mode
dev: SERVER_DIR=$(shell pwd)/server
dev: CLIENT_DIR=$(shell pwd)/client
dev:
	osascript -e 'tell app "Terminal" to do script "cd ${SERVER_DIR} && npm run dev"'
	osascript -e 'tell app "Terminal" to do script "cd ${CLIENT_DIR} && npm run dev"'

# osascript -e 'tell app "Terminal" to do script "cd ${SERVER_DIR} && npm run dev"'
# osascript -e 'tell app "Terminal" to do script "cd ${CLIENT_DIR} && npm run dev"'

# # Build both client and server
# build:
#     @echo "Building client and server..."
#     npm run build --prefix client
#     npm run build --prefix server

# # Clean build artifacts
# clean:
#     @echo "Cleaning build artifacts..."
#     rm -rf client/build server/dist

# # Start the server in production mode
# start:
#     @echo "Starting server in production mode..."
#     node server/dist/server.js