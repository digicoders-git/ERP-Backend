const validateBook = (req, res, next) => {
  const { title, author, ISBN, category, totalCopies } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ message: 'Book title is required' });
  if (!author || !author.trim()) return res.status(400).json({ message: 'Author name is required' });
  if (!ISBN || !ISBN.trim()) return res.status(400).json({ message: 'ISBN is required' });
  if (!category || !category.trim()) return res.status(400).json({ message: 'Category is required' });
  if (!totalCopies || totalCopies < 1) return res.status(400).json({ message: 'Total copies must be at least 1' });
  next();
};

const validateMember = (req, res, next) => {
  const { name, email, joiningDate } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: 'Member name is required' });
  if (!email || !email.trim()) return res.status(400).json({ message: 'Email is required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Invalid email format' });
  if (!joiningDate) return res.status(400).json({ message: 'Joining date is required' });
  next();
};

const validateBookIssue = (req, res, next) => {
  const { bookId, memberId, dueDate } = req.body;
  if (!bookId || !bookId.trim()) return res.status(400).json({ message: 'Book ID is required' });
  if (!memberId || !memberId.trim()) return res.status(400).json({ message: 'Member ID is required' });
  if (!dueDate) return res.status(400).json({ message: 'Due date is required' });
  if (new Date(dueDate) <= new Date()) return res.status(400).json({ message: 'Due date must be in the future' });
  next();
};

const validateStudent = (req, res, next) => {
  const { name, email, class: className, rollNo } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: 'Student name is required' });
  if (!email || !email.trim()) return res.status(400).json({ message: 'Email is required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Invalid email format' });
  if (!className || !className.trim()) return res.status(400).json({ message: 'Class is required' });
  if (!rollNo || !rollNo.trim()) return res.status(400).json({ message: 'Roll number is required' });
  next();
};

module.exports = { validateBook, validateMember, validateBookIssue, validateStudent };
