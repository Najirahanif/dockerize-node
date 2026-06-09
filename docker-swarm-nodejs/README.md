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


