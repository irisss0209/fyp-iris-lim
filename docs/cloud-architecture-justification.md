# Cloud Architecture Justification — Railly

## Overview

Railly is a transit safety management system targeting Malaysian commuters and rail operators. The cloud infrastructure is hosted on Amazon Web Services (AWS) and is designed around three core principles: **security** (sensitive incident and user data must never be publicly exposed), **low latency** (real-time alert delivery requires fast API response for Malaysian users), and **cost efficiency** (as an academic project, serverless and managed services are preferred over always-on EC2 fleets).

---

## 1. AWS Region — Singapore (ap-southeast-1)

Although Railly's target audience is Malaysia, the **Singapore region (ap-southeast-1)** was selected as the primary deployment region rather than the closer Jakarta region (ap-southeast-3). This decision was made because Singapore offers a significantly broader set of AWS services — including AWS Fargate, AWS SES, AWS IoT Core, and full Secrets Manager integration — that Jakarta does not yet fully support. Singapore is also geographically close to Malaysia (approximately 350 km), meaning round-trip latency for Malaysian users remains low, typically under 10–20 ms. This makes it a practical and feature-complete alternative to deploying in-country.

---

## 2. AWS Region — N. Virginia (us-east-1) — ACM Certificate for CloudFront

A second region, **N. Virginia (us-east-1)**, is used solely to host the ACM (AWS Certificate Manager) SSL/TLS certificate for the `railly.systems` domain. This is an AWS architectural constraint: **CloudFront only accepts ACM certificates provisioned in us-east-1**, regardless of where the origin or distribution is located. No application workload runs in this region — it exists purely to satisfy this CloudFront requirement. The certificate covers the passenger and operator frontend served at `railly.systems`.

---

## 3. AWS CloudFront

CloudFront serves as the **content delivery network (CDN)** for the Railly frontend (React PWA). Static build assets (HTML, JS, CSS, service worker) are cached at AWS edge locations globally, including those closest to Malaysia, so the initial page load is fast regardless of where the user is. CloudFront enforces HTTPS using the ACM certificate from us-east-1 and is configured to redirect all HTTP requests to HTTPS. It points to the S3 bucket (`railly-app-...`) as its origin.

---

## 4. AWS S3 — Frontend Bucket (railly-app-659587495443-ap-southeast-1-an)

This S3 bucket stores the **compiled React PWA static files** produced by `npm run build`. The bucket is not publicly accessible directly — all access goes through CloudFront. This prevents users from bypassing the CDN or accessing the origin directly, and ensures the HTTPS and caching policies defined in CloudFront are always enforced.

---

## 5. AWS S3 — Media Bucket (railly)

A separate S3 bucket stores **incident evidence images** — snapshots uploaded by passengers when submitting reports, and camera snapshots attached to AI detections. This bucket is private and never directly exposed. The backend generates **pre-signed URLs** with a short expiry time (via `IS3Service.GeneratePresignedUrl`) and attaches them to alert DTOs. This means clients receive a time-limited, authenticated URL to view an image without the bucket needing any public access policy, keeping all incident evidence secure.

---

## 6. AWS VPC (Railly VPC)

All backend infrastructure runs inside a **Virtual Private Cloud (VPC)** to isolate Railly's resources from the public internet and from other AWS accounts. The VPC is divided into **public and private subnets** across two Availability Zones (ap-southeast-1a and ap-southeast-1b). Resources that must receive internet traffic (the load balancer and bastion host) sit in public subnets. Resources that must never be directly reachable from the internet (the database, backend containers, and Lambda function) sit in private subnets. This subnet separation is the standard AWS security baseline for production workloads.

---

## 7. Multi-AZ Design (ap-southeast-1a and ap-southeast-1b)

The VPC spans two Availability Zones to provide **fault tolerance**. Each AZ has its own public and private subnet pair. The Application Load Balancer is deployed across both AZs, so if one AZ experiences an outage, the ALB automatically routes all traffic to the healthy AZ without any manual intervention. For a safety-critical system like Railly — where operators need uninterrupted access to live alerts — this redundancy is essential.

---

## 8. AWS ALB — Application Load Balancer (railly-backend-alb)

The **Application Load Balancer** sits in the public subnets and is the single entry point for all API traffic to `api.railly.systems`. It performs three functions:

- **HTTPS termination** — uses the ACM certificate provisioned in Singapore (ap-southeast-1) to terminate TLS, so the Fargate containers inside the private subnet receive plain HTTP, simplifying the backend configuration.
- **Health checking** — continuously probes the Fargate containers and stops routing to any unhealthy instance.
- **Traffic distribution** — forwards requests to the Fargate backend service running in the private subnet, keeping the containers unreachable from the public internet directly.

---

## 9. AWS Fargate (fyp-backend-service)

The **.NET Core backend API** runs as a containerised service on **AWS Fargate** inside the private subnet. Fargate is a serverless container runtime — there are no EC2 instances to provision, patch, or manage. The container image is stored in ECR and pulled by ECS when the service starts or scales. Running in the private subnet means the container has no public IP address and cannot be reached except through the ALB, significantly reducing the attack surface. Fargate also integrates natively with AWS Secrets Manager, allowing the backend to retrieve the JWT secret, database connection string, and API keys at startup without storing them in environment variables or configuration files.

---

## 10. AWS ECS (railly-backend-cluster) and AWS ECR (fyp-backend)

**ECS (Elastic Container Service)** manages the lifecycle of the Fargate tasks — starting, stopping, health-checking, and restarting containers as needed. The cluster (`railly-backend-cluster`) defines the compute environment.

**ECR (Elastic Container Registry)** is the private Docker image registry that stores the built backend container image (`fyp-backend`). Using ECR keeps the image within the AWS network, avoiding public Docker Hub rate limits and ensuring the image is only accessible from within the AWS account. The CI/CD pipeline pushes new images to ECR, and ECS pulls from ECR when deploying an update.

---

## 11. AWS RDS (railly-db)

The **PostgreSQL database** runs on AWS RDS inside the private subnet. RDS is a fully managed database service that handles automated backups, software patching, and storage scaling, reducing operational overhead. Placing it in the private subnet means it has no public endpoint — only the Fargate backend and the Lambda function within the same VPC can connect to it. Database credentials are stored in Secrets Manager and injected into the backend at startup, so they are never hardcoded or stored in source control.

---

## 12. AWS Lambda (railly-detection-handler)

When the Raspberry Pi camera on a train detects an incident, it publishes a message to **AWS IoT Core**, which triggers the **`railly-detection-handler` Lambda function**. Lambda is appropriate here because AI detection events are sporadic — the function only runs when a detection occurs, so there is no cost for idle time. The Lambda function runs inside the private subnet so it can write directly to RDS and call the Fargate API to trigger SignalR broadcasts for real-time operator alerts. Using Lambda for this event-driven ingestion path decouples the AI detection pipeline from the main backend, so a spike in detections does not affect the API serving passengers and operators.

---

## 13. AWS IoT Core

**AWS IoT Core** acts as the secure message broker between the Raspberry Pi edge devices on trains and the AWS cloud. Each Raspberry Pi authenticates using an X.509 certificate issued by IoT Core, establishing a mutually authenticated MQTT connection. When the camera detects an incident, the Raspberry Pi publishes a JSON payload to an IoT Core topic. An IoT Rule forwards the message to the Lambda function. This design means the backend never needs to accept raw connections from edge devices, and compromising one Raspberry Pi cannot grant access to the rest of the system.

---

## 14. Raspberry Pi and Camera (Train Ingestion)

The **Raspberry Pi** is the edge compute unit mounted on each train. It receives the camera feed, runs or forwards frames for AI inference, and publishes detection events to IoT Core over a cellular or Wi-Fi connection. Using a Raspberry Pi keeps the edge hardware cost low and allows the AI model to be updated remotely without physical access to the train.

---

## 15. AWS Secrets Manager

All sensitive configuration values — the JWT signing secret, database connection string, VAPID private key for Web Push, Google Geocoding API key, Vertex AI project credentials, and the Lambda notification API key — are stored in **AWS Secrets Manager**. The backend retrieves all secrets at startup via the Secrets Manager API (as seen in `Program.cs`). If a secret cannot be retrieved (e.g. during local development), the application falls back to `appsettings.json` values. This approach ensures that no credentials are ever stored in source code, Docker images, or environment variables in plaintext.

---

## 16. AWS SES (Simple Email Service)

**AWS SES** is used to send OTP emails for three authentication flows: passenger signup email verification, auxiliary and operator login second factor, and the forgot-password reset flow. SES was chosen over third-party email providers because it integrates natively within the AWS ecosystem, has a low per-email cost, and supports SMTP so the existing `EmailService` implementation requires no additional SDK — it connects via standard SMTP credentials.

---

## 17. AWS ACM — Singapore (api.railly.systems)

A second ACM certificate, provisioned in the Singapore region, covers the `api.railly.systems` domain and is attached to the **Application Load Balancer**. This certificate is separate from the CloudFront one (which must be in us-east-1) because ALB certificates must be in the same region as the load balancer. Together, both ACM certificates ensure end-to-end HTTPS for both the frontend (`railly.systems` via CloudFront) and the backend API (`api.railly.systems` via ALB).

---

## 18. EC2 Bastion Host (railly-bastion)

The **bastion host** is a small EC2 instance in the public subnet used exclusively for administrative access to private subnet resources — primarily the RDS database and Fargate containers. Because the database and backend containers have no public endpoints, a bastion provides a controlled SSH jump point for tasks like running database migrations manually, inspecting logs, or debugging connectivity issues. Access to the bastion is restricted by its security group to specific trusted IP addresses, minimising exposure.

---

## Summary

| Component | Justification Summary |
|---|---|
| Singapore region | Closest feature-complete AWS region to Malaysia |
| N. Virginia ACM | CloudFront mandates ACM certificates in us-east-1 |
| CloudFront | CDN for fast PWA delivery; enforces HTTPS |
| S3 (frontend) | Hosts static React build; private, served via CloudFront only |
| S3 (media) | Stores incident images; private, accessed via pre-signed URLs |
| VPC + subnets | Isolates backend from public internet; separates public and private tiers |
| Multi-AZ | Fault tolerance across ap-southeast-1a and 1b |
| ALB | HTTPS termination; single secure entry point to private backend |
| Fargate | Serverless containers; no EC2 management; private subnet |
| ECS + ECR | Container orchestration and private image registry |
| RDS | Managed PostgreSQL; private subnet; credentials via Secrets Manager |
| Lambda | Event-driven AI detection ingestion; cost-efficient for sporadic events |
| IoT Core | Secure MQTT broker for Raspberry Pi camera devices |
| Raspberry Pi | Low-cost edge compute on trains for camera ingestion |
| Secrets Manager | Centralised secret storage; no hardcoded credentials |
| SES | Managed email delivery for OTP authentication flows |
| ACM Singapore | TLS certificate for ALB / api.railly.systems |
| Bastion EC2 | Controlled administrative access to private subnet resources |
