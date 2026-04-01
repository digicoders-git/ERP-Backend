# Library Management API Documentation

## Base URL
```
http://localhost:5000/api/library-panel
```

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## 📚 Book Management APIs

### 1. Add Book
**POST** `/book/add`

**Request Body:**
```json
{
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "ISBN": "978-0-7432-7356-5",
  "category": "Fiction",
  "totalCopies": 5
}
```

**Response (201):**
```json
{
  "message": "Book added successfully",
  "book": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "ISBN": "978-0-7432-7356-5",
    "category": "Fiction",
    "totalCopies": 5,
    "availableCopies": 5,
    "branch": "507f1f77bcf86cd799439012",
    "client": "507f1f77bcf86cd799439013",
    "createdBy": "507f1f77bcf86cd799439014",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 2. Get All Books
**GET** `/book/all?page=1&limit=10&search=gatsby`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by title, author, ISBN, or category

**Response (200):**
```json
{
  "books": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "ISBN": "978-0-7432-7356-5",
      "category": "Fiction",
      "totalCopies": 5,
      "availableCopies": 3,
      "createdBy": {
        "_id": "507f1f77bcf86cd799439014",
        "email": "admin@library.com",
        "role": "libraryAdmin"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

### 3. Get Book By ID
**GET** `/book/:id`

**Response (200):**
```json
{
  "book": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "ISBN": "978-0-7432-7356-5",
    "category": "Fiction",
    "totalCopies": 5,
    "availableCopies": 3,
    "branch": {
      "_id": "507f1f77bcf86cd799439012",
      "branchName": "Main Branch",
      "branchCode": "MB001"
    },
    "createdBy": {
      "_id": "507f1f77bcf86cd799439014",
      "email": "admin@library.com",
      "role": "libraryAdmin"
    }
  }
}
```

---

### 4. Update Book
**PUT** `/book/:id`

**Request Body:**
```json
{
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "ISBN": "978-0-7432-7356-5",
  "category": "Classic Fiction",
  "totalCopies": 7
}
```

**Response (200):**
```json
{
  "message": "Book updated successfully",
  "book": { /* updated book object */ }
}
```

---

### 5. Delete Book
**DELETE** `/book/:id`

**Response (200):**
```json
{
  "message": "Book deleted successfully"
}
```

---

## 👥 Member Management APIs

### 1. Add Member
**POST** `/member/add`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "joiningDate": "2024-01-15",
  "status": true
}
```

**Response (201):**
```json
{
  "message": "Member added successfully",
  "member": {
    "_id": "507f1f77bcf86cd799439015",
    "name": "John Doe",
    "email": "john@example.com",
    "joiningDate": "2024-01-15",
    "status": true,
    "branch": "507f1f77bcf86cd799439012",
    "client": "507f1f77bcf86cd799439013",
    "createdBy": "507f1f77bcf86cd799439014",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 2. Get All Members
**GET** `/member/all?page=1&limit=10&search=john`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name or email

**Response (200):**
```json
{
  "members": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "name": "John Doe",
      "email": "john@example.com",
      "joiningDate": "2024-01-15",
      "status": true,
      "createdBy": {
        "_id": "507f1f77bcf86cd799439014",
        "email": "admin@library.com",
        "role": "libraryAdmin"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

### 3. Update Member
**PUT** `/member/:id`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "joiningDate": "2024-01-15",
  "status": true
}
```

**Response (200):**
```json
{
  "message": "Member updated successfully",
  "member": { /* updated member object */ }
}
```

---

### 4. Delete Member
**DELETE** `/member/:id`

**Response (200):**
```json
{
  "message": "Member deleted successfully"
}
```

---

## 📖 Book Issue Management APIs

### 1. Issue Book
**POST** `/book-issue/issue`

**Request Body:**
```json
{
  "bookId": "507f1f77bcf86cd799439011",
  "memberId": "507f1f77bcf86cd799439015",
  "issueDate": "2024-01-15"
}
```

**Response (201):**
```json
{
  "message": "Book issued successfully",
  "bookIssue": {
    "_id": "507f1f77bcf86cd799439016",
    "book": "507f1f77bcf86cd799439011",
    "member": "507f1f77bcf86cd799439015",
    "issueDate": "2024-01-15",
    "returnDate": null,
    "status": "issued",
    "branch": "507f1f77bcf86cd799439012",
    "client": "507f1f77bcf86cd799439013",
    "issuedBy": "507f1f77bcf86cd799439014",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 2. Return Book
**PUT** `/book-issue/return/:id`

**Request Body:**
```json
{
  "returnDate": "2024-01-29"
}
```

**Response (200):**
```json
{
  "message": "Book returned successfully",
  "bookIssue": {
    "_id": "507f1f77bcf86cd799439016",
    "book": "507f1f77bcf86cd799439011",
    "member": "507f1f77bcf86cd799439015",
    "issueDate": "2024-01-15",
    "returnDate": "2024-01-29",
    "status": "returned",
    "branch": "507f1f77bcf86cd799439012",
    "client": "507f1f77bcf86cd799439013",
    "issuedBy": "507f1f77bcf86cd799439014"
  }
}
```

---

### 3. Get All Book Issues
**GET** `/book-issue/all?page=1&limit=10&status=issued`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (issued/returned)

**Response (200):**
```json
{
  "bookIssues": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "book": {
        "_id": "507f1f77bcf86cd799439011",
        "title": "The Great Gatsby",
        "author": "F. Scott Fitzgerald",
        "ISBN": "978-0-7432-7356-5"
      },
      "member": {
        "_id": "507f1f77bcf86cd799439015",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "issueDate": "2024-01-15",
      "returnDate": null,
      "status": "issued",
      "issuedBy": {
        "_id": "507f1f77bcf86cd799439014",
        "email": "admin@library.com",
        "role": "libraryAdmin"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

## 👨‍🎓 Student Management APIs

### 1. Add Student
**POST** `/student/add`

**Request Body:**
```json
{
  "name": "Alice Johnson",
  "phone": "9876543210",
  "email": "alice@school.com",
  "class": "10A",
  "year": 2024,
  "rollNo": "001",
  "status": true
}
```

**Response (201):**
```json
{
  "message": "Student added successfully",
  "student": {
    "_id": "507f1f77bcf86cd799439017",
    "name": "Alice Johnson",
    "phone": "9876543210",
    "email": "alice@school.com",
    "class": "10A",
    "year": 2024,
    "rollNo": "001",
    "status": true,
    "branch": "507f1f77bcf86cd799439012",
    "client": "507f1f77bcf86cd799439013",
    "createdBy": "507f1f77bcf86cd799439014",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 2. Get All Students
**GET** `/student/all?page=1&limit=10&search=alice`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name, email, rollNo, or class

**Response (200):**
```json
{
  "students": [
    {
      "_id": "507f1f77bcf86cd799439017",
      "name": "Alice Johnson",
      "phone": "9876543210",
      "email": "alice@school.com",
      "class": "10A",
      "year": 2024,
      "rollNo": "001",
      "status": true,
      "createdBy": {
        "_id": "507f1f77bcf86cd799439014",
        "email": "admin@library.com",
        "role": "libraryAdmin"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 200,
    "page": 1,
    "limit": 10,
    "totalPages": 20
  }
}
```

---

### 3. Update Student
**PUT** `/student/:id`

**Request Body:**
```json
{
  "name": "Alice Johnson",
  "phone": "9876543210",
  "email": "alice.johnson@school.com",
  "class": "10A",
  "year": 2024,
  "rollNo": "001",
  "status": true
}
```

**Response (200):**
```json
{
  "message": "Student updated successfully",
  "student": { /* updated student object */ }
}
```

---

### 4. Delete Student
**DELETE** `/student/:id`

**Response (200):**
```json
{
  "message": "Student deleted successfully"
}
```

---

## 📊 Dashboard & Analytics APIs

### 1. Get Library Stats
**GET** `/library/stats`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "books": {
      "total": 150,
      "totalCopies": 500,
      "availableCopies": 350,
      "byCategory": [
        { "_id": "Fiction", "count": 45 },
        { "_id": "Science", "count": 35 },
        { "_id": "History", "count": 25 }
      ]
    },
    "issues": {
      "issued": 120,
      "returned": 280,
      "overdue": 5
    }
  }
}
```

---

### 2. Get Books
**GET** `/library/books?page=1&limit=20&search=gatsby`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "ISBN": "978-0-7432-7356-5",
      "category": "Fiction",
      "totalCopies": 5,
      "availableCopies": 3,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

---

### 3. Get Issued Books
**GET** `/library/issued?limit=10`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "bookTitle": "The Great Gatsby",
      "memberName": "John Doe",
      "issueDate": "2024-01-15",
      "returnDate": null,
      "status": "issued"
    }
  ]
}
```

---

### 4. Get Members
**GET** `/library/members?page=1&limit=20`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "name": "John Doe",
      "email": "john@example.com",
      "status": true,
      "joiningDate": "2024-01-15",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

---

### 5. Get Overdue Books
**GET** `/library/overdue`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "bookTitle": "The Great Gatsby",
      "memberName": "John Doe",
      "memberEmail": "john@example.com",
      "issueDate": "2024-01-15",
      "daysIssued": 20
    }
  ]
}
```

---

### 6. Get Library Dashboard
**GET** `/library/dashboard`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "books": {
      "total": 150,
      "available": 100
    },
    "issues": {
      "issued": 120,
      "overdue": 5
    },
    "members": 85,
    "recentIssues": 5
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Book title is required"
}
```

### 403 Forbidden
```json
{
  "message": "Only library admin can add books"
}
```

### 404 Not Found
```json
{
  "message": "Book not found"
}
```

### 500 Server Error
```json
{
  "message": "Server error",
  "error": "Error details"
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 500 | Server Error - Internal server error |

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Pagination starts from page 1
- Search is case-insensitive
- All monetary values are in the default currency
- Member status: true = active, false = inactive
