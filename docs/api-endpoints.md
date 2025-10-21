# API Endpoints Documentation

## 📋 Table of Contents

- [General Endpoints](#general-endpoints)
- [Violation Lookup Endpoints](#violation-lookup-endpoints)
- [Worker Pool Management Endpoints](#worker-pool-management-endpoints)
- [Error Responses](#error-responses)
- [Examples](#examples)

---

## General Endpoints

### 🏠 Root Endpoint

**Endpoint:** `GET /`

**Description:** API information

**Response:**

```json
{
  "message": "Vietnam Traffic Violation Lookup API",
  "version": "1.0.0",
  "author": "Nhat Cuong"
}
```

---

### 🏓 Health Check

**Endpoint:** `GET /ping`

**Description:** Check server health status

**Response:**

```
pong
```

---

## Violation Lookup Endpoints

### 🔍 Lookup Violations (JSON)

**Endpoint:** `GET /api/violations`

**Description:** Lookup traffic violations and return results in JSON format

**Query Parameters:**

| Parameter     | Type   | Required | Description                                                       |
| ------------- | ------ | -------- | ----------------------------------------------------------------- |
| `plate`       | string | ✅       | License plate number (e.g., `51K67179`)                           |
| `vehicleType` | string | ✅       | Vehicle type: `1` (Car), `2` (Motorcycle), `3` (Electric bicycle) |
| `captcha`     | string | ❌       | Captcha code (if manual input required)                           |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "plate": "51K67179",
    "vehicleType": "1",
    "violations": [
      {
        "violationNumber": "123456789",
        "violationTime": "08:30 12/10/2024",
        "location": "QL1A, Quận 12, TP.HCM",
        "violation": "Vượt đèn đỏ",
        "fine": "6,000,000 VND",
        "status": "Unpaid",
        "resolutionAddress": "123 ABC Street, District 1",
        "resolutionPhone": "028-1234-5678"
      }
    ],
    "totalViolations": 1,
    "totalPaidViolations": 0,
    "totalUnpaidViolations": 1,
    "queriedAt": "2024-10-21T13:00:00.000Z"
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Missing required parameter: plate"
}
```

---

### 📱 Lookup Violations (Telegram Format)

**Endpoint:** `GET /api/violations/telegram`

**Description:** Lookup violations and return results formatted for Telegram Bot

**Query Parameters:** Same as `/api/violations` endpoint

**Success Response (200):**

```json
{
  "success": true,
  "message": "✅ *LOOKUP SUCCESSFUL*\n\n📋 License Plate: *51K67179*\n🚗 Vehicle Type: Car\n\n📊 *Summary:*\n• Total violations: 1\n• Paid: 0\n• Unpaid: 1\n\n---\n\n*1. Violation at 08:30 12/10/2024*\n📍 Location: QL1A, District 12, HCMC\n❌ Violation type: Running red light\n💰 Fine amount: 6,000,000 VND\n📌 Status: Unpaid\n📮 Payment address: 123 ABC Street, District 1\n📞 Phone: 028-1234-5678",
  "data": {
    "plate": "51K67179",
    "vehicleType": "1",
    "violations": [...],
    "totalViolations": 1,
    "totalPaidViolations": 0,
    "totalUnpaidViolations": 1
  }
}
```

---

### 🌐 Lookup Violations (HTML)

**Endpoint:** `GET /api/violations/html`

**Description:** Lookup violations and return results as HTML page

**Query Parameters:** Same as `/api/violations` endpoint

**Success Response (200):**

- Content-Type: `text/html`
- Returns HTML page displaying lookup results

---

### 📦 Bulk Lookup Violations

**Endpoint:** `POST /api/violations/bulk`

**Description:** Lookup violations for multiple vehicles simultaneously

**Request Body:**

```json
{
  "vehicles": [
    { "plate": "51K67179", "vehicleType": "1" },
    { "plate": "30A12345", "vehicleType": "2" },
    { "plate": "92B88888", "vehicleType": "3" }
  ],
  "captcha": "optional_captcha_text"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "plate": "51K67179",
        "vehicleType": "1",
        "success": true,
        "violations": [...],
        "totalViolations": 1
      },
      {
        "plate": "30A12345",
        "vehicleType": "2",
        "success": true,
        "violations": [],
        "totalViolations": 0
      }
    ],
    "summary": {
      "total": 2,
      "successful": 2,
      "failed": 0
    }
  }
}
```

---

## Worker Pool Management Endpoints

### 📊 Worker Pool Status

**Endpoint:** `GET /api/worker-pool/status`

**Description:** Get Worker Pool status information (Tesseract OCR workers)

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "status": {
      "totalWorkers": 4,
      "availableWorkers": 3,
      "busyWorkers": 1,
      "queuedTasks": 0,
      "isInitialized": true
    },
    "performance": {
      "totalTasksProcessed": 125,
      "averageProcessingTime": 342,
      "successRate": 98.4
    },
    "isReady": true,
    "timestamp": "2024-10-21T13:00:00.000Z"
  }
}
```

---

### 🧹 Cleanup Worker Pool

**Endpoint:** `POST /api/worker-pool/cleanup`

**Description:** Clean up and free Worker Pool resources

**Success Response (200):**

```json
{
  "success": true,
  "message": "Worker pool cleaned up successfully",
  "timestamp": "2024-10-21T13:00:00.000Z"
}
```

**Error Response (500):**

```json
{
  "success": false,
  "error": "Failed to cleanup worker pool",
  "message": "Error details here"
}
```

---

### 🔄 Initialize Worker Pool

**Endpoint:** `POST /api/worker-pool/initialize`

**Description:** Reinitialize Worker Pool (can be used to reset or restart workers)

**Success Response (200):**

```json
{
  "success": true,
  "message": "Worker pool initialized successfully",
  "data": {
    "totalWorkers": 4,
    "availableWorkers": 4,
    "busyWorkers": 0,
    "queuedTasks": 0,
    "isInitialized": true
  },
  "timestamp": "2024-10-21T13:00:00.000Z"
}
```

**Error Response (500):**

```json
{
  "success": false,
  "error": "Failed to initialize worker pool",
  "message": "Error details here"
}
```

---

## Error Responses

### Common Error Status Codes

| Status Code | Description                                 |
| ----------- | ------------------------------------------- |
| `400`       | Bad Request - Missing or invalid parameters |
| `404`       | Not Found - Endpoint does not exist         |
| `500`       | Internal Server Error - Server error        |

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description (optional)"
}
```

---

## Examples

### Example 1: Lookup violations for a car

**Request:**

```bash
curl -X GET "http://localhost:3000/api/violations?plate=51K67179&vehicleType=1"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "plate": "51K67179",
    "vehicleType": "1",
    "violations": [...],
    "totalViolations": 2,
    "totalPaidViolations": 0,
    "totalUnpaidViolations": 2
  }
}
```

---

### Example 2: Lookup multiple vehicles

**Request:**

```bash
curl -X POST "http://localhost:3000/api/violations/bulk" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicles": [
      { "plate": "51K67179", "vehicleType": "1" },
      { "plate": "30A12345", "vehicleType": "2" }
    ]
  }'
```

---

### Example 3: Check Worker Pool Status

**Request:**

```bash
curl -X GET "http://localhost:3000/api/worker-pool/status"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "status": {
      "totalWorkers": 4,
      "availableWorkers": 4,
      "busyWorkers": 0,
      "queuedTasks": 0,
      "isInitialized": true
    },
    "performance": {
      "totalTasksProcessed": 0,
      "averageProcessingTime": 0,
      "successRate": 100
    },
    "isReady": true,
    "timestamp": "2024-10-21T13:00:00.000Z"
  }
}
```

---

### Example 4: Reset Worker Pool

**Request:**

```bash
curl -X POST "http://localhost:3000/api/worker-pool/cleanup"
curl -X POST "http://localhost:3000/api/worker-pool/initialize"
```

---

## Notes

### Vehicle Type Values

- `1`: Xe ô tô (Car)
- `2`: Xe máy (Motorcycle)
- `3`: Xe đạp điện (Electric bicycle)

### Rate Limiting

Currently the API does not have rate limiting. Use the bulk endpoint when you need to lookup multiple vehicles.

### Captcha Handling

The system automatically handles captcha using Tesseract OCR. The `captcha` parameter is only needed when manual input is desired.

### Worker Pool

- Worker Pool uses Tesseract workers to process OCR captcha in parallel
- Default number of workers: 4
- Automatic cleanup on server shutdown

---

## Related Documentation

- [Telegram Bot Commands](./telegram-commands.md)
- [Cron Service](./cron-service.md)
- [User Management](./user-management-system.md)
- [Database Setup](./database-setup.md)
