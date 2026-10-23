# CivicFix Nagpur — Backend API

**Owner: Dev1**

This directory contains the Python FastAPI backend for CivicFix Nagpur.

> Development of this component is Dev1's responsibility.
> Dev2 (citizen app + admin dashboard) will connect to the API endpoints
> defined here once they are available.

## Planned Stack

| Component   | Technology           |
|-------------|----------------------|
| Framework   | Python + FastAPI     |
| Database    | TBD (Dev1 decision)  |
| Auth        | TBD (Dev1 decision)  |

## Expected API Surface (Dev2 integration points)

These are the endpoints Dev2's frontend will consume.
Exact contracts to be agreed with Dev1.

| Endpoint                        | Method | Description                        |
|---------------------------------|--------|------------------------------------|
| `/auth/register`                | POST   | Citizen registration               |
| `/auth/login`                   | POST   | Citizen / admin login              |
| `/complaints`                   | GET    | List complaints (filtered)         |
| `/complaints`                   | POST   | Submit a new complaint             |
| `/complaints/{id}`              | GET    | Get complaint details              |
| `/complaints/{id}/status`       | PATCH  | Update complaint status (admin)    |
| `/complaints/{id}/assign`       | PATCH  | Assign complaint to department     |
| `/departments`                  | GET    | List departments                   |

## Setup

_To be documented by Dev1._
