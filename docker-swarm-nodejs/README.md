# 🐳 Docker Swarm Node.js Project

A super simple project to learn Docker Swarm with Node.js and Redis caching.

## 📋 What is Docker Swarm?

Docker Swarm turns multiple Docker servers into one big virtual server. It helps you:
- Run multiple copies of your app for high availability
- Automatically restart crashed containers
- Distribute traffic between containers (load balancing)
- Update your app without downtime

## 🏗️ What This Project Does

This project has 3 microservices:
- **API Gateway** - Entry point (http://localhost:8080)
- **User Service** - Returns list of users 
- **Product Service** - Returns list of products
- **Redis** - Caches data for faster responses

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Docker Desktop installed
- Node.js (optional - Docker handles this)

### Step 1: Clone/Create Project
```bash
mkdir my-swarm-project
cd my-swarm-project

Step 1: Start Docker Swarm
# Turn on Swarm mode
docker swarm init

Step 2: Deploy the Project

# Build images
docker compose build

# Deploy to Swarm
docker stack deploy -c docker-compose.yaml demo

# Check if running
docker stack services demo

>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
Remove all the containers and add again
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
najirabanum@NAJIRAs-MacBook-Air docker-swarm-nodejs % docker stack rm demo
najirabanum@NAJIRAs-MacBook-Air docker-swarm-nodejs % docker swarm leave --force
Node left the swarm.
najirabanum@NAJIRAs-MacBook-Air docker-swarm-nodejs % docker rmi $(docker images -q) 2>/dev/null

and again restart with init 

>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
Command to check for the replicas
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

docker service ps demo_api-gateway demo_user-service demo_product-service demo_redis

najirabanum@NAJIRAs-MacBook-Air docker-swarm-nodejs % docker service ps demo_api-gateway demo_user-service demo_product-service demo_redis
ID             NAME                     IMAGE                       NODE             DESIRED STATE   CURRENT STATE            ERROR     PORTS
ma3l799z7czr   demo_api-gateway.1       swarm-demo/gateway:latest   docker-desktop   Running         Running 46 seconds ago             
qvlst777oz96   demo_api-gateway.2       swarm-demo/gateway:latest   docker-desktop   Running         Running 46 seconds ago             
37w5u75wc0y0   demo_product-service.1   swarm-demo/product:latest   docker-desktop   Running         Running 41 seconds ago             
9tbomc76783a   demo_product-service.2   swarm-demo/product:latest   docker-desktop   Running         Running 41 seconds ago             
cddw5fk28up4   demo_product-service.3   swarm-demo/product:latest   docker-desktop   Running         Running 41 seconds ago             
f3s0seenpvzr   demo_redis.1             redis:7-alpine              docker-desktop   Running         Running 51 seconds ago             
7mbgm3xbi0ya   demo_user-service.1      swarm-demo/user:latest      docker-desktop   Running         Running 44 seconds ago             
mqabvvdihwuk   demo_user-service.2      swarm-demo/user:latest      docker-desktop   Running         Running 44 seconds ago             
31ekes25p1fr   demo_user-service.3      swarm-demo/user:latest      docker-desktop   Running         Running 44 seconds ago             

>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
Build the Missing Image
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

Step 1: Build the Missing Image
docker build -t swarm-demo/gateway:latest ./services/ApiGateway
What this command does:
Reads the Dockerfile in ./services/ApiGateway
Copies your Node.js code
Runs npm install to get dependencies
Creates an image named swarm-demo/gateway:latest
Stores it locally on your machine

Step 2: Verify Image Exists
docker images | grep swarm-demo
Now Docker has the image locally.

Step 3: Force Update the Service
docker service update --force demo_api-gateway

>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
when there is any changes in yaml file build again or use these commands>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

# Remove entire stack - all related resources are removed
docker stack rm demo
# Wait for removal
sleep 5

# Deploy new stack with volume
docker stack deploy -c docker-compose.yaml demo

# Check volume was created
docker volume ls | grep redis-data


Option 1: Force restart the service
# Force restart API Gateway
docker service update --force demo_api-gateway


Option 2: Remove and redeploy
# Remove just the gateway service
docker service rm demo_api-gateway

# Redeploy everything
docker stack deploy -c docker-compose.yaml demo

#just the names
docker ps --format "{{.Names}}" | grep gateway

>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
Autorecovery check
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
#run this command in terminal 1:
while true; do 
    clear
    echo "=== SWARM SERVICE STATUS ==="
    echo ""
    docker service ps demo_api-gateway
    echo ""
    echo "Press Ctrl+C to stop"
    sleep 3
done
 #check this in terminal 2
docker ps --format "{{.Names}}" | grep gateway #gets all the gateway name
//demo_api-gateway.2.jogq2ekz9bhle1hbauczb4wu7
//demo_api-gateway.1.v601npt6vbtzate4ihwjxdb14

docker kill demo_api-gateway.1.v601npt6vbtzate4ihwjxdb14
then check in terminal 1 # it is will be autocreated and killed one is under shutdown

>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
Service Scaling Up/Down.  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
#Scale UP from 2 to 5 replicas
docker service scale demo_api-gateway=5

# Watch new containers appear
watch -n 2 'docker service ps demo_api-gateway'

# Scale DOWN from 5 to 2 replicas
docker service scale demo_api-gateway=2

# Verify removal
docker service ps demo_api-gateway

>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> 
Rolling Update (Zero Downtime)
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
Rolling update updates containers one by one instead of stopping all at once.
--update-parallelism 1 updates a single replica at a time.
--update-delay 10s waits 10 seconds before updating the next replica.
Service remains available throughout the update process.
This approach provides zero downtime deployments and safer application upgrades.

Step 1: Build a new version
bash
# Build with new tag
docker build -t swarm-demo/gateway:v3 ./services/ApiGateway
Step 2: Update the service
bash
docker service update --image swarm-demo/gateway:v3 demo_api-gateway

#in terminal 2
while true; do 
    clear
    echo "=== ROLLING UPDATE STATUS ==="
    echo ""
    docker service ps demo_api-gateway
    echo ""
    echo "Press Ctrl+C to stop"
    sleep 2
done

Container	Image	Status	What's happening
demo_api-gateway.1	:v3	Ready	🆕 New version ready to start
demo_api-gateway.2	:v3	Running	✅ Already on new version

Container	Image	Status	What's happening
demo_api-gateway.2	:v3	Ready	🆕 New version ready to start
demo_api-gateway.1	:v3	Running	✅ Already on new version

after few seconds 
Both containers will be Running with :v3





>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
Regular Docker = You're responsible for everything
Docker Swarm = Swarm watches and fixes problems automatically
Without Swarm, when a container dies, it's GONE forever until you manually restart it!
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
 Resource Exhaustion
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

najirabanum@NAJIRAs-MacBook-Air docker-swarm-nodejs % docker service update --limit-memory 20M demo_user-service 
demo_user-service
overall progress: 2 out of 3 tasks 
1/3: task: non-zero exit (137) 
2/3: running   [==================================================>] 
3/3: running   [==================================================>] 
service update paused: update paused due to failure or early termination of task x0nixewt7ozeyr2otal7emc62

exit (137)  generally means 1. Out-Of-Memory (OOM) Killer, 2. Graceful Shutdown Timeout (SIGTERM Escalation)


>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
Rollback if the new one is slow
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
📝 Complete Steps
Step 1: Build new version (v3)
# Build v3 image
docker build -t swarm-demo/gateway:v3 ./services/ApiGateway

# Verify it exists
docker images | grep gateway
Step 2: Update to v3
bash
# Update service to use v3
docker service update --image swarm-demo/gateway:v3 demo_api-gateway

# Check update status
docker service ps demo_api-gateway
Step 3: Test new version
bash
# Verify it's working
curl http://localhost:8080/health

# Check logs
docker service logs demo_api-gateway --tail 20
Step 4: Rollback (if needed)
bash
# Rollback to previous version (v2 or latest)
docker service rollback demo_api-gateway

# Verify rollback worked
docker service ps demo_api-gateway

>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
DB Locking in redis 
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# Redis Distributed Lock for Preventing Race Conditions

A simple implementation of Redis-based distributed locking to prevent concurrent purchase conflicts.

## 🔒 What is a Distributed Lock?

**Problem:** When multiple users buy the same product at the same time, stock can be oversold.

**Solution:** Redis lock ensures only ONE purchase happens at a time.

## 📊 How It Works
Without Lock (BAD):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User A: Reads stock (10 items)
User B: Reads stock (10 items)
User A: Updates stock to 9
User B: Updates stock to 9 ❌ WRONG! (Should be 8)
Result: Stock is 9 (sold 1 item but 2 people bought!) ❌

With Lock (GOOD):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User A: Acquires LOCK 🔒
User B: Tries lock → FAILS (waits)
User A: Reads stock (10) → Updates to 9 → Releases LOCK
User B: Acquires LOCK → Reads stock (9) → Updates to 8
Result: Stock is 8 (sold 2 items correctly!) ✅

text

## 🚀 Quick Test Commands

### Prerequisites
```bash
# Ensure product service is running
docker stack services demo | grep product
1. Check Initial Stock
bash
curl http://localhost:8080/products/1/stock
Expected output:

json
{
  "product": "Laptop",
  "stock": 10,
  "container": "abc123"
}
2. Single Purchase (Works Fine)
bash
curl -X POST http://localhost:8080/products/1/buy \
  -H "Content-Type: application/json" \
  -d '{"quantity":1}'
Expected output:

json
{
  "success": true,
  "message": "Purchased 1 x Laptop",
  "remainingStock": 9
}
3. Concurrent Purchase Test (Lock in Action)
Run 3 purchases at the SAME time:

bash
# This runs 3 purchases simultaneously
for i in {1..3}; do
    curl -X POST http://localhost:8080/products/1/buy \
      -H "Content-Type: application/json" \
      -d '{"quantity":1}' &
done
wait
Expected output (ONLY 1 succeeds, 2 fail):

text
{"error":"Product is being purchased. Try again."}
{"error":"Product is being purchased. Try again."}
{"success":true,"message":"Purchased 1 x Laptop","remainingStock":8}

>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
#Secret in docker
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
Create Secrets
bash
echo "your-password" | docker secret create secret_name -

List Secrets
bash
docker secret ls

Remove Secret
bash
docker secret rm secret_name

🔧 Implementation Steps
1. Create Secrets
bash
echo "my-api-key-123" | docker secret create api_key -
echo "my-jwt-secret-456" | docker secret create jwt_secret -
echo "db-password-789" | docker secret create db_password -

2. Add to docker-compose.yaml
yaml
services:
  api-gateway:
    secrets:
      - api_key
      - jwt_secret

secrets:
  api_key:
    external: true
  jwt_secret:
    external: true

3. Deploy Stack
bash
docker stack deploy -c docker-compose.yaml demo

4. Verify Secrets in Container
bash
docker exec <container> ls -la /run/secrets/
docker exec <container> cat /run/secrets/api_key

when everything is deleted need to create secret again 

>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
Autoscaling concept
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
Here without any external file like prometheus, directly it identifies and scale up and down 
Initially without load test, CPU is 0 so replica will be reduced from 3 to 2 and to 1
after doin the load test replica will be scalled fromn 1 to 2

                              START
                                │
                                ▼
                        Install tools (apk add...)
                                │
                                ▼
                  ┌─────────────────────────────────────┐
                  │         FOREVER LOOP                │
                  │                                     │
                  │  1. Find product container          │
                  │  2. Get its CPU %                   │
                  │  3. Get current replica count       │
                  │  4. Log: "CPU=8% REPLICAS=2"        │
                  │                                     │
                  │  5. Is CPU > 5%?                    │
                  │     YES → Scale UP (+1 container)   │
                  │            Wait 120 seconds         │
                  │                                     │
                  │  6. Is CPU < 2%?                    │
                  │     YES → Scale DOWN (-1 container) │
                  │            Wait 120 seconds         │
                  │                                     │
                  │  7. Wait 30 seconds                 │
                  │     └──→ Back to step 1             │
                  └─────────────────────────────────────

Cooldown = Waiting time after scaling before you can scale again. here in this case is 120

if anything running already 
docker swarm leave --force
docker swarm init
docker stack rm demo
docker service ls
docker network ls
docker network rm demo_my-swarm-network
docker compose build
echo "my-api-key-123" | docker secret create api_key -
echo "my-jwt-secret-456" | docker secret create jwt_secret -
docker stack deploy -c docker-compose.yaml demo
docker service ls

#for load test use this command 
>>>>>>>>>>>>>>>>>>>>>>>>echo "Starting load test at $(date)"
end=$((SECONDS+120))
count=0
while [ $SECONDS -lt $end ]; do
  for i in {1..50}; do
    curl -s -X POST http://localhost:8080/products/1/buy \
      -H "Content-Type: application/json" \
      -d '{"quantity":1}' > /dev/null 2>&1 &
  done
  count=$((count + 50))
  if [ $((count % 500)) -eq 0 ]; then
    echo "Sent $count requests so far..."
    # Show current CPU
    docker stats --no-stream --format "Current CPU: {{.CPUPerc}}" $(docker ps -q --filter name=product-service) 2>/dev/null | head -1
  fi
  sleep 0.5
done
wait
echo "Load test complete! Sent $count total requests"
echo "Finished at $(date)"

#check replica status
while true; do clear; echo "=== $(date '+%H:%M:%S') ==="; docker service ls | grep product-service; sleep 2; done

#check cpu status
while true; do
  clear
  echo "=== $(date '+%H:%M:%S') ==="
  docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker ps -q --filter name=product-service) 2>/dev/null
  echo ""
  echo "Replicas:"
  docker service ls --filter name=product-service --format "{{.Replicas}}"
  sleep 2
done

#check live logs
docker service logs -f demo_autoscaler

demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | CPU=0.00 REPLICAS=1
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | CPU=3.24 REPLICAS=1
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | CPU=3.64 REPLICAS=1
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | CPU=0.02 REPLICAS=1
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | CPU=5.86 REPLICAS=1
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | Scaling UP to 2 replicas
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | demo_product-service scaled to 2
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | overall progress: 0 out of 2 tasks
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | 1/2:  
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | 2/2:  
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | overall progress: 1 out of 2 tasks
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | overall progress: 1 out of 2 tasks
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | verify: Waiting 1 seconds to verify that tasks are stable...
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | verify: Waiting 1 seconds to verify that tasks are stable...
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | verify: Service demo_product-service converged
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | CPU=0.00 REPLICAS=2
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | Scaling DOWN to 1 replicas
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | demo_product-service scaled to 1
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | overall progress: 0 out of 1 tasks
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | 1/1:  
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | overall progress: 1 out of 1 tasks
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | verify: Waiting 5 seconds to verify that tasks are stable...
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | verify: Waiting 1 seconds to verify that tasks are stable...
demo_autoscaler.1.oylnbxrqngk2@docker-desktop    | verify: Service demo_product-service converged

Error faced in autoscaling and fix
The unexpected "(" error happened because YAML saw $(...) and tried to evaluate 
it as YAML code, not pass it to the shell. When you escaped it with $$(...), 
YAML passed $(...) correctly to the shell.

  autoscaler:
    image: alpine:latest
    volumes:
    #It mounts the Docker daemon socket into the container, allowing the container to run Docker commands
    # and control the host's Docker engine.
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - my-swarm-network
    deploy:
      placement:
        constraints: [node.role == manager]
    command:
      - sh
      - -c
      - |
          apk add --no-cache docker-cli bc

          while true; do

            CONTAINER=$$(docker ps -q --filter name=demo_product-service | head -1)

            if [ -n "$$CONTAINER" ]; then
              CPU=$$(docker stats --no-stream --format "{{.CPUPerc}}" $$CONTAINER | sed 's/%//')
            else
              CPU=0
            fi

            REPLICAS=$$(docker service inspect demo_product-service \
              --format '{{.Spec.Mode.Replicated.Replicas}}')

            echo "CPU=$$CPU REPLICAS=$$REPLICAS"

            HIGH=$$(echo "$$CPU > 5" | bc)
            LOW=$$(echo "$$CPU < 2" | bc)

            if [ "$$HIGH" = "1" ]; then
              if [ "$$REPLICAS" -lt 8 ]; then
                NEW=$$(expr $$REPLICAS + 1)

                echo "Scaling UP to $$NEW replicas"

                docker service scale demo_product-service=$$NEW

                sleep 120
              fi
            fi

            if [ "$$LOW" = "1" ]; then
              if [ "$$REPLICAS" -gt 1 ]; then
                NEW=$$(expr $$REPLICAS - 1)

                echo "Scaling DOWN to $$NEW replicas"

                docker service scale demo_product-service=$$NEW

                sleep 120
              fi
            fi

            sleep 30

          done

>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
Implemented Helath check 
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

# Install curl for health checks in the docker file very important
RUN apk add --no-cache curl 

docker compose build 

docker stack deploy -c docker-compose.yaml demo

najirabanum@NAJIRAs-MacBook-Air docker-swarm-nodejs % docker ps                             
CONTAINER ID   IMAGE                       COMMAND                  CREATED              STATUS                        PORTS      NAMES
43947bf831ee   swarm-demo/product:latest   "docker-entrypoint.s…"   About a minute ago   Up About a minute (healthy)   3002/tcp   demo_product-service.3.qgdjedtsli9czh7ulqow1fd6v
3bb6d4e2ae75   swarm-demo/product:latest   "docker-entrypoint.s…"   About a minute ago   Up About a minute (healthy)   3002/tcp   demo_product-service.2.ynqetenavaku720d0xq70zlnh
105dcd9c848b   swarm-demo/product:latest   "docker-entrypoint.s…"   About a minute ago   Up About a minute (healthy)   3002/tcp   demo_product-service.1.0kj9szby8i1sdbcwhldlcckgb
02ff622c8e0d   swarm-demo/user:latest      "docker-entrypoint.s…"   About a minute ago   Up About a minute (healthy)   3001/tcp   demo_user-service.2.x8b26n5ctfu9yyjv2k27kc0i7
0dac791875a8   swarm-demo/user:latest      "docker-entrypoint.s…"   2 minutes ago        Up About a minute (healthy)   3001/tcp   demo_user-service.1.lp79oju79nskxwwobmiolf5ot
cfca5140f162   f4bfa149cd56                "docker-entrypoint.s…"   4 minutes ago        Up 4 minutes (healthy)        3000/tcp   demo_api-gateway.1.vfbiplw1iz3p3e4tv7jozro9w
fb1ea07496b1   f4bfa149cd56                "docker-entrypoint.s…"   5 minutes ago        Up 4 minutes (healthy)        3000/tcp   demo_api-gateway.2.e90ebfppmfsd8vwloljttp70b
8ca207953052   alpine:latest               "sh -c 'apk add --no…"   33 minutes ago       Up 33 minutes                            demo_autoscaler.1.c715hjkod42xpokrd8tqfsgok
cd1ebd0d8236   redis:7-alpine              "docker-entrypoint.s…"   33 minutes ago       Up 33 minutes                 6379/tcp   demo_redis.1.zonef8wridqif1tj30g0cyqqr

