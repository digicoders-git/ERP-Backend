// Library Management API Tests
// Run with: npm test

const request = require('supertest');
const app = require('../server');

let authToken = 'test-token';
let bookId, memberId, issueId, studentId;

describe('Library Management APIs', () => {
  
  // ============ BOOK TESTS ============
  describe('Book Management', () => {
    
    test('POST /api/library-panel/book/add - Add new book', async () => {
      const res = await request(app)
        .post('/api/library-panel/book/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          ISBN: '978-0-7432-7356-5',
          category: 'Fiction',
          totalCopies: 5
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Book added successfully');
      expect(res.body.book).toHaveProperty('_id');
      bookId = res.body.book._id;
    });

    test('POST /api/library-panel/book/add - Validation: Missing title', async () => {
      const res = await request(app)
        .post('/api/library-panel/book/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          author: 'F. Scott Fitzgerald',
          ISBN: '978-0-7432-7356-5',
          category: 'Fiction',
          totalCopies: 5
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('title');
    });

    test('GET /api/library-panel/book/all - Get all books', async () => {
      const res = await request(app)
        .get('/api/library-panel/book/all?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('books');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.books)).toBe(true);
    });

    test('GET /api/library-panel/book/:id - Get book by ID', async () => {
      const res = await request(app)
        .get(`/api/library-panel/book/${bookId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.book._id).toBe(bookId);
    });

    test('PUT /api/library-panel/book/:id - Update book', async () => {
      const res = await request(app)
        .put(`/api/library-panel/book/${bookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'The Great Gatsby (Updated)',
          author: 'F. Scott Fitzgerald',
          ISBN: '978-0-7432-7356-5',
          category: 'Classic Fiction',
          totalCopies: 7
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Book updated successfully');
    });

    test('DELETE /api/library-panel/book/:id - Delete book', async () => {
      const res = await request(app)
        .delete(`/api/library-panel/book/${bookId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Book deleted successfully');
    });
  });

  // ============ MEMBER TESTS ============
  describe('Member Management', () => {
    
    test('POST /api/library-panel/member/add - Add new member', async () => {
      const res = await request(app)
        .post('/api/library-panel/member/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          joiningDate: '2024-01-15',
          status: true
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Member added successfully');
      memberId = res.body.member._id;
    });

    test('POST /api/library-panel/member/add - Validation: Invalid email', async () => {
      const res = await request(app)
        .post('/api/library-panel/member/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Jane Doe',
          email: 'invalid-email',
          joiningDate: '2024-01-15',
          status: true
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('email');
    });

    test('GET /api/library-panel/member/all - Get all members', async () => {
      const res = await request(app)
        .get('/api/library-panel/member/all?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('members');
      expect(res.body).toHaveProperty('pagination');
    });

    test('PUT /api/library-panel/member/:id - Update member', async () => {
      const res = await request(app)
        .put(`/api/library-panel/member/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'John Doe Updated',
          email: 'john.updated@example.com',
          joiningDate: '2024-01-15',
          status: true
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Member updated successfully');
    });

    test('DELETE /api/library-panel/member/:id - Delete member', async () => {
      const res = await request(app)
        .delete(`/api/library-panel/member/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Member deleted successfully');
    });
  });

  // ============ BOOK ISSUE TESTS ============
  describe('Book Issue Management', () => {
    
    test('POST /api/library-panel/book-issue/issue - Issue book', async () => {
      const res = await request(app)
        .post('/api/library-panel/book-issue/issue')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookId: bookId,
          memberId: memberId,
          issueDate: '2024-01-15'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Book issued successfully');
      issueId = res.body.bookIssue._id;
    });

    test('GET /api/library-panel/book-issue/all - Get all issues', async () => {
      const res = await request(app)
        .get('/api/library-panel/book-issue/all?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('bookIssues');
      expect(res.body).toHaveProperty('pagination');
    });

    test('PUT /api/library-panel/book-issue/return/:id - Return book', async () => {
      const res = await request(app)
        .put(`/api/library-panel/book-issue/return/${issueId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          returnDate: '2024-01-29'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Book returned successfully');
    });
  });

  // ============ STUDENT TESTS ============
  describe('Student Management', () => {
    
    test('POST /api/library-panel/student/add - Add new student', async () => {
      const res = await request(app)
        .post('/api/library-panel/student/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Alice Johnson',
          phone: '9876543210',
          email: 'alice@school.com',
          class: '10A',
          year: 2024,
          rollNo: '001',
          status: true
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Student added successfully');
      studentId = res.body.student._id;
    });

    test('GET /api/library-panel/student/all - Get all students', async () => {
      const res = await request(app)
        .get('/api/library-panel/student/all?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('students');
      expect(res.body).toHaveProperty('pagination');
    });

    test('PUT /api/library-panel/student/:id - Update student', async () => {
      const res = await request(app)
        .put(`/api/library-panel/student/${studentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Alice Johnson Updated',
          phone: '9876543210',
          email: 'alice.updated@school.com',
          class: '10A',
          year: 2024,
          rollNo: '001',
          status: true
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Student updated successfully');
    });

    test('DELETE /api/library-panel/student/:id - Delete student', async () => {
      const res = await request(app)
        .delete(`/api/library-panel/student/${studentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Student deleted successfully');
    });
  });

  // ============ DASHBOARD TESTS ============
  describe('Dashboard & Analytics', () => {
    
    test('GET /api/admin-panel/library/stats - Get library stats', async () => {
      const res = await request(app)
        .get('/api/admin-panel/library/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('books');
      expect(res.body.data).toHaveProperty('issues');
    });

    test('GET /api/admin-panel/library/books - Get books for dashboard', async () => {
      const res = await request(app)
        .get('/api/admin-panel/library/books?page=1&limit=20')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/admin-panel/library/issued - Get issued books', async () => {
      const res = await request(app)
        .get('/api/admin-panel/library/issued?limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/admin-panel/library/members - Get members for dashboard', async () => {
      const res = await request(app)
        .get('/api/admin-panel/library/members?page=1&limit=20')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/admin-panel/library/overdue - Get overdue books', async () => {
      const res = await request(app)
        .get('/api/admin-panel/library/overdue')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/admin-panel/library/dashboard - Get library dashboard', async () => {
      const res = await request(app)
        .get('/api/admin-panel/library/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('books');
      expect(res.body.data).toHaveProperty('issues');
      expect(res.body.data).toHaveProperty('members');
    });
  });

  // ============ ERROR HANDLING TESTS ============
  describe('Error Handling', () => {
    
    test('GET /api/library-panel/book/:id - Book not found', async () => {
      const res = await request(app)
        .get('/api/library-panel/book/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('not found');
    });

    test('POST /api/library-panel/book/add - Missing auth token', async () => {
      const res = await request(app)
        .post('/api/library-panel/book/add')
        .send({
          title: 'Test Book',
          author: 'Test Author',
          ISBN: '123-456',
          category: 'Test',
          totalCopies: 1
        });

      expect(res.statusCode).toBe(401);
    });
  });
});
