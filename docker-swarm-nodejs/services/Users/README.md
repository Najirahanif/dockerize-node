// 1. User visits: curl http://localhost:8080/users/1

// 2. Middleware starts (line 64):
//    start = 12:00:00.000

// 3. Request gets user from Redis (line 177):
//    redisOps.inc({ operation: 'get_cached_user' })  // Counter goes: 0 → 1

// 4. User found in cache (line 172):
//    cacheHits.inc({ cache_type: 'user_detail' })    // Counter goes: 0 → 1

// 5. Response sent (line 187)

// 6. Request finishes (line 65):
//    duration = 12:00:00.050 - 12:00:00.000 = 0.050 seconds
//    
//    httpRequestsTotal.inc({                       // Counter: 99 → 100
//        method: 'GET',
//        route: '/users/:id',
//        status_code: 200
//    })
//    
//    httpRequestDuration.observe(0.050)            // Records 0.050s

// 7. Prometheus scrapes /metrics every 30 seconds:
//    user_service_http_requests_total{method="GET",route="/users/:id",status_code="200"} 100
//    user_service_http_request_duration_seconds 0.050
//    user_service_redis_operations_total{operation="get_cached_user"} 1
//    user_service_cache_hits_total{cache_type="user_detail"} 1