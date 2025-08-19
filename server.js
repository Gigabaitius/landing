const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Создаем необходимые папки
fs.ensureDirSync('uploads');
fs.ensureDirSync('data');
fs.ensureDirSync('frontend');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Статические файлы
app.use(express.static('frontend'));
app.use('/uploads', express.static('uploads'));

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Создаем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const fileName = file.fieldname + '-' + uniqueSuffix + fileExtension;
    cb(null, fileName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB лимит
  },
  fileFilter: (req, file, cb) => {
    // Проверяем тип файла
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения разрешены!'), false);
    }
  }
});

// Маршруты API

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Загрузка одного изображения
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'Файл не загружен' 
      });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    
    console.log('Файл загружен:', req.file.filename);
    
    res.json({ 
      success: true,
      url: imageUrl, 
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера при загрузке файла' 
    });
  }
});

// Загрузка нескольких изображений
app.post('/api/upload-multiple', upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Файлы не загружены' 
      });
    }
    
    const uploadedFiles = req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    }));
    
    console.log('Загружено файлов:', uploadedFiles.length);
    
    res.json({ 
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Ошибка загрузки файлов:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера при загрузке файлов' 
    });
  }
});

// Сохранение контента сайта
app.post('/api/save-content', async (req, res) => {
  try {
    const contentData = {
      ...req.body,
      lastUpdated: new Date().toISOString(),
      version: Date.now()
    };
    
    // Сохраняем в JSON файл
    await fs.writeJson('data/content.json', contentData, { spaces: 2 });
    
    // Создаем бэкап
    const backupFileName = `data/backup_${Date.now()}.json`;
    await fs.writeJson(backupFileName, contentData, { spaces: 2 });
    
    console.log('Контент сохранен:', new Date().toLocaleString());
    
    res.json({ 
      success: true, 
      message: 'Контент успешно сохранен',
      timestamp: contentData.lastUpdated
    });
  } catch (error) {
    console.error('Ошибка сохранения контента:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка сохранения на сервере' 
    });
  }
});

// Загрузка сохраненного контента
app.get('/api/load-content', async (req, res) => {
  try {
    const contentPath = 'data/content.json';
    const exists = await fs.pathExists(contentPath);
    
    if (!exists) {
      return res.json({ 
        success: true,
        data: null,
        message: 'Сохраненный контент не найден' 
      });
    }
    
    const contentData = await fs.readJson(contentPath);
    
    console.log('Контент загружен:', new Date().toLocaleString());
    
    res.json({ 
      success: true,
      data: contentData,
      message: 'Контент успешно загружен'
    });
  } catch (error) {
    console.error('Ошибка загрузки контента:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка загрузки с сервера' 
    });
  }
});

// Получение списка всех загруженных изображений
app.get('/api/images', async (req, res) => {
  try {
    const uploadsDir = 'uploads';
    const exists = await fs.pathExists(uploadsDir);
    
    if (!exists) {
      return res.json({ 
        success: true,
        images: [],
        message: 'Папка с изображениями пуста'
      });
    }
    
    const files = await fs.readdir(uploadsDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
    });
    
    const images = imageFiles.map(filename => ({
      filename,
      url: `/uploads/${filename}`,
      path: path.join(uploadsDir, filename)
    }));
    
    res.json({ 
      success: true,
      images: images,
      count: images.length
    });
  } catch (error) {
    console.error('Ошибка получения списка изображений:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка получения изображений' 
    });
  }
});

// Удаление изображения
app.delete('/api/delete-image/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join('uploads', filename);
    
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Файл не найден' 
      });
    }
    
    await fs.remove(filePath);
    
    console.log('Файл удален:', filename);
    
    res.json({ 
      success: true, 
      message: 'Файл успешно удален',
      filename: filename
    });
  } catch (error) {
    console.error('Ошибка удаления файла:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка удаления файла' 
    });
  }
});

// Обработка ошибок
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Файл слишком большой. Максимальный размер: 10MB'
      });
    }
  }
  
  console.error('Ошибка сервера:', error);
  res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера'
  });
});

// 404 для несуществующих маршрутов
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Маршрут не найден'
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  console.log(`📁 Статические файлы: /frontend`);
  console.log(`📸 Изображения: /uploads`);
  console.log(`💾 Данные: /data`);
  console.log('=================================');
  
  // Проверяем существование главного файла
  const indexPath = 'frontend/index.html';
  if (!fs.existsSync(indexPath)) {
    console.log('⚠️  Внимание: frontend/index.html не найден!');
    console.log('   Создайте файл frontend/index.html с вашим лендингом');
  }
});
