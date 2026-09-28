# Vehicle Repair API Documentation

This backend is session-based and is currently served from the PHP built-in server on:

- Base URL: `http://localhost:8000/api.php`

> Important: in this project, the actual entry file is `api.php`, not `/api`. The frontend should call `http://localhost:8000/api.php?action=...` and include `credentials: 'include'` for session cookies.

## Auth and session flow

- Public endpoints are accessible without login:
  - `register`
  - `login`
  - `check-auth`
  - `logout`
- All other actions require an active PHP session.
- The backend sets session data after a successful login:
  - `user_id`
  - `username`
  - `role_id`
- The frontend must send requests with:

```js
fetch(url, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
```

---

## Public endpoints

### 1) Register user

- URL: `http://localhost:8000/api.php?action=register`
- Method: `POST`
- Body:

```json
{
  "username": "serviceadvisor1",
  "password": "secret123",
  "first_name": "Jane",
  "middle_name": "L",
  "last_name": "Smith",
  "contact_no": "09171234567",
  "email": "jane@example.com",
  "role_id": 2
}
```

### 2) Login user

- URL: `http://localhost:8000/api.php?action=login`
- Method: `POST`
- Body:

```json
{
  "username": "serviceadvisor1",
  "password": "secret123"
}
```

Returns session data and `role_id`.

### 3) Check auth

- URL: `http://localhost:8000/api.php?action=check-auth`
- Method: `GET`

### 4) Logout

- URL: `http://localhost:8000/api.php?action=logout`
- Method: `POST` or `GET` depending on usage

---

## Repair order workflow

Main route: `action=repair-orders`

### A. Create intake / vehicle registration

- URL: `http://localhost:8000/api.php?action=repair-orders`
- Method: `POST`
- Body:

```json
{
  "customer": {
    "firstName": "John",
    "lastName": "Dela Cruz",
    "phone": "09171234567",
    "email": "john@test.com",
    "middleName": "M"
  },
  "vehicle": {
    "plateNumber": "ABC1234",
    "vehicleType": "SUV",
    "make": "Toyota",
    "model": "Fortuner",
    "year": 2022,
    "color": "White",
    "currentMileage": 25000
  },
  "order": {
    "complaint": "Engine overheating",
    "priority": "STANDARD"
  }
}
```

Creates a new repair order and customer/vehicle records.

### B. Get active repair orders

- URL: `http://localhost:8000/api.php?action=repair-orders&category=active`
- Method: `GET`
- Optional filters:
  - `status=IN_PROGRESS`
  - `search=plate` or `search=customer name`

### C. Get repair order detail

- URL: `http://localhost:8000/api.php?action=repair-orders&category=active&order_id=12`
- Method: `GET`

### D. Get order history

- URL: `http://localhost:8000/api.php?action=repair-orders&category=history`
- Method: `GET`
- Optional: `search=ABC1234`

### E. Get parts by order

- URL: `http://localhost:8000/api.php?action=repair-orders&category=parts-by-order&order_id=12`
- Method: `GET`

### F. Assign diagnostician

- URL: `http://localhost:8000/api.php?action=repair-orders&post-method=assign-diagnostician`
- Method: `POST`
- Body:

```json
{
  "order_id": 12,
  "mechanic_id": 3
}
```

### G. Submit diagnosis

- URL: `http://localhost:8000/api.php?action=repair-orders&post-method=submit-diagnosis`
- Method: `POST`
- Body:

```json
{
  "order_id": 12,
  "diagnosis_notes": "Loose radiator hose and coolant leak.",
  "service_ids": [1, 5, 8]
}
```

### H. Assign mechanic to repair job

- URL: `http://localhost:8000/api.php?action=repair-orders&post-method=assign-mechanic`
- Method: `POST`
- Body:

```json
{
  "order_id": 12,
  "mechanic_id": 4,
  "position_id": 2
}
```

### I. Log used part

- URL: `http://localhost:8000/api.php?action=repair-orders&post-method=log-part`
- Method: `POST`
- Body:

```json
{
  "order_id": 12,
  "part_id": 7,
  "quantity": 2
}
```
### J. Cancel order part

- URL: `http://localhost:8000/api.php?action=repair-orders&put-method=cancel-order-part`
- Method: `PUT`
- Body:

```json
{
  "order_part_id": 12
}
```
### K. Mark order ready to invoice

- URL: `http://localhost:8000/api.php?action=repair-orders&post-method=mark-ready-to-invoice`
- Method: `POST`
- Body:

```json
{
  "order_id": 12
}
```

---

## Invoices

Main route: `action=invoices`

### Generate invoice

- URL: `http://localhost:8000/api.php?action=invoices`
- Method: `POST`
- Body:

```json
{
  "order_id": 12,
  "tax_rate": 12,
  "discount": 0
}
```

### Process payment

- URL: `http://localhost:8000/api.php?action=invoices&post-method=payment`
- Method: `POST`
- Body:

```json
{
  "order_id": 12,
  "payment_method": "CASH",
  "payment_reference": "REF-001"
}
```

If `payment_reference` is omitted, the backend generates one automatically.

---

## Parts inventory

Main route: `action=parts`

### Get inventory

- URL: `http://localhost:8000/api.php?action=parts&status=ALL&search=filter`
- Method: `GET`

### Restock inventory

- URL: `http://localhost:8000/api.php?action=parts&post-method=restock`
- Method: `POST`
- Body:

```json
{
  "part_id": 7,
  "quantity": 10
}
```

---

## Mechanics and customers

### Mechanics

- Get all mechanics: `GET http://localhost:8000/api.php?action=mechanics`
- Get available mechanics for a repair order: `GET http://localhost:8000/api.php?action=mechanics&available=true&order_id=12`

### Customers

- Get customer records: `GET http://localhost:8000/api.php?action=customers`

### Services

- Get services catalog: `GET http://localhost:8000/api.php?action=services`

---

## Standard response shape

The API generally returns:

```json
{
  "status": "success",
  "data": [...],
  "count": 10,
  "message": "Optional message"
}
```

Error responses usually look like:

```json
{
  "status": "error",
  "error": "Message about missing data or validation failure"
}
```

---

## Order lifecycle summary

1. Service advisor creates intake.
2. Order is assigned to a diagnostician.
3. Diagnosis is submitted with selected services.
4. Mechanic(s) are assigned to the order.
5. Parts are logged as used.
6. (Optional) Unused or cancelled parts are returned to inventory via `cancel-order-part`.
7. Parts are restocked if inventory is insufficient.
8. Order is marked `READY_TO_INVOICE`.
9. Invoice is generated.
10. Payment is processed and order becomes `FULFILLED`.

This is the basic flow the frontend should follow when interacting with the backend.
