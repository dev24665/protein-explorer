const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');

const app = express();
const PORT = 3000;
const SECRET_KEY = ''; 


app.use(cors());
app.use(bodyParser.json());


const db = mysql.createConnection({
  host: 'localhost',
  user: '', 
  password: '', 
  database: 'proteindb' 
});

db.connect((err) => {
  if (err) {
    console.error('connection failed:', err);
  } else {
    console.log('Connected');
  }
});


const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    console.error('Authorization header missing');
    return res.status(401).send('Access denied: No token provided');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.error('Token missing in Authorization header');
    return res.status(401).send('Access denied: No token provided');
  }



  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
    
      if (err.name === 'JsonWebTokenError') {
        return res.status(400).send('Malformed token. Please log in again.');
      }
      if (err.name === 'TokenExpiredError') {
        return res.status(403).send('Session expired. Please log in again.');
      }
      return res.status(403).send('Invalid token. Please log in again.');
    }
    req.user = user;
    next();
  });
};


app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM users WHERE username = ?';
  db.query(query, [username], async (err, results) => {
    if (err) return res.status(500).send('Server error');
    if (results.length === 0) return res.status(401).send('Invalid credentials');

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) return res.status(401).send('Invalid credentials');

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  });
});

app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body;

  const checkQuery = 'SELECT * FROM users WHERE username = ?';
  db.query(checkQuery, [username], async (err, results) => {
    if (err) return res.status(500).send('Server error');
    if (results.length > 0) return res.status(400).send('Username already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.query(insertQuery, [username, hashedPassword], (err, results) => {
      if (err) return res.status(500).send('Server error');
      res.status(201).send('User registered successfully');
    });
  });
});

app.post('/home/save', authenticateToken, (req, res) => {

  const { accessionId, name, organism, sequenceLength } = req.body;
  const userId = req.user.id; 

  if (!accessionId || !name || !organism || !sequenceLength) {
    return res.status(400).send('All fields are required'); 
  }

  const checkQuery = `
    SELECT * FROM search_results 
    WHERE user_id = ? AND accession_id = ?
  `;
  db.query(checkQuery, [userId, accessionId], (err, results) => {
    if (err) {
      console.error('Error checking existing record:', err);
      return res.status(500).send('Server error');
    }

    if (results.length > 0) {
      return res.status(400).send('Protein ID already exists in your saved records');
    }

    const insertQuery = `
      INSERT INTO search_results (user_id, accession_id, name, organism, sequence_length)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.query(insertQuery, [userId, accessionId, name, organism, sequenceLength], (err, results) => {
      if (err) {
        console.error('Error saving search result:', err);
        return res.status(500).send('Failed to save search result');
      }
      res.status(201).json({ message: 'Search result saved successfully' });
    });
  });
});


app.get('/home/results', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const query = 'SELECT * FROM search_results WHERE user_id = ?'; 
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error retrieving search results:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json(results || []); 
  });
});


app.delete('/home/delete/:accessionId', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { accessionId } = req.params;

  const query = 'DELETE FROM search_results WHERE user_id = ? AND accession_id = ?';
  db.query(query, [userId, accessionId], (err, results) => {
    if (err) {
      console.error('Error deleting protein:', err);
      return res.status(500).send('Server error');
    }
    if (results.affectedRows === 0) {
      return res.status(404).send('Protein not found');
    }
    res.status(200).json({ message: 'Search result saved successfully' });
  });
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
