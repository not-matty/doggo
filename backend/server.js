// backend/server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sequelize = require('./config/database');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Test DB Connection
sequelize.authenticate()
  .then(() => console.log('Database connected...'))
  .catch((err) => console.error('Error: ' + err));

// Define a simple route
app.get('/', (req, res) => res.send('API Running'));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

// In server.js
const helmet = require('helmet');
app.use(helmet());

const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  swaggerDefinition: {
    info: {
      title: 'DoggoApp API',
      version: '1.0.0',
    },
  },
  apis: ['routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
