# Cloud Infrastructure & Frontend Application

## Overview

This repository contains a complete end-to-end cloud project consisting of:

* A **Vite.js Frontend** deployed on **Vercel**
* **AWS Infrastructure** provisioned using **Terraform**
* **AWS Lambda Backend Functions** powering a basic compute API
* **CI/CD Automation** using GitHub Actions for infrastructure and Lambda

This project demonstrates a fully automated workflow where frontend deployments, backend updates, and infrastructure provisioning happen seamlessly through managed pipelines.

---

## Repository Structure

```
/frontend      → Vite.js frontend deployed on Vercel
/infra         → Terraform code for AWS infra
/lambdas       → Python Lambda functions
.github/       → GitHub Actions workflows
.gitignore     → Git ignore rules
```

---

## Frontend (Vite.js + Vercel)

The **frontend** folder contains a Vite.js application. It is deployed using Vercel’s built‑in CI/CD.

### Deployment Behavior

* On every commit pushed to `frontend/`, Vercel automatically:

  * Detects the change
  * Builds the frontend
  * Deploys it live
* No custom CI/CD logic is required—Vercel handles everything.

### Live Website

**URL:** [https://staticweb-project.vercel.app/](https://staticweb-project.vercel.app/)

### Demo Login

* **Username:** guest
* **Password:** Guest@12345

### Frontend Features

* Login page (Cognito‑backed auth)
* Home page (welcome section)
* Instances page containing:

  * A **Refresh** button (triggers Lambda)
  * EC2 instance list (cached in localStorage when possible)

---

## AWS Infrastructure (Terraform)

The **infra** folder contains Terraform configuration that provisions all required backend cloud resources.

### Resources Created

* **AWS Lambda Function** (to list EC2 instances across regions)
* **API Gateway** (REST endpoint for Lambda)
* **Cognito User Pool** and **App Client** (used for frontend login)
* **IAM Roles & Policies** for Lambda, API Gateway, and Cognito
* Additional IAM user configurations

### Infrastructure Behavior

Your Terraform code ensures:

* Automated provisioning of new resources
* Automatic deletion of removed resources
* Version‑controlled IaC workflow

---

## Lambda Functions

The **lambdas** folder contains Python Lambda functions.

### Current Lambda: `inst.py`

This Lambda:

* Iterates across **all AWS regions**
* Collects **all EC2 instances**
* Merges them into a **single aggregated list**
* Returns the list to the API Gateway

The frontend consumes this API to show all instances in a unified table.

---

## CI/CD: Infrastructure Automation

The **GitHub Actions workflow** located at:

```
.github/workflows/infra.yml
```

automatically runs Terraform commands whenever code changes.

### Trigger Conditions

CI/CD runs when changes occur in:

* `infra/` (Terraform files)
* `lambdas/` (backend source code)

### Pipeline Behavior

1. Runs `terraform init`
2. Runs `terraform plan`
3. Applies changes using:

   ```
   terraform apply --auto-approve
   ```

This ensures:

* Any changes in Lambda code are deployed instantly
* Any changes in infrastructure are updated automatically
* You get a real DevOps‑style automated backend deployment flow

---

## End-to-End Flow

1. User opens the website → hits Vercel frontend.
2. User logs in through Cognito User Pool.
3. Navigation to Instances Page.
4. Click **Refresh** → API Gateway triggers Lambda.
5. Lambda fetches EC2 details → sends merged instance list.
6. Frontend updates UI and stores the result in `localStorage` for faster reloads.

---

## Why This Project Is Valuable

This repository demonstrates:

* Full IaC-driven AWS backend
* Serverless compute workflow (Lambda)
* Secure auth with Cognito
* Automated frontend deployment with Vercel's native CI/CD
* Automated backend & infra deployment with GitHub Actions
* Production-grade folder structure
* Clear separation of frontend, backend, and infrastructure

This blend of Vercel, Terraform, Lambda, API Gateway, and Cognito represents a modern cloud architecture aligned with real-world DevOps and SRE practices.

---

## Future Enhancements

Potential improvements include:

* Add more Lambda functions and backend features
* Integrate CloudWatch dashboards
* Add unit tests for Lambdas
* Add environment-based deployments (dev/stage/prod)
* Include a proper frontend table UI for instance lists

---

## Conclusion

This project serves as a complete demonstration of cloud automation, serverless compute, frontend deployment pipelines, and real-world Terraform usage—all in a single, maintainable repository.

It is a solid reference for showcasing DevOps, cloud engineering, and IaC skills.
