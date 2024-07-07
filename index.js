const express = require('express');
const app = express();
const port = 3000;
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User API',
      version: '1.0.0',
    },
    servers: [
      { url: 'http://localhost:3000/api' },
    ],
  },
  apis: ['./routes/*.js'],
};

const specs = swaggerJsdoc(options);

app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use('/api', routes);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
