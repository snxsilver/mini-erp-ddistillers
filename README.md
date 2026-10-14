# Mini ERP — Inventory Management
### Take-Home Assessment | PT. Syailendra Bumi Investama (DDistillers)

**Candidate:** M Syaiful Adli
**Actual Working Duration:** Approx. 4 hours
**Deployment URL:** https://syaiful-erp-ddistillers.vercel.app/

## 1. Overview

A client-side inventory management ERP simulation developed for the PT. Syailendra Bumi Investama (DDistillers) take-home assessment.

The application demonstrates core inventory workflows, including role-based demo authentication, dashboard metrics, product catalog management, stock-in and stock-out transactions, movement history, product-level stock reconciliation, and inventory reset.

The application does not have its own backend. Application state and demo user accounts are persisted in the browser using `localStorage`.

## 2. Features

- **Role-based access control:** Three demo roles with different permissions.
- **Inventory dashboard:** Overview of total SKUs, total stock units, low-stock products, and estimated inventory value in IDR.
- **Product catalog:** Search, sorting, and filtering.
- **Stock transactions:** Validated stock-in and stock-out operations with transaction descriptions.
- **Movement history:** Combined filtering of inventory movements.
- **Product details:** Product-level information and stock reconciliation.
- **User management:** Create, edit, delete, activate, deactivate, and reset passwords for demo users, subject to permissions.
- **Inventory reset:** Restore products to their opening stock and clear movement history while preserving user accounts and the current session.
- **Local persistence:** Store application data and demo session information in the browser.
- **Unit testing:** Automated tests for important business rules and inventory calculations.

## 3. Technology Stack

| Category | Technology |
|---|---|
| UI framework | React |
| Build tool | Vite |
| Language | TypeScript |
| State management | Redux Toolkit, React Redux |
| Styling | Tailwind CSS v4 |
| Routing | React Router |
| Testing | Vitest, React Testing Library |
| Icons | Lucide React |
| Persistence | Browser localStorage |
| Initial product data | DummyJSON API |

## 4. Prerequisites

Ensure the following tools are installed:

- Node.js 20 or later
- npm

## 5. Installation and Setup

Clone the repository and navigate to the project directory.

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

## 6. Build and Testing

Create a production build:

```bash
npm run build
```

This command runs TypeScript compilation checks and builds the application using Vite.

Preview the production build locally:

```bash
npm run preview
```

Run the unit test suite:

```bash
npm test
```

The test command runs Vitest in non-watch mode (`vitest run`).

## 7. Demo Access

The following accounts are seeded for assessment purposes.

| Role | Email | Password |
|---|---|---|
| Manager | `manager@demo.local` | `manager123` |
| Admin Gudang | `admin@demo.local` | `admin123` |
| Owner | `owner@demo.local` | `owner123` |

These credentials are intended exclusively for the local demo simulation.

## 8. Roles and Permissions

| Capability | Admin Gudang | Manager | Owner |
|---|:---:|:---:|:---:|
| View dashboard and product catalog | ✓ | ✓ | ✓ |
| View product details and movement history | ✓ | ✓ | ✓ |
| Search, sort, and filter products | ✓ | ✓ | ✓ |
| Create stock-in and stock-out transactions | ✓ | ✓ | ✗ |
| Reset demo inventory | ✗ | ✓ | ✗ |
| View user list | ✗ | ✓ | ✓ (read-only) |
| Create, edit, and delete users | ✗ | ✓ | ✗ |
| Change user roles | ✗ | ✓ | ✗ |
| Activate and deactivate users | ✗ | ✓ | ✗ |
| Reset user passwords | ✗ | ✓ | ✗ |

Role definitions and permission mappings are centralized in `ROLE_PERMISSIONS` within `features/auth/authUtils.ts`. Permission checks are performed through `hasPermission`.

Permission checks are applied at multiple application layers:

1. **Route guards** control access to protected pages.
2. **UI visibility** determines which actions are presented to each role.
3. **Thunks and business logic** validate whether an operation is permitted.

These checks improve application consistency but do not provide secure authorization against a user who can modify client-side state.

### 8.1 User Management Rules

- Email addresses must be unique, regardless of letter casing.
- Inactive and deleted accounts cannot log in.
- If an active user's account is deactivated or deleted, the session is invalidated.
- At least one active Manager must always exist.
- A Manager cannot demote, deactivate, or delete their own account.
- Deleting a user does not delete their inventory movements. Each movement retains its `userId` and `userName` snapshot for historical attribution.
- Role changes take effect immediately because the current user's permissions are derived from the live user list.
- Resetting inventory preserves user accounts and the current session.
- User accounts are persisted under `mini-erp:users:v1`.
- If stored user-account data fails validation, the application falls back to the seeded demo accounts.

## 9. Architecture and State Management

The application separates business rules, state transitions, persistence, and presentation logic to improve maintainability and testability.

### 9.1 Inventory Business Logic

`features/inventory/inventoryUtils.ts`

Contains pure, framework-independent business logic, including:

- SKU generation and validation
- Stock transaction validation
- `recordMovement`
- `expectedStock`
- Inventory valuation
- Product and movement filtering

Both UI components and the Redux slice reuse these functions to avoid duplicating business rules in presentation code.

### 9.2 Inventory State Management

`inventorySlice.ts`

The `submitMovement` thunk handles authorization and generates non-deterministic values, such as transaction IDs and timestamps, outside the reducer.

The `movementCommitted` reducer invokes `recordMovement` again before committing a transaction. This ensures that the stock balance and movement history are updated together in a single Redux state transition. Invalid transaction payloads produce no state changes.

### 9.3 Persistence

`store.ts`

The `attachPersistence` mechanism provides a single store subscriber responsible for writing application state to `localStorage`.

UI components do not access browser storage directly, keeping persistence logic centralized.

### 9.4 Derived Data

Dashboard metrics and filtered movement history are derived through selectors and memoization rather than stored as independent state.

This reduces duplicated state and helps maintain consistency when inventory data changes.

## 10. Initialization and Persistence Strategy

On initial load, the application attempts to restore valid persisted data. If valid product and movement data are unavailable, it fetches initial product data from:

`https://dummyjson.com/products?limit=100`

The response is mapped to the application's product model and persisted locally.

Existing valid persisted data is not overwritten by newly fetched API data.

### 10.1 Storage Keys

| Key | Purpose |
|---|---|
| `mini-erp:products:v1` | Product records and stock data |
| `mini-erp:movements:v1` | Inventory movement history |
| `mini-erp:session:v1` | Demo session information |
| `mini-erp:users:v1` | Demo user accounts |

### 10.2 Data Validation

Persisted inventory data is validated for:

- Correct data types
- Unique product IDs and SKUs
- Valid movement arithmetic
- Consistency between opening stock, movements, and current stock

The stock invariant is:

`currentStock = openingStock + totalStockIn - totalStockOut`

Data that fails validation is treated as corrupted and triggers reinitialization from the API. Depending on which stored dataset is invalid, this may replace locally persisted data; the application does not provide a separate recovery or backup mechanism.

### 10.3 Inventory Reset

Resetting the inventory restores each product to its stored opening stock and clears movement history.

The operation does not refetch product data and does not reset user accounts or the current login session.

If a persistence write fails, the application displays a warning banner indicating that changes are not being saved.

## 11. SKU Generation

SKUs are generated using the following format:

`SKU-` + DummyJSON product ID, zero-padded to four digits.

Example:

- Product ID `7` → `SKU-0007`
- Product ID `42` → `SKU-0042`

This deterministic strategy produces unique SKUs as long as the source product IDs are unique.

## 12. Simulated Data and Assumptions

Some inventory fields are simulated because the source API does not provide the information required by the assessment.

### 12.1 Opening Stock

Opening stock is generated using:

`(productId × 17 + 5) mod 31`

The resulting value ranges from 0 to 30 units. This deterministic formula produces reproducible demo data and deliberately includes low-stock products.

### 12.2 Units

The default unit of measurement is `pcs` because DummyJSON does not provide inventory units.

### 12.3 Product Prices

DummyJSON prices are converted from USD to IDR using a fixed demonstration rate of IDR 16,000 per USD.

Converted prices are rounded to whole rupiah and stored in the application.

This rate is a fixed demo assumption, not a live exchange rate.

## 13. Business Rules and Inventory Integrity

### 13.1 Transaction Validation

- Quantity must be a positive safe integer.
- Zero, negative values, decimals, empty values, and non-numeric values are rejected.
- Stock-out quantities cannot exceed the current available stock.
- A transaction description is required.
- Rejected transactions must not change the stock balance or movement history.

### 13.2 Low-Stock Threshold

A product is classified as low stock when:

`currentStock < 5`

Products with zero stock are included in the low-stock count.

### 13.3 Inventory Valuation

Estimated inventory value is calculated as:

`totalInventoryValue = Σ(currentStock × priceIdr)`

The result represents the simulated value of the inventory based on stored IDR prices. It is not an independently verified accounting valuation.

### 13.4 Stock Reconciliation

For each product, the following invariant must hold:

`currentStock = openingStock + ΣIN − ΣOUT`

This relationship is used to validate stored inventory data and maintain consistency between stock balances and movement history.

## 14. Security Limitations

Authentication and authorization are simulated entirely in the browser. Demo passwords are stored as plain text in `localStorage` so that user creation and password-reset workflows can function without a backend.

A user can modify browser storage, Redux state, or the client bundle to bypass the simulated permission controls. Route guards, hidden buttons, and reducer-level checks are therefore consistency and user-experience controls, not production security boundaries.

A production implementation would require:

- Server-side authentication with securely hashed passwords
- Secure session management
- Server-enforced authorization for every protected operation
- Server-side transaction validation and stock reconciliation
- A server-side append-only audit log
- Appropriate data protection, access controls, and recovery procedures

## 15. External Services

The application uses DummyJSON as the initial source of product data.

- **Service:** DummyJSON
- **Endpoint:** `https://dummyjson.com/products?limit=100`
- **Purpose:** Fetch initial product catalog data
- **Product images:** Loaded directly from the provider's CDN

No other external services or API secrets are required by the described implementation.

## 16. Known Limitations

- **No dedicated backend:** Authentication, authorization, business logic, and persistence operate on the client.
- **Single-browser storage:** Data is stored locally and is not synchronized across browsers, devices, or tabs.
- **No concurrency control:** Simultaneous edits or transactions from separate application instances are not coordinated.
- **Limited catalog size:** The initial catalog is limited to 100 products, without pagination.
- **No product CRUD:** Product creation, editing, and deletion are not implemented.
- **Storage limitations:** Browser storage has quota limits and can be cleared or modified by the user.
- **Fixed exchange rate:** Prices use a predefined conversion rate rather than a live exchange rate.
- **No server-side audit trail:** Movement history is stored locally and can be modified or lost.
- **AI feature not implemented:** AI-assisted inventory analysis is outside the current implementation. A production AI integration would require an appropriate backend endpoint to protect API credentials and validate access to inventory data.

## 17. AI Usage Notes

**How AI was used:**
All application code was generated with AI assistance. AI was used to generate the initial implementation, suggest application architecture, implement business logic and role-based access control, create unit tests, and assist with debugging. However, relying entirely on AI-generated code without sufficient review is **not recommended**, as the generated implementation may not fully satisfy business requirements or appropriate access-control principles.

**Code reviewed line by line:**
The generated code was reviewed and verified during development, particularly the authentication and permission utilities (`src/features/auth/authUtils.ts`), inventory business logic (`src/features/inventory/inventoryUtils.ts`), inventory state management and transactions (`src/features/inventory/inventorySlice.ts`), persistence (`src/services/persistence.ts`), route protection (`src/routes/ProtectedRoute.tsx`), and related unit tests. Testing and debugging were used to verify the intended behavior.

**Example of an AI mistake and its resolution:**
The initial AI-generated implementation included only two roles: Admin, who could access all application functions, and Owner, who could only view data. This role structure was not suitable for the intended business workflow because it did not adequately separate inventory operations, management responsibilities, and read-only access.

The implementation was revised to introduce three roles: Admin Gudang, who can record inventory movements; Manager, who can record movements, reset demo data, and manage user accounts; and Owner, who can view inventory and user data without permission to record movements or reset demo data.

The permission rules were centralized in `src/features/auth/authUtils.ts` and verified through automated tests. An inventory reset test also initially failed because it expected Admin Gudang to be allowed to reset demo data. After checking the permission configuration, the test was corrected to use the Manager role, which has the required permission.

The final test run passed all **117 tests across 8 test files**, covering inventory logic, permissions, persistence, route protection, and user management.

## 18. Candidate Details

- **Name:** M Syaiful Adli
- **Actual Working Duration:** Approx. 4 hours
- **Repository:** https://github.com/snxsilver/mini-erp-ddistillers.git
- **Deployment:** https://syaiful-erp-ddistillers.vercel.app/
