# Strengthen IO — Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Identity Ownership (`users/{userId}`)**: A user profile document can only be created, read, or updated by the authenticated user whose `request.auth.uid == userId` and `incoming().uid == request.auth.uid`.
2. **PII Isolation**: `email` and `phoneNumber` inside `/users/{userId}` are strictly isolated to `isOwner(userId)` (`get` only, no `list` access on `/users`).
3. **Course Ownership (`courses/{courseId}`)**: Every course document must have `ownerId == request.auth.uid`, a valid referencing user profile `exists(/databases/$(database)/documents/users/$(request.auth.uid))`, and can only be queried or modified by its owner.
4. **Terminal State Lock**: Once a course's `status` transitions to `'archived'`, no subsequent updates are permitted.
5. **Temporal Integrity**: `createdAt` must equal `request.time` on creation and remain immutable on update; `updatedAt` must equal `request.time` on both creation and update.
6. **Volumetric & Key Bounds**: Every string and array is strictly bounded by `.size()`, and every create/update operation enforces `.keys().hasAll(...)` and `.keys().hasOnly(...)` / `affectedKeys().hasOnly(...)`.

## 2. The "Dirty Dozen" Payloads
1. **Identity Spoofing on User Create**: `uid: "victim-uid"` when `request.auth.uid == "attacker-uid"`. -> `PERMISSION_DENIED`
2. **Unverified Email Write**: Authenticated user with `email_verified: false` attempting to create `/users/{uid}`. -> `PERMISSION_DENIED`
3. **PII Scraping via List on `/users`**: Authenticated user executing `getDocs(collection(db, 'users'))`. -> `PERMISSION_DENIED`
4. **Cross-User PII Read**: User A attempting `getDoc(doc(db, 'users', 'userB'))`. -> `PERMISSION_DENIED`
5. **Shadow Field Injection on User Update**: Sending `{ displayName: "Alice", isAdmin: true }`. -> `PERMISSION_DENIED`
6. **Orphaned Course Creation**: Creating `/courses/course_1` when `/users/$(request.auth.uid)` does not exist. -> `PERMISSION_DENIED`
7. **Course Owner Hijack on Update**: Updating `ownerId` from `"userA"` to `"userB"`. -> `PERMISSION_DENIED`
8. **Terminal State Mutation**: Updating a course whose existing `status == "archived"`. -> `PERMISSION_DENIED`
9. **Forged Client Timestamp**: Creating a course with `createdAt: Timestamp.fromMillis(1000)` instead of `serverTimestamp()`. -> `PERMISSION_DENIED`
10. **ID Poisoning Attack**: Creating a course with a 500-character or special-character document ID. -> `PERMISSION_DENIED`
11. **Value Poisoning on Course Progress**: Updating `progress` to `"one hundred"` or `999`. -> `PERMISSION_DENIED`
12. **Unfiltered Course List Query**: Calling `getDocs(collection(db, 'courses'))` without `where('ownerId', '==', uid)`. -> `PERMISSION_DENIED`
