For COPY version:
bash
# Build
docker build -f Dockerfile.copy -t dockerfile.copy .

# Check size
docker images dockerfile.copy

# Run
docker run -d --name copy-test -p 8087:3000 dockerfile.copy

# Test
curl http://localhost:8080/

# Clean up
docker stop copy-test && docker rm copy-test

najirabanum@NAJIRAs-MacBook-Air docker-multistage % docker images dockerfile.copy
IMAGE              ID             DISK USAGE   CONTENT SIZE   EXTRA
dockerfile.copy:latest   45f9275a4890        185MB         45.6MB        


For REINSTALL version:
bash
# Build
docker build -f Dockerfile.reinstall -t test-reinstall .

# Check size
docker images test-reinstall

# Run
docker run -d --name reinstall-test -p 8081:3000 test-reinstall

# Test
curl http://localhost:8081/

# Clean up
docker stop reinstall-test && docker rm reinstall-test

najirabanum@NAJIRAs-MacBook-Air docker-multistage % docker images test-reinstall
IMAGE                   ID             DISK USAGE   CONTENT SIZE   EXTRA
test-reinstall:latest   17fab3033d20        188MB         46.4MB   


# if the port and container name already exists use these commands in local not in production
# Stop ALL running containers
docker stop $(docker ps -aq) 2>/dev/null

# Remove ALL containers
docker rm $(docker ps -aq) 2>/dev/null

Aspect	   COPY	      REINSTALL	    Winner
Imagesize	185MB	    188MB	     COPY ✅
Buildspeed	Faster	    Slower	     COPY ✅
Safety      Riskier	    Safer	     REINSTALL ✅
Best for	Dev/Test   Production	  -



for distroless check 
bash
# Pull distroless Node.js image
docker pull gcr.io/distroless/nodejs18-debian11

# Check size
docker images | grep distroless

# Try to run shell (will FAIL - that's good for security!)
docker run --rm -it gcr.io/distroless/nodejs18-debian11 sh
# Error: exec: "sh": executable file not found

najirabanum@NAJIRAs-MacBook-Air docker-multistage % docker images | grep distroless
WARNING: This output is designed for human readability. For machine-readable output, please use --format.
gcr.io/distroless/nodejs18-debian11:latest   c3627dd28e9e        166MB         48.3MB        


Distroless

# 1. Regular (1GB) - Has everything
FROM node:20

# 2. Alpine (70MB) - Has shell, package manager
FROM node:20-alpine

# 3. Distroless (50MB) - Only runtime, NO shell
FROM gcr.io/distroless/nodejs20-debian11


#health check 
# Healthcheck - checks if app is responding every 30 seconds
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

1f0cb770773b   dockerfile.copy             "docker-entrypoint.s…"   4 seconds ago    Up 4 seconds (health: starting)   0.0.0.0:8087->3000/tcp, [::]:8087->3000/tcp   copy-test

