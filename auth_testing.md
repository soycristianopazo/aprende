# Auth Testing Playbook - E-Learning Platform

## Test Users
- Admin: admin@elearning.com / admin123
- Student: estudiante@test.com / test123

## Step 1: Create Test User & Session
```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```bash
API_URL="https://trainingdesk-1.preview.emergentagent.com/api"

# Login
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@elearning.com","password":"admin123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# Test protected endpoints
curl -s -X GET "$API_URL/auth/me" -H "Authorization: Bearer $TOKEN"
curl -s -X GET "$API_URL/users" -H "Authorization: Bearer $TOKEN"
curl -s -X GET "$API_URL/courses" -H "Authorization: Bearer $TOKEN"
```

## Step 3: Browser Testing
```javascript
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "trainingdesk-1.preview.emergentagent.com",
    "path": "/",
    "httpOnly": true,
    "secure": true,
    "sameSite": "None"
}]);
await page.goto("https://trainingdesk-1.preview.emergentagent.com");
```

## Quick Debug
```bash
mongosh --eval "
use('test_database');
db.users.find().limit(2).pretty();
db.user_sessions.find().limit(2).pretty();
"
```

## Checklist
- [x] User document has user_id field
- [x] Session user_id matches user's user_id
- [x] All queries use {"_id": 0} projection
- [x] Backend queries use user_id
- [x] API returns user data
- [x] Dashboard loads without redirect
- [x] CRUD operations work

## Success Indicators
✅ /api/auth/me returns user data
✅ Dashboard loads without redirect
✅ CRUD operations work
