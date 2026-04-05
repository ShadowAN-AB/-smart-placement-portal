# Smart Placement Portal

Phase 1 implementation includes:

- React + Tailwind frontend
- Node.js + Express backend
- MongoDB user storage
- JWT + bcrypt authentication
- Role-based routing to Student and Recruiter dashboards

## Run locally

1. Install root tool dependencies:
   npm install

2. Install server and client dependencies (already done once during scaffold):
   - server: npm install (inside server)
   - client: npm install (inside client)

3. Configure server env:
   cp server/.env.example server/.env

4. Configure client env:
   cp client/.env.example client/.env

5. If using MongoDB Atlas, update server/.env:
   - Set `MONGODB_URI` to your Atlas URI:
     `mongodb+srv://<username>:<url_encoded_password>@<cluster-host>/smart_placement_portal?retryWrites=true&w=majority`
   - Keep `PORT=5050`
   - Set `JWT_SECRET` and `ADMIN_SIGNUP_CODE`

6. If using local MongoDB, keep default:
   - `MONGODB_URI=mongodb://127.0.0.1:27017/smart_placement_portal`

7. Start both apps from root:
   npm run dev

Frontend runs on a Vite local port and proxies `/api` to `http://localhost:5050`.

## MongoDB Atlas checklist

1. Create a dedicated database user in Atlas for this app.
2. Add your current public IP to Atlas Network Access (or use 0.0.0.0/0 temporarily for testing).
3. Ensure password is URL-encoded in `MONGODB_URI`.
4. Start app and verify health endpoint:
   `curl http://localhost:5050/api/health`
