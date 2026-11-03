# CivicConnect — CitySync Citizen Complaint Portal

CivicConnect is a React, Express, and MongoDB portal for resident reports and city service teams. Residents can file issues, follow private updates, and browse privacy-safe community summaries. Staff work a department-scoped queue with assignments and response deadlines.

## Included features

- Resident registration and sign-in with salted scrypt password hashes and expiring signed sessions
- Department staff accounts provisioned from server environment settings; staff access is restricted by city and department
- Private resident complaint history, status timelines, department notes, and in-app notifications
- Photo and PDF evidence upload (up to four JPEG, PNG, WebP, or PDF files, 5 MB each), kept outside the public static directory and served only to the reporting resident or authorized staff
- Department and category handling for Municipal, RTO, Water, Electricity, Sanitation, Roads, Public safety, and Other
- Complaint assignment, status updates, priority/service targets, and automatic overdue escalation
- Optional email (SMTP) and SMS (Twilio) updates, with resident notification preferences
- Nearby duplicate suggestions and resident-selected grouping with a related open complaint
- Public, aggregate city metrics for report volume, departments, resolution time, and overdue targets; no resident details are included
- City search, interactive OpenStreetMap, nearby places, route directions, and exact map pins for complaints
- English/Telugu interface toggle, keyboard focus management, skip navigation, reduced-motion support, and responsive layouts

## Run locally

1. Install Node.js 18 or newer.
2. From the project root, run `npm install`.
3. Copy `backend/.env.example` to `backend/.env`, set `MONGODB_URI`, and provide a long random `JWT_SECRET`. Configure Atlas network access and its database user.
4. To provision the first city staff user, set `STAFF_NAME`, `STAFF_EMAIL`, `STAFF_PASSWORD` (at least 10 characters), `STAFF_DEPARTMENT`, and `STAFF_CITY` in `backend/.env`, then restart the backend. Use `All departments` only for a city administrator.
5. Run `npm run dev` from the project root and open [http://localhost:5173](http://localhost:5173).

The React application and map are in `frontend/`. The API and MongoDB models are in `backend/` and run on port 5001. `GET /api/health` reports connection status. Authenticated requests use a bearer token returned by `/api/auth/register` or `/api/auth/login`.

### Optional notifications

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` for email. SMS requires Twilio's `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM`. Residents must provide a phone number and explicitly opt into SMS. When an authority changes a complaint to Resolved, an opted-in resident receives a resolution SMS; the text includes the complaint reference and any resolution note. In-app notifications work without either provider.

### Privacy and deployment notes

Community browsing returns complaint summaries only. Descriptions, timelines, and evidence files require the resident's session or staff access. Public map coordinates are rounded to reduce location precision. Do not expose `backend/private-uploads`, commit `.env`, or use a development JWT secret in production. Serve the app over HTTPS, rotate secrets, back up the database and photo storage, and configure SMTP/Twilio credentials before promising external delivery. Resident account registration does not yet include email verification or password reset.

The map uses OpenStreetMap tiles, Nominatim search, and OSRM directions. Public providers are best-effort and may be rate-limited; the map has no live traffic feed. See the [tile policy](https://operations.osmfoundation.org/policies/tiles/) and [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/).
