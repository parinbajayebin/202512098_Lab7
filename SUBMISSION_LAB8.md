# Web Services & SOA Laboratory — Lab 8 Submission Report

## Student & Project Metadata
* **Student ID / Roll No:** `202512098`
* **Student Name / GitHub:** `parinbajayebin`
* **Repository (GitHub):** [https://github.com/parinbajayebin/202512098_Lab7](https://github.com/parinbajayebin/202512098_Lab7)
* **GitHub Actions CI/CD Pipeline:** [https://github.com/parinbajayebin/202512098_Lab7/actions](https://github.com/parinbajayebin/202512098_Lab7/actions)
* **Cloud Deployed Gateway (Render):** [https://campusconnect-api-gateway-06o5.onrender.com](https://campusconnect-api-gateway-06o5.onrender.com)
* **Live Health Check URL:** [https://campusconnect-api-gateway-06o5.onrender.com/health](https://campusconnect-api-gateway-06o5.onrender.com/health)
* **Live Prometheus Metrics URL:** [https://campusconnect-api-gateway-06o5.onrender.com/metrics](https://campusconnect-api-gateway-06o5.onrender.com/metrics)

---

## 1. Executive Summary
This submission fulfills all requirements for **Lab 8: Kubernetes Orchestration, CI/CD Pipeline & Observability Monitoring**.
1. **Kubernetes Deployment**: The full microservices architecture (`api-gateway`, `user-service`, `product-service`, `order-service`) has been containerized and deployed into the dedicated `lab8` namespace using declarative manifests.
2. **Health Probes**: Liveness and readiness probes (`/health`) configured for all services.
3. **Internal Service Discovery**: Stable internal Kubernetes Service DNS names (`user-service:3001`, `product-service:3002`, `order-service:3003`) referenced via `ConfigMap`.
4. **Horizontal Pod Scaling & Self-Healing**: Demonstrated scaling of `user-service` to 3 replicas and automatic replacement of failed/deleted pods.
5. **Continuous Integration & Delivery (CI/CD)**: GitHub Actions workflow building and testing all 4 services, tagging Docker images with the Git commit SHA, and pushing to GitHub Container Registry (`ghcr.io`).
6. **Observability Stack**: Prometheus metrics scraped from `/metrics` and visualized in a Grafana dashboard answering the 4 core monitoring questions (Availability, Traffic, Failure Rate, Latency).

---

## 2. Deliverables & Screenshots Mapping (evidence-lab-8/)

All captured screenshots are included in the `evidence-lab-8/` folder:

| No. | Rubric Item | Evidence File | Description |
| :---: | :--- | :--- | :--- |
| **1** | **Lab 7 Baseline** | `evidence-lab-8/01_lab7_baseline_health.png` | Postman calling `GET /health` on live Render cloud gateway returning `200 OK` |
| **2** | **K8s Environment** | `evidence-lab-8/02_k8s_environment_nodes.png` | `kubectl config current-context` & `kubectl get nodes` showing `desktop-control-plane` Ready |
| **3** | **Manifests** | `evidence-lab-8/03_k8s_manifests_list.png` | Terminal listing all 10 manifests in `k8s/` (`configmap`, `gateway`, `user`, `product`, `order`) |
| **4** | **Deployment** | `evidence-lab-8/04_k8s_deployment_running.png` | `kubectl get pods,deployments,services -n lab8` showing all 4 pods `1/1 Running` |
| **5** | **Gateway Test** | `evidence-lab-8/05_gateway_postman_test.png` | Postman requesting `GET http://localhost:8080/users` through K8s gateway returning `200 OK` |
| **6** | **Scaling** | `evidence-lab-8/06_k8s_scaling_3_replicas.png` | `kubectl scale deployment user-service --replicas=3 -n lab8` showing 3 running pods |
| **7** | **Self-Healing** | `evidence-lab-8/07_k8s_self_healing.png` | `kubectl delete pod` followed by Kubernetes immediately spawning a replacement pod |
| **8** | **Troubleshooting** | `evidence-lab-8/08_k8s_troubleshooting_describe.png` | `kubectl describe pod` and `kubectl get endpoints -n lab8` |
| **9** | **GitHub Actions** | `evidence-lab-8/09_github_actions_ci_success.png` | GitHub Actions workflow showing green checkmarks for test & Docker container delivery |
| **10** | **Prometheus** | `evidence-lab-8/10_prometheus_targets_up.png` | Prometheus `/targets` page reporting gateway in **UP** state and PromQL query |
| **11** | **Architecture** | `evidence-lab-8/11_architecture_diagram_lab8.png` | Complete Lab 8 SVG architecture diagram (Client $\to$ Gateway $\to$ Services $\to$ Atlas $\to$ Observability) |

---

## 3. Key Commands Reference

```powershell
# 1. Apply Manifests
kubectl create namespace lab8
kubectl apply -f k8s/ -n lab8

# 2. Port Forward Gateway
kubectl port-forward svc/gateway-service 8080:8080 -n lab8

# 3. Scale User Service
kubectl scale deployment user-service --replicas=3 -n lab8

# 4. Self-Healing Test
kubectl delete pod <user-service-pod-name> -n lab8

# 5. Start Monitoring Stack
docker compose -f docker-compose.monitoring.yml up -d
```
