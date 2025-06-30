const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const app = express();
const PORT = 3000;

// Configuration CORS
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configuration de stockage pour multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.ifc', '.IFC'];
    const fileExt = path.extname(file.originalname);
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers IFC sont autorisés'));
    }
  }
});

// Route pour l'upload de fichiers
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
      url: `/api/files/${req.file.filename}`
    };

    res.json({ 
      success: true, 
      file: fileInfo,
      message: 'Fichier uploadé avec succès' 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erreur lors de l\'upload du fichier',
      details: error.message 
    });
  }
});

// Route pour servir les fichiers uploadés
app.get('/api/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '..', 'uploads', filename);
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ error: 'Fichier non trouvé' });
  }
});

// Route proxy pour contourner les problèmes CORS
app.get('/api/proxy', (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL manquante' });
  }

  const protocol = targetUrl.startsWith('https:') ? https : http;
  
  protocol.get(targetUrl, (response) => {
    // Définir les headers appropriés
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    
    // Pipe la response
    response.pipe(res);
  }).on('error', (error) => {
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du fichier',
      details: error.message 
    });
  });
});

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serveur BIM Viewer opérationnel' });
});

// Gestion des erreurs
app.use((error, req, res, next) => {
  console.error('Erreur serveur:', error);
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    details: error.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur BIM Viewer démarré sur http://localhost:${PORT}`);
  console.log(`📁 Dossier d'upload: ${path.join(__dirname, '..', 'uploads')}`);
});