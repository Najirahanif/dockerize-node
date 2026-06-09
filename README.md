# Dockerize Node

A simple Node.js Express backend running inside a Docker container.

## Quick Start

### Prerequisites
- Docker installed on your machine
- Node.js (only for local development)

### Run with Docker

```bash
# Build the image
docker build -t dockerize-node .

# Run the container
docker run -d -p 8080:3000 --name my-node-app dockerize-node

# Test it's working
curl http://localhost:8080/

started with docker-compose.yaml file
Docker Compose = A tool to run multiple containers together with one command.
docker-compose up -d

==============================>>>>>>>>>>>with volumes>>>>>>>>>>>>>>>>=========================================
# Start container
docker compose up -d

# Create a log file in the volume
docker exec dockerize-node-app sh -c "echo 'Important log' > /app/logs/app.log"

# Verify it exists
docker exec dockerize-node-app cat /app/logs/app.log
# Output: Important log

# Stop and remove container
docker compose down

# Start new container
docker compose up -d

# Read the file again
docker exec dockerize-node-app cat /app/logs/app.log
# Output: Important log
# ✅ FILE IS STILL THERE! (Because it's in volume)

types of volume
==============================>>>>>>>>>>>Bind mount >>>>>>>>>>>>>>>>=========================================

# 🐳 dockerize-node - Bind Mount Demo

## What is a Bind Mount?

A **bind mount** links a folder on your Mac directly to a folder inside the Docker container.
this also when the docker is down and up data still persists but in the local mac 

```yaml
volumes:
  - ./logs:/app/logs    # Your Mac folder → Container folder

   1. Start the container
docker compose up -d

# 2. Make a request
curl http://localhost:9090/

# 3. Check your Mac - logs appear here!
cat ./logs/access.log

==============================>>>>>>>>>>> Anonymous name >>>>>>>>>>>>>>>>=========================================
# Start container

# dockerize-node - Anonymous Volume Demo

## What's an Anonymous Volume?

In my docker-compose.yml, I have:
```yaml
volumes:
  - /app/logs    # ← ANONYMOUS volume (no name)

>>>>>> dockerize-node % docker inspect dockerize-node-app | grep -A 10 Mounts
            "Mounts": [
                {
                    "Type": "volume",
                    "Target": "/app/logs",
                    "VolumeOptions": {}
                }
            ],
            "MaskedPaths": [
                "/proc/acpi",
                "/proc/asound",
                "/proc/interrupts",
--
        "Mounts": [
            {
                "Type": "volume",
                "Name": "9092743a71678160c7b93f57e6e088e44a0054745cef671e4923a2f1ad4af3e0", #this is therandom id
                "Source": "/var/lib/docker/volumes/9092743a71678160c7b93f57e6e088e44a0054745cef671e4923a2f1ad4af3e0/_data",
                "Destination": "/app/logs",
                "Driver": "local",
                "Mode": "z",
                "RW": true,
                "Propagation": ""
            }

# Dockerize Node - Frontend + Backend

## What is this?
- **Frontend:** Web page you see (http://localhost:8081)
- **Backend:** API that provides data (http://localhost:9090)

## Quick Start

```bash
# Start both
docker compose up -d

# Open frontend
open http://localhost:8081

to view all the data in using the cli command
najirabanum@NAJIRAs-MacBook-Air dockerize-node % ls -la ./data/
total 16
-rw-r--r--   1 najirabanum  staff   63 Jun  8 16:27 we.json
-rw-r--r--   1 najirabanum  staff   64 Jun  8 16:46 we2.json

najirabanum@NAJIRAs-MacBook-Air dockerize-node % cat ./data/we2.json   
{"key":"we2","value":"2","timestamp":"2026-06-08T11:16:30.438Z"}% 

Get Data via API
curl http://localhost:9090/data/we


without netwroks
Even though you commented out dockerize-network, Docker created a default network called dockerize-node_default and connected all containers to it!
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>example >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>.
Frontend is assigned to frontend-network only

MongoDB is assigned to backend-network only

Different networks = CANNOT communicate

Backend is assigned to BOTH networks (acts as a bridge)

That's why ping mongo from Frontend gives bad address error

The Code:
yaml
frontend: networks: [frontend-network]     # Only network A
backend:  networks: [frontend-network, backend-network]  # Both networks  
mongo:    networks: [backend-network]      
when frontend tries to get mongo 
najirabanum@NAJIRAs-MacBook-Air dockerize-node % docker exec dockerize-node-frontend ping -c 2 mongo
ping: bad address 'mongo'