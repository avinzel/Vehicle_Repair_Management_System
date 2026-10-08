# Vehicle Repair Management System API Documentation

This document describes the current backend API used by the vehicle repair management system.

## 1) Base URL and request conventions

- Base URL: `http://localhost:8000/api.php`
- Every route is called through `api.php` using the `action` query parameter.
- Authenticated frontend requests must include `credentials: 'include'` so the browser sends the PHP session cookie.
- JSON request bodies should use `Content-Type: application/json`.

Example:

```js
fetch('http://localhost:8000/api.php?action=repair-orders', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    order_id: 12,
    payment_method: 'CASH'
  })
});
```

Notes:

- CORS is enabled for `http://localhost:5173`.
- `OPTIONS` preflight requests are handled automatically.
- Public routes (`register`, `login`, `check-auth`, `logout`) do not require authentication.
- All other routes require an active session.
- Some routes also apply additional role-based authorization.

## 2) Common response patterns

Most endpoints return JSON shaped like one of these:

```json
{
  "status": "success",
  "data": {}
}
```

or

```json
{
  "status": "success",
  "count": 10,
  "data": []
}
```

or

```json
{
  "status": "error",
  "error": "Something went wrong"
}
```

Common HTTP status codes:

- `200` OK
- `201` Created
- `400` Bad Request / validation failure
- `401` Unauthorized / no valid session
- `403` Forbidden / insufficient role access
- `404` Not found / invalid action or category
- `500` Server error

## 3) Quick reference

| Action | Method | Purpose | Auth required | Notes |
|---|---|---|---|---|
| `register` | POST | Create a user account | No | Public route |
| `login` | POST | Log in and create session | No | Public route |
| `check-auth` | GET | Check current session | No | Public route |
| `logout` | GET / POST | Destroy session | No | Public route |
| `test-auth` | GET / POST | Basic authenticated test route | Yes | Debug route |
| `repair-orders` | GET / POST / PUT | Repair-order dashboard and workflow | Yes | Many sub-actions |
| `users` | GET / PUT / DELETE | Staff/user management | Yes | Role-protected |
| `reports` | GET | Dashboard analytics and admin reports | Yes | Categories-based |
| `customers` | GET / POST / PUT / DELETE | Customer and vehicle records | Yes | CRUD writes; delete is soft deactivation |
| `mechanics` | GET / POST / PUT / DELETE | Mechanic records and assignment support | Yes | Some role restrictions |
| `parts` | GET / POST / PUT / DELETE | Inventory list and management | Yes | Create/edit/delete are admin-only |
| `invoices` | GET / POST | Invoice generation and payment flows | Yes | Payment and release sub-actions |
| `services` | GET / POST / PUT / DELETE | Service catalog management | Yes | Writes are admin-only |
| `mechanic-position` | GET | Mechanic position catalog | Yes | Read-only at the moment |

## 4) Query parameter conventions

The backend checks a specific set of query keys. It does not support arbitrary query naming beyond what the controller explicitly reads.

### Common aliases the app accepts

These are the most important aliases used across the API:

- `order_id` / `orderId`
- `customer_id` / `customerId`
- `mechanic_id` / `mechanicId`
- `order_part_id` / `orderPartId`
- `tax_rate` / `taxRate`

### Common supported query parameters

- `action` — required for routing
- `category` — used for `repair-orders` and `reports`
- `post-method` — used for `repair-orders`, `parts`, `invoices`
- `put-method` — used for `repair-orders`
- `status` — used for filtering lists
- `search` — text search filter
- `limit` — result cap on some report endpoints
- `sort_by`, `sort_order` — used for staff/mechanics/admin parts sorting
- `available` — used by mechanics availability lookup

### Important note

Most of the API supports both snake_case and camelCase variants for the common IDs, but the router itself still expects the exact `action` names and specific `category` / `post-method` / `put-method` values listed below.

## 5) Authentication endpoints

### 5.1 Register

- `POST /api.php?action=register`
- Public route
- Request body:

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

Required fields:

- `username`
- `password`
- `first_name`
- `last_name`
- `contact_no`
- `email`
- `role_id`

Optional:

- `middle_name`

Success:

- HTTP `201`
- Returns success message and created user account data

### 5.2 Login

- `POST /api.php?action=login`
- Public route
- Request body:

```json
{
  "username": "serviceadvisor1",
  "password": "secret123"
}
```

On success, the server stores session values including:

- `user_id`
- `username`
- `role_id`

Response includes the authenticated user details and a session message.

### 5.3 Check current session

- `GET /api.php?action=check-auth`
- Public route
- Returns the authenticated user information if logged in.
- Returns `401` if no user is in session.

### 5.4 Logout

- `GET /api.php?action=logout`
- `POST /api.php?action=logout`
- Public route
- Clears the current session and returns a success message.

### 5.5 Test auth

- `GET /api.php?action=test-auth`
- `POST /api.php?action=test-auth`
- Protected route
- Returns a greeting using the current authenticated username.

## 6) Repair orders

Main action: `action=repair-orders`

This route uses sub-selection via:

- `category` for GET operations
- `post-method` for POST operations
- `put-method` for PUT operations

### 6.1 Supported GET categories

Allowed values:

- `active`
- `inactive`
- `history`
- `parts-by-order`
- `assigned`

### 6.2 Default dashboard

- `GET /api.php?action=repair-orders`
- No category needed
- Returns the service-advisor dashboard dataset under `data`

### 6.3 Active repair orders list

- `GET /api.php?action=repair-orders&category=active`
- Optional query parameters:
  - `status` (default: `ALL`)
  - `search`
- Response includes a `count` and array of orders

### 6.4 Active order detail

- `GET /api.php?action=repair-orders&category=active&order_id=12`
- `order_id` required
- Returns detailed information for one repair order

Also accepted:

- `?category=active&orderId=12`

### 6.5 Billing and invoicing list

- `GET /api.php?action=repair-orders&category=inactive`
- Optional query parameter:
  - `search`
- Despite the name `inactive`, this route returns billing and invoicing records.

### 6.6 Order history

- `GET /api.php?action=repair-orders&category=history`
- Optional query parameter:
  - `search`
- Response includes:
  - `count`
  - `total_revenue`
  - `data`

### 6.7 Parts used on a repair order

- `GET /api.php?action=repair-orders&category=parts-by-order&order_id=12`
- `order_id` required
- Response includes:
  - `count`
  - `total_parts_cost`
  - `data`

### 6.8 Mechanic work orders

- `GET /api.php?action=repair-orders&category=assigned`
- Optional query parameter:
  - `mechanic_id`
- If no `mechanic_id` is provided, the backend attempts to infer the current logged-in user’s mechanic record.

### 6.9 Create vehicle intake

- `POST /api.php?action=repair-orders`
- Auth required
- Request body supports nested `customer`, `vehicle`, and `order` objects.

Example:

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

Required fields:

- customer first name
- customer last name
- customer phone
- vehicle plate number
- vehicle type
- vehicle make
- vehicle model
- order complaint

Optional fields:

- customer middle name
- customer email
- vehicle year
- vehicle color
- vehicle mileage
- order priority

Accepted key aliases:

- `firstName` / `first_name`
- `middleName` / `middle_name`
- `lastName` / `last_name`
- `phone` / `phone_number`
- `email` / `email_address`
- `plateNumber` / `plate_number`
- `vehicleType` / `vehicle_type`
- `currentMileage` / `current_mileage`
- `diagnostic_notes` / `diagnosis_notes`

Success:

- HTTP `201`
- Returns created `order_id`, `customer_id`, and `vehicle_id`

### 6.10 Assign diagnostician

- `POST /api.php?action=repair-orders&post-method=assign-diagnostician`
- Auth required
- Request body:

```json
{
  "order_id": 12,
  "mechanic_id": 3
}
```

Alternate accepted aliases:

- `orderId`, `mechanicId`
- `diagnostician_id` / `diagnosticianId`

### 6.11 Submit diagnosis

- `POST /api.php?action=repair-orders&post-method=submit-diagnosis`
- Auth required
- Request body:

```json
{
  "order_id": 12,
  "diagnostic_notes": "Loose radiator hose and coolant leak.",
  "required_services": [1, 5, 8]
}
```

Required:

- `order_id`
- `diagnostic_notes`

Also accepted:

- `diagnosis_notes` instead of `diagnostic_notes`
- `services` instead of `required_services`

### 6.12 Assign mechanic to repair job

- `POST /api.php?action=repair-orders&post-method=assign-mechanic`
- Auth required
- Request body:

```json
{
  "order_id": 12,
  "mechanic_id": 4,
  "position_id": 2
}
```

Also accepted:

- `orderId`, `mechanicId`, `positionId`
- `pos_id`, `posId`

### 6.13 Log a used part

- `POST /api.php?action=repair-orders&post-method=log-part`
- Auth required
- Request body:

```json
{
  "order_id": 12,
  "part_id": 7,
  "quantity": 2
}
```

Also accepted:

- `orderId`, `partId`, `qty`

### 6.14 Mark order ready to invoice

- `POST /api.php?action=repair-orders&post-method=mark-ready-to-invoice`
- Auth required
- Request body:

```json
{
  "order_id": 12
}
```

### 6.15 Cancel part on an order

- `PUT /api.php?action=repair-orders&put-method=cancel-order-part`
- Auth required
- Query parameter or JSON body:

```json
{
  "order_part_id": 12
}
```

Also accepted:

- `order_part_id` / `orderPartId` as a query param

This action restores inventory quantity for the cancelled part.

## 7) Invoices

Action: `invoices`

### 7.1 Get invoice details

- `GET /api.php?action=invoices&order_id=12`
- Auth required
- `order_id` required
- Query parameter recommended for GET requests

Also accepted:

- `orderId`
- JSON body containing `order_id`

### 7.2 Generate invoice

- `POST /api.php?action=invoices`
- Auth required
- Request body:

```json
{
  "order_id": 12,
  "tax_rate": 12,
  "discount": 0
}
```

Required:

- `order_id`

Optional:

- `tax_rate` (default `0`, must be non-negative numeric)
- `discount` (default `0`, must be non-negative numeric)

Also accepted:

- `orderId`, `taxRate`

### 7.3 Process payment

- `POST /api.php?action=invoices&post-method=payment`
- Auth required
- Request body:

```json
{
  "order_id": 12,
  "payment_method": "CASH",
  "payment_reference": "REF-001"
}
```

Required:

- `order_id`
- `payment_method`

Optional:

- `payment_reference` (auto-generated if omitted)

The authenticated session user is used as the receiving employee.

### 7.4 Release vehicle after fulfillment

- `POST /api.php?action=invoices&post-method=release-vehicle`
- Auth required
- Accepts `order_id` in query string or JSON body

Example:

```json
{
  "order_id": 12
}
```

Also accepted:

- `orderId`

This action marks the repair order as fulfilled/released when eligible.

## 8) Parts inventory

Action: `parts`

### 8.1 List inventory

- `GET /api.php?action=parts`
- Auth required
- Optional query params:
  - `status` (default `ALL`)
  - `search`

### 8.2 Admin inventory view

- `GET /api.php?action=parts`
- Auth required
- When the authenticated user has `role_id = 1`, this route uses the admin inventory handler.
- Optional query params:
  - `search`
  - `stock_level`
  - `sort_by`
  - `sort_order`

Supported admin sort values:

- `name`
- `qty`
- `cost`
- `stock_level`

Supported sort order:

- `ASC`
- `DESC`

### 8.3 Add part

- `POST /api.php?action=parts`
- Admin role (`role_id = 1`) required.
- Request body uses the existing part form fields:

```json
{
  "part_name": "Engine Oil (1L)",
  "unit": "bottle",
  "quantity_on_hand": 10,
  "unit_price": 350
}
```

Required: `part_name` (up to 150 characters), `unit` (up to 20 characters), `quantity_on_hand` (non-negative integer), and `unit_price` (non-negative number). The current form uses `pc`, `set`, `pair`, `liter`, or `bottle`.

Part names are compared case-insensitively after trimming; a duplicate name returns HTTP `409` with `A part with this name already exists.` This check includes inactive records.

The backend generates `part_code` and `batch_number` when omitted. Optional schema fields are `part_code`, `category`, `vehicle_types` (comma-separated `CAR`, `MOTORCYCLE`, and/or `TRICYCLE`), `reorder_level` (non-negative integer; defaults to `5`), and `batch_number`.

Returns `201` with `part_id`; duplicate supplied part codes return `409`.

### 8.4 Edit part

- `PUT /api.php?action=parts`
- Admin role (`role_id = 1`) required.
- JSON body:

```json
{
  "part_id": 7,
  "part_name": "Engine Oil (1L)",
  "unit": "bottle",
  "quantity_on_hand": 10,
  "unit_price": 350
}
```

All fields shown are required. Only active parts can be edited. Returns `200` on success, `400` for invalid fields, and `404` if no active part matches.
Updating to another existing part name returns HTTP `409` with `A part with this name already exists.`

### 8.5 Delete part

- `DELETE /api.php?action=parts`
- Admin role (`role_id = 1`) required.
- JSON body: `{"part_id":7}`
- Soft-deletes by setting `status` to `INACTIVE`; the row and historical repair-order references remain.
- Returns `204` on success or `404` if no active part matches.
- Returns `409` if any associated `repair_order_parts` row is pending. The current schema names this state `PENDING_PARTS`; the API check also recognizes `PENDING` for compatible databases.

### 8.6 Restock inventory

- `POST /api.php?action=parts&post-method=restock`
- Auth required
- Request body:

```json
{
  "part_id": 7,
  "quantity": 10
}
```

Required:

- `part_id`
- `quantity`

Validation:

- both must be positive integers

## 9) Mechanics

Action: `mechanics`

### 9.1 List all mechanics

- `GET /api.php?action=mechanics`
- Auth required
- Optional query params:
  - `search`
  - `status`
  - `sort_by`
  - `sort_order`

### 9.2 Available mechanics for a repair order

- `GET /api.php?action=mechanics&available=true&order_id=12`
- Auth required
- Requires:
  - `order_id` or `orderId`
- Returns mechanics who are not already assigned to that repair order.

### 9.3 Create mechanic record

- `POST /api.php?action=mechanics`
- Auth required
- Request body:

```json
{
  "user_id": 8,
  "specialization": "Engine",
  "date_hired": "2025-01-15",
  "status": "ACTIVE"
}
```

Required:

- `user_id`
- `specialization`
- `date_hired`

Optional:

- `status` (defaults to `ACTIVE`)

### 9.4 Update mechanic record

- `PUT /api.php?action=mechanics`
- Auth required
- Request body:

```json
{
  "mechanic_id": 3,
  "specialization": "Engine",
  "date_hired": "2025-01-15",
  "status": "ACTIVE"
}
```

Required:

- `mechanic_id`
- `specialization`
- `date_hired` (`YYYY-MM-DD`)

Optional:

- `status` (`ACTIVE` or `INACTIVE`; defaults to `ACTIVE`)

The linked `user_id` is looked up from the mechanic record; it is not required from the edit form. Mechanic and linked user statuses update together.
Setting status to `INACTIVE` is rejected with HTTP `409` if the mechanic has an active repair order (`PENDING_DIAGNOSIS`, `AWAITING_DIAGNOSIS`, `PENDING_MECHANICS`, `IN_PROGRESS`, or `AWAITING_PARTS`).

### 9.5 Delete mechanic record

- `DELETE /api.php?action=mechanics`
- Auth required
- Request body:

```json
{
  "mechanic_id": 3
}
```

This performs a soft delete.
- Both `mechanics.status` and the linked `users.status` are set to `INACTIVE` in one transaction.
- Deactivation is rejected with HTTP `409` if the mechanic has an active repair order (`PENDING_DIAGNOSIS`, `AWAITING_DIAGNOSIS`, `PENDING_MECHANICS`, `IN_PROGRESS`, or `AWAITING_PARTS`).

## 10) Customers

Action: `customers`

### 10.1 Customer directory

- `GET /api.php?action=customers`
- Auth required
- Roles: 1, 2, and 3
- Optional query param:
  - `search`
- Lists active customers only. The response includes customer name components, contact details, status, vehicle count, and last visit.

### 10.2 Customer details with history

- `GET /api.php?action=customers&customer_id=12`
- Auth required
- `customer_id` required
- `customerId` is also accepted.

Returns customer profile (including name components and status), structured vehicle records, and repair history. Inactive records can still be retrieved by ID for historical context.

### 10.3 Create a customer and optional vehicles

- `POST /api.php?action=customers`
- Auth required; roles 1 and 2
- Required customer fields: `first_name`, `last_name`, `contact_no`
- Optional customer fields: `middle_name`, `email`, `address`
- Optional `vehicles` is an array. Each vehicle requires `plate_number`, `vehicle_type`, `manufacturer`, and `model`. Supported `vehicle_type` values: `CAR`, `MOTORCYCLE`, `TRICYCLE`.
- Optional vehicle fields: `year_model` (1901–2155), `color`, `vin_number`, `current_mileage` (non-negative integer; defaults to 0).

Example:

```json
{
  "first_name": "Jamie",
  "middle_name": null,
  "last_name": "Santos",
  "contact_no": "09171234567",
  "email": "jamie@example.com",
  "address": "Sample address",
  "vehicles": [
    {
      "plate_number": "ABC-1234",
      "vehicle_type": "CAR",
      "manufacturer": "Toyota",
      "model": "Vios",
      "year_model": 2021,
      "color": "Silver",
      "vin_number": null,
      "current_mileage": 12000
    }
  ]
}
```

Success returns HTTP `201` with `customer_id`.

### 10.4 Update a customer and vehicles

- `PUT /api.php?action=customers&customer_id=12`
- Auth required; roles 1, 2, and 3
- `customer_id` may instead be supplied as `customerId` in the query or as `customer_id`/`customerId` in the JSON body.
- Requires `first_name`, `last_name`, and `contact_no`; customer fields are replaced with the supplied values.
- `vehicles` is optional. Each vehicle without `vehicle_id` is added to the customer. To update an existing vehicle, include its `vehicle_id` and the required vehicle fields. It must belong to the specified customer.
- Vehicles omitted from the request are left unchanged; this endpoint does not remove vehicles.
- The customer changes and all submitted vehicle changes are atomic: on any error, none of the changes are committed.

Success returns HTTP `200` with the `customer_id`.

### 10.5 Deactivate a customer

- `DELETE /api.php?action=customers&customer_id=12`
- Auth required; role 1
- `customer_id` may also be supplied as `customerId` in the query or JSON body.
- Deactivation is soft: the customer status becomes `INACTIVE`; the customer, vehicles, and repair history remain in the database.
- Deactivation is rejected with HTTP `409` while any linked repair order is not `FULFILLED` or `CANCELLED`.
- The active customer directory and new vehicle-intake flow exclude/reject inactive customers.

### Customer validation and errors

- HTTP `400`: missing/invalid fields, invalid vehicle type, or invalid customer ID.
- HTTP `404`: customer does not exist, or a submitted vehicle does not belong to the customer.
- HTTP `409`: duplicate email/plate/VIN, update of an inactive customer, or attempted deactivation while an active repair order exists.
- HTTP `500`: unexpected backend/database failure; clients receive a generic message while details are logged server-side.

### Customer identity during vehicle intake

The vehicle-intake endpoint (`POST /api.php?action=repair-orders`) resolves the customer by email first, then by an unambiguous contact number. An inactive customer matched by either identifier is rejected with HTTP `409`. If both identifiers resolve ambiguously, the request is rejected instead of selecting an arbitrary customer. A plate already registered to a different customer is also rejected with HTTP `409`; the backend does not overwrite that customer's contact details.

## 11) Users / staff management

Action: `users`

### 11.1 List staff members

- `GET /api.php?action=users`
- Auth required
- Role restriction: typically admin-level access
- Optional query params:
  - `search`
  - `role_id`
  - `status`
  - `sort_by`
  - `sort_order`

### 11.2 Update user

- `PUT /api.php?action=users`
- Auth required
- Request body:

```json
{
  "user_id": 8,
  "username": "serviceadvisor2",
  "first_name": "Maria",
  "middle_name": "A",
  "last_name": "Bautista",
  "contact_no": "09171234567",
  "email": "maria@example.com",
  "role_id": 2,
  "status": "ACTIVE"
}
```

Required:

- `user_id`
- `username`
- `first_name`
- `last_name`
- `contact_no`
- `email`
- `role_id`

Optional:

- `middle_name`
- `status`

Setting `status` to `INACTIVE` is rejected with HTTP `409` if the user’s linked mechanic has an active order. The active mechanic-work statuses checked by the backend are `PENDING_DIAGNOSIS`, `AWAITING_DIAGNOSIS`, `PENDING_MECHANICS`, `IN_PROGRESS`, and `AWAITING_PARTS`.

### 11.3 Delete user

- `DELETE /api.php?action=users`
- Auth required
- Request body:

```json
{
  "user_id": 8
}
```

This is a soft delete. The currently authenticated user cannot delete their own account. If the user has an associated mechanic, both user and mechanic statuses are set to `INACTIVE` atomically.
If that mechanic still has an active repair order (`PENDING_DIAGNOSIS`, `AWAITING_DIAGNOSIS`, `PENDING_MECHANICS`, `IN_PROGRESS`, or `AWAITING_PARTS`), deactivation is rejected with HTTP `409` until the order is completed or reassigned.

## 12) Reports and analytics

Action: `reports`

### 12.1 Default service-advisor dashboard

- `GET /api.php?action=reports`
- Auth required
- Returns the service-advisor dashboard cards under `data`

### 12.2 Supported report categories

Allowed `category` values:

- `admin-cards`
- `pipeline-status`
- `recent-orders`
- `top-revenue-by-order`
- `revenue-split`
- `pipeline-status-analytics`
- `parts-inventory-cards`
- `top-parts-used`
- `mechanics-order-load`
- `mechanics-cards`

### 12.3 Admin cards

- `GET /api.php?action=reports&category=admin-cards`
- Returns summary metrics

### 12.4 Pipeline status

- `GET /api.php?action=reports&category=pipeline-status`
- Returns the repair-order pipeline by status

### 12.5 Recent orders

- `GET /api.php?action=reports&category=recent-orders`
- Optional query param:
  - `limit`
- Also accepts a JSON body with `limit`

### 12.6 Revenue by order

- `GET /api.php?action=reports&category=top-revenue-by-order`
- Optional query params:
  - `limit`
  - `status`

### 12.7 Revenue split

- `GET /api.php?action=reports&category=revenue-split`
- Returns labor vs parts revenue split

### 12.8 Overall pipeline analytics

- `GET /api.php?action=reports&category=pipeline-status-analytics`
- Returns overall status totals and `grand_total`

### 12.9 Parts inventory cards

- `GET /api.php?action=reports&category=parts-inventory-cards`
- Returns part stock KPI data

### 12.10 Top parts used

- `GET /api.php?action=reports&category=top-parts-used`
- Optional query param:
  - `limit`

### 12.11 Mechanic order load

- `GET /api.php?action=reports&category=mechanics-order-load`
- Returns mechanic work distribution by active/completed orders

### 12.12 Mechanic cards

- `GET /api.php?action=reports&category=mechanics-cards`
- Optional query param:
  - `limit_recent_order`
- Returns summary info for mechanics, including completion rate and recent order activity

## 13) Services catalog

Action: `services`

- `GET /api.php?action=services`
- Auth required
- Optional query param:
  - `search`
- Returns the service catalog entries.

### 13.1 Add service

- `POST /api.php?action=services`
- Admin role (`role_id = 1`) required.
- JSON body:

```json
{
  "service_name": "Brake System Overhaul",
  "description": "Inspect and overhaul the brake system.",
  "standard_labor_cost": 2500
}
```

Required: `service_name` (up to 150 characters) and `standard_labor_cost` (non-negative number).
Optional: `description` (up to 255 characters; blank values are stored as `NULL`).
Returns `201` with `service_catalog_id`; duplicate names return `409`.

### 13.2 Edit service

- `PUT /api.php?action=services`
- Admin role (`role_id = 1`) required.
- JSON body uses the same fields as add, plus `service_catalog_id`:

```json
{
  "service_catalog_id": 4,
  "service_name": "Brake System Overhaul",
  "description": "Inspect and overhaul the brake system.",
  "standard_labor_cost": 2500
}
```

Returns `200` on success, `400` for invalid fields, `404` if the active service is not found, and `409` for a duplicate name.

### 13.3 Delete service

- `DELETE /api.php?action=services`
- Admin role (`role_id = 1`) required.
- JSON body: `{"service_catalog_id":4}`
- Soft-deletes by setting `service_catalog.status` to `INACTIVE`; the service row is retained.
- Returns `204` on success or `404` if no active service matches.

## 14) Mechanic positions

Action: `mechanic-position`

- `GET /api.php?action=mechanic-position`
- Auth required
- Returns values from the `mechanic_positions` table.

No create/update/delete route is currently wired in the dispatcher.

## 15) Known caveats and not-yet-active routes

The router contains some method branches that are not operational or not fully wired:

Not implemented in the current dispatcher:

- `POST /api.php?action=users`
- `POST /api.php?action=mechanic-position`
- `PUT /api.php?action=mechanic-position`
- `DELETE /api.php?action=mechanic-position`

Database upgrade required for existing installations:

- Existing `parts_inventory.status` enums contain `ACTIVE` and legacy `DISCONTINUED`, but not `INACTIVE`. Run [`src/Config/parts_status_inactive_migration.sql`](./src/Config/parts_status_inactive_migration.sql) once on an existing database. Fresh databases created from either schema script already include `INACTIVE`.
- Existing databases must also run [`src/Config/customer_management_migration.sql`](./src/Config/customer_management_migration.sql) once. It adds customer status and installs the customer management/read procedures and the updated vehicle-intake procedure. Fresh databases receive the corresponding definitions from `vehicle_repair_schema.sql`.
- Databases that already ran the customer-management migration must run [`src/Config/customer_intake_identity_migration.sql`](./src/Config/customer_intake_identity_migration.sql) once to update vehicle-intake identity matching and conflict handling.
- Role permissions are keyed to actual HTTP verbs (`PUT`), so the configured restrictions apply to edit routes.

## 16) Order lifecycle summary

The workflow is intended to proceed like this:

1. Create the vehicle intake.
2. Assign a diagnostician.
3. Submit diagnosis with required services.
4. Assign mechanic(s) and positions.
5. Log parts used for the order.
6. Cancel a part if needed, which restores inventory.
7. Restock inventory when necessary.
8. Mark the order ready to invoice.
9. Generate the invoice.
10. Process payment.
11. Release the vehicle.

This is the current business flow supported by the backend endpoints.
