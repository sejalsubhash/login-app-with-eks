# Three-Tier Login App (EKS + RDS)

A minimal three-tier app: a login/register page (frontend), an Express API
(backend), and MySQL on RDS (data tier). Frontend and backend are scheduled
onto **separate EKS nodes** using `nodeSelector`.

```
frontend/   -> Nginx-served login page, calls /api/* (proxied to backend)
backend/    -> Node.js/Express API (register, login, JWT, health check)
k8s/        -> Kubernetes manifests (namespace, secret, deployments, services)
```

## 1. Create the RDS MySQL instance

Same steps as before — put it in private subnets of your EKS VPC, security
group allowing port 3306 only from the EKS node security group. Then load
the schema:

```bash
mysql -h <rds-endpoint> -u admin -p < backend/db/schema.sql
```

## 2. Label your nodes so frontend/backend land on different ones

```bash
kubectl get nodes
kubectl label nodes <node-1> workload=frontend
kubectl label nodes <node-2> workload=backend
```
(Requires at least 2 worker nodes — if your nodegroup only has 1, scale it
up first: `eksctl scale nodegroup --cluster <name> --nodes 2 ...`)

## 3. Build and push images to ECR

```bash
aws ecr create-repository --repository-name three-tier-backend --region us-west-2
aws ecr create-repository --repository-name three-tier-frontend --region us-west-2

aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-west-2.amazonaws.com

docker build -t <account-id>.dkr.ecr.us-west-2.amazonaws.com/three-tier-backend:latest ./backend
docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/three-tier-backend:latest

docker build -t <account-id>.dkr.ecr.us-west-2.amazonaws.com/three-tier-frontend:latest ./frontend
docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/three-tier-frontend:latest
```

Update the `image:` fields in `k8s/02-backend.yaml` and `k8s/03-frontend.yaml`
with your actual ECR repo URIs.

## 4. Set real DB credentials

Edit `k8s/01-db-secret.yaml` with your RDS endpoint, username, password, and
DB name — or create the secret directly instead of committing it:

```bash
kubectl create secret generic db-secret \
  --namespace three-tier-login \
  --from-literal=DB_HOST=<rds-endpoint> \
  --from-literal=DB_USER=admin \
  --from-literal=DB_PASSWORD=<password> \
  --from-literal=DB_NAME=appdb \
  --from-literal=DB_PORT=3306 \
  --from-literal=JWT_SECRET=<random-secret>
```
If you create it this way, remove `k8s/01-db-secret.yaml` from your `kubectl apply`.

## 5. Deploy

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-db-secret.yaml   # skip if created via CLI above
kubectl apply -f k8s/02-backend.yaml
kubectl apply -f k8s/03-frontend.yaml

kubectl get pods -n three-tier-login -o wide   # confirm frontend/backend are on different nodes
kubectl get svc -n three-tier-login            # grab the frontend LoadBalancer's EXTERNAL-IP
```

Open the frontend's external URL in a browser — register a user, then log in.

## 6. Cleanup

```bash
kubectl delete -f k8s/
aws rds delete-db-instance --db-instance-identifier three-tier-db --skip-final-snapshot
```
