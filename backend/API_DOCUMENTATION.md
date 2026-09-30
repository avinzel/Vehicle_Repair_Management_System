# Vehicle Repair API Documentation

This backend uses PHP sessions and is served locally at:

- Base URL: `http://localhost:8000/api.php`

Pass every route through `api.php` using the `action` query parameter. Authenticated frontend requests must include `credentials: 'include'` so the browser sends the PHP session cookie. JSON request bodies should use `Content-Type: application/json`.

```js
fetch(url, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
```

The API permits CORS requests from `http://localhost:5173` and handles `OPTIONS` preflight requests. A successful login stores `user_id`, `username`, and `role_id` in the session. `register`, `login`, `check-auth`, and `logout` are exempt from the authentication guard; all other actions require an authenticated session. Some handlers impose additional role checks.

## Authentication

### Register

- `POST /api.php?action=register`
- JSON body:

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

Required fields are all shown except `middle_name`, which is optional. Returns `201` on success.

### Login

- `POST /api.php?action=login`
- JSON body: `{"username":"serviceadvisor1","password":"secret123"}`
- Successful response includes `user_id`, `username`, `role_id`, a message, and the new session ID.

### Check session

- `GET /api.php?action=check-auth`
- Returns the authenticated user data; returns `401` when no session is active.

### Logout

- `GET` or `POST /api.php?action=logout`
- Clears the current session and returns a success message. The dispatcher does not restrict this route to a specific method.

### Test authentication

- `GET /api.php?action=test-auth`
- Protected route. Returns a greeting containing the authenticated username. The dispatcher does not restrict this route to a specific method.

## Repair orders

Main action: `action=repair-orders`. Supported categories and operations are selected using `category`, `post-method`, or `put-method`.

### Dashboard

- `GET /api.php?action=repair-orders`
- Omitting `category` returns the service-advisor dashboard data in a `data` property.

### Active orders and order details

- `GET /api.php?action=repair-orders&category=active`
- Optional query parameters: `status` (defaults to `ALL`) and `search`.
- Add `order_id` to the same URL to retrieve one order's details, for example `...?category=active&order_id=12`.

### Billing and invoicing list

- `GET /api.php?action=repair-orders&category=inactive`
- Optional query parameter: `search`.
- Despite the category name `inactive`, this handler returns billing and invoicing records.

### Order history

- `GET /api.php?action=repair-orders&category=history`
- Optional query parameter: `search`.
- Response includes order data, count, and total revenue.

### Parts used on an order

- `GET /api.php?action=repair-orders&category=parts-by-order&order_id=12`
- `order_id` is required. Response includes parts data, count, and total parts cost.

### Mechanic work orders

- `GET /api.php?action=repair-orders&category=assigned`
- Optional query parameter: `mechanic_id`. If omitted, the backend attempts to find a mechanic associated with the logged-in user.

### Create vehicle intake

- `POST /api.php?action=repair-orders`
- JSON body:

```json
{
  "customer": {
    "firstName": "John",
    "middleName": "M",
    "lastName": "Dela Cruz",
    "phone": "09171234567",
    "email": "john@test.com"
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

Required intake values: customer first name, last name, phone; vehicle plate number, type, make, model; and order complaint. `year`, `color`, mileage, customer email/middle name, and priority are optional. Camel-case and corresponding snake-case keys are supported by the handler.

### Assign diagnostician

- `POST /api.php?action=repair-orders&post-method=assign-diagnostician`
- JSON body: `{"order_id":12,"mechanic_id":3}`

### Submit diagnosis

- `POST /api.php?action=repair-orders&post-method=submit-diagnosis`
- JSON body:

```json
{
  "order_id": 12,
  "diagnostic_notes": "Loose radiator hose and coolant leak.",
  "required_services": [1, 5, 8]
}
```

`order_id` and notes are required. The handler also accepts `diagnosis_notes` for the notes and `services` for the services array.

### Assign mechanic to repair job

- `POST /api.php?action=repair-orders&post-method=assign-mechanic`
- JSON body: `{"order_id":12,"mechanic_id":4,"position_id":2}`

### Log a used part

- `POST /api.php?action=repair-orders&post-method=log-part`
- JSON body: `{"order_id":12,"part_id":7,"quantity":2}`

### Mark order ready to invoice

- `POST /api.php?action=repair-orders&post-method=mark-ready-to-invoice`
- JSON body: `{"order_id":12}`

### Cancel a part on an order

- `PUT /api.php?action=repair-orders&put-method=cancel-order-part`
- Supply `order_part_id` as a query parameter or JSON body. Example body: `{"order_part_id":12}`.
- Cancelling restores the part quantity to inventory.

## Invoices

### Invoice details

- `GET /api.php?action=invoices&order_id=12`
- `order_id` is required. The controller also accepts it in a JSON body, but a query parameter is recommended for GET requests.

### Generate invoice

- `POST /api.php?action=invoices`
- JSON body: `{"order_id":12,"tax_rate":12,"discount":0}`
- `order_id` is required; `tax_rate` and `discount` default to `0` and must be non-negative numeric values.

### Process payment

- `POST /api.php?action=invoices&post-method=payment`
- JSON body: `{"order_id":12,"payment_method":"CASH","payment_reference":"REF-001"}`
- `order_id` and `payment_method` are required. `payment_reference` is optional and generated automatically when omitted. The authenticated user's ID is used as the receiver.

### Release vehicle

- `POST /api.php?action=invoices&post-method=release-vehicle`
- Supply `order_id` as a query parameter or in the JSON body. Example body: `{"order_id":12}`.
- The controller also accepts `orderId` as an alias. An authenticated session is required. Returns a success message when the repair order is fulfilled; invalid or missing order IDs return `400`, and unauthenticated requests return `401`.

## Parts inventory

### List inventory

- `GET /api.php?action=parts`
- Optional query parameters: `status` (defaults to `ALL`) and `search`.

### Restock inventory

- `POST /api.php?action=parts&post-method=restock`
- JSON body: `{"part_id":7,"quantity":10}`
- Both values must be positive integers.

## Mechanics

### List mechanics

- `GET /api.php?action=mechanics`

### List mechanics available for an order

- `GET /api.php?action=mechanics&available=true&order_id=12`
- `order_id` is required by the handler and may be supplied in the query string or JSON body.

### Create mechanic

- `POST /api.php?action=mechanics`
- JSON body: `{"user_id":8,"specialization":"Engine","date_hired":"2025-01-15","status":"ACTIVE"}`
- Required: `user_id`, `specialization`, and `date_hired`. `status` defaults to `ACTIVE`.

### Update mechanic

- `PUT /api.php?action=mechanics`
- JSON body: `{"mechanic_id":3,"user_id":8,"specialization":"Engine","date_hired":"2025-01-15","status":"ACTIVE"}`
- Required: `mechanic_id`, `user_id`, `specialization`, and `date_hired`. `status` defaults to `ACTIVE`.

### Delete mechanic

- `DELETE /api.php?action=mechanics`
- JSON body: `{"mechanic_id":3}`
- Performs a soft delete.

> Implementation note: the `mechanics` switch case currently has no `break` before `parts`. A mechanics GET may therefore continue into the parts handler and append another JSON response. Fix the dispatcher before relying on a clean mechanics-list response.

## Other read endpoints

### Users/staff

- `GET /api.php?action=users`
- Returns staff records under the `users` property. Role permissions restrict this action to role ID `1`.
- `PUT /api.php?action=users` updates a user. Required JSON fields: `user_id`, `username`, `first_name`, `last_name`, `contact_no`, `email`, and `role_id`. `middle_name` is optional and `status` defaults to `ACTIVE`.
- `DELETE /api.php?action=users` soft-deletes a user. JSON body: `{"user_id":8}`. The currently authenticated user cannot delete their own account.

### Reports dashboard

- `GET /api.php?action=reports`
- Returns service-advisor dashboard cards under `data`. The route only emits this response for role ID `2`.

### Customers

- `GET /api.php?action=customers`
- Optional query parameter: `search`.
- The route only invokes the customer-record handler for role ID `2`.

### Services catalog

- `GET /api.php?action=services`
- Optional query parameter: `search`.

### Mechanic positions

- `GET /api.php?action=mechanic-position`
- Returns the mechanic-position records.

## Implemented write methods and gaps

The dispatcher also contains method branches that do not call a handler, so they are not functional endpoints: `POST /users`; `POST`, `PUT`, and `DELETE /customers`; `PUT` and `DELETE /parts`; `POST`, `PUT`, and `DELETE /services`; and `POST`, `PUT`, and `DELETE /mechanic-position`. The `users` route does implement `PUT` (update) and `DELETE` (soft delete). The role table restricts DELETE to role ID `1`, but its update permission is keyed as `UPDATE` while the dispatcher checks the actual method `PUT`; as written, the role guard does not apply that configured restriction to user updates.

## Responses and errors

Response shapes vary by route. Many handlers return `{"status":"success","data":...}` and may include `count`, `message`, or other route-specific fields. Authentication and some simple routes use different shapes. Errors commonly include an `error` string, and may return HTTP `400`, `401`, `403`, `404`, or `500` depending on the failure. Unknown actions return `404`; invalid repair-order categories or operation names return `400`.

## Order lifecycle

1. Create intake.
2. Assign a diagnostician.
3. Submit diagnosis with required services.
4. Assign mechanic(s) and positions.
5. Log parts used; cancel an order part to return it to inventory when needed.
6. Restock inventory if necessary.
7. Mark the order ready to invoice.
8. Generate the invoice and process payment.
