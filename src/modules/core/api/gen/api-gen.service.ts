import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { Api } from "../../schema/db-schema";
import { logger } from "../../../../utils/logger";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

/**
 * Interface for the table schema configuration generated from API schema
 */
interface TableSchema {
  tableName: string;
  columns: {
    name: string;
    type: string;
    constraints: string[];
  }[];
  primaryKey?: string;
}

/**
 * Generates a consistent hash for a table name based on user_id, project_id and endpoint path
 *
 * @param userId - The user ID
 * @param projectId - The project ID
 * @param endpointPath - The API endpoint path
 * @returns A shortened hash string suitable for table name creation
 */
function generateTableNameHash(
  userId: number,
  projectId: number,
  endpointPath: string
): string {
  const input = `${userId}_${projectId}_${endpointPath}`;
  return crypto.createHash("md5").update(input).digest("hex").substring(0, 10);
}

/**
 * Maps API schema types to database column types
 *
 * @param schemaType - The type from the API schema
 * @returns The corresponding database column type
 */
function mapTypeToDbType(schemaType: string): string {
  switch (schemaType.toLowerCase()) {
    case "string":
      return "TEXT";
    case "number":
      return "DOUBLE";
    case "integer":
      return "INT";
    case "boolean":
      return "BOOLEAN";
    case "date":
    case "datetime":
      return "DATETIME";
    default:
      return "TEXT";
  }
}

/**
 * Extracts constraints from API schema properties
 *
 * @param property - The property object from API schema
 * @returns Array of constraint strings
 */
function extractConstraints(property: any): string[] {
  const constraints: string[] = [];

  if (property["min-length"]) {
    constraints.push(`MIN_LENGTH(${property["min-length"]})`);
  }

  if (property["max-length"]) {
    constraints.push(`MAX_LENGTH(${property["max-length"]})`);
  }

  if (property.required) {
    constraints.push("NOT NULL");
  }

  return constraints;
}

/**
 * Generates a table schema from API body parameters
 *
 * @param body - The body object from API parameters
 * @returns Table schema configuration object
 */
function generateTableSchema(
  userId: number,
  projectId: number,
  endpointPath: string,
  body: any
): TableSchema {
  const tableName = `api_${generateTableNameHash(
    userId,
    projectId,
    endpointPath
  )}`;
  const columns = [];

  // Add id column as primary key
  columns.push({
    name: "id",
    type: "INT",
    constraints: ["AUTO_INCREMENT", "PRIMARY KEY"],
  });

  // Add created_at and updated_at columns
  columns.push({
    name: "created_at",
    type: "DATETIME",
    constraints: ["DEFAULT CURRENT_TIMESTAMP"],
  });

  columns.push({
    name: "updated_at",
    type: "DATETIME",
    constraints: ["DEFAULT CURRENT_TIMESTAMP", "ON UPDATE CURRENT_TIMESTAMP"],
  });

  // Add columns from API schema properties
  if (body && body.properties) {
    for (const [name, property] of Object.entries(body.properties)) {
      const prop = property as any;
      const required = body.required && body.required.includes(name);

      columns.push({
        name,
        type: mapTypeToDbType(prop.type),
        constraints: [
          ...(required ? ["NOT NULL"] : []),
          ...extractConstraints(prop),
        ],
      });
    }
  }

  return {
    tableName,
    columns,
    primaryKey: "id",
  };
}

/**
 * Creates a server.js file for the API container
 *
 * @param containerDir - Directory where server.js will be created
 * @param apiSchema - API schema object
 * @param tableSchema - Table schema object
 * @returns Path to the created server.js file
 */
async function createServerFile(
  containerDir: string,
  apiSchema: any,
  tableSchema: TableSchema
): Promise<string> {
  const serverContent = `
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Load schema files
const tableSchema = JSON.parse(fs.readFileSync('./table_schema.json', 'utf8'));
const apiSchema = JSON.parse(fs.readFileSync('./api_schema.json', 'utf8'));

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure database connection
let dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Create database connection pool
const pool = mysql.createPool(dbConfig);

// Ensure table exists on startup
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to database');
    
    // Build CREATE TABLE query from schema
    const columnDefinitions = tableSchema.columns.map(column => {
      return \`\${column.name} \${column.type} \${column.constraints.join(' ')}\`;
    }).join(', ');
    
    const createTableQuery = \`
      CREATE TABLE IF NOT EXISTS \${tableSchema.tableName} (
        \${columnDefinitions}
      )
    \`;
    
    console.log('Creating table if not exists:', tableSchema.tableName);
    await connection.query(createTableQuery);
    
    connection.release();
    console.log('Table initialization complete');
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
}

// Handle API endpoint (${apiSchema.endpoint_path} - ${apiSchema.http_method})
app.post('${apiSchema.endpoint_path}', async (req, res) => {
  try {
    // Validate request body against schema
    const bodySchema = apiSchema.parameters?.body;
    if (bodySchema?.required) {
      for (const required of bodySchema.required) {
        if (!req.body[required]) {
          return res.status(400).json({ 
            error: \`Missing required field: \${required}\`
          });
        }
      }
    }
    
    // Build insert query based on request body and schema
    const insertFields = [];
    const insertValues = [];
    const placeholders = [];
    
    for (const [key, value] of Object.entries(req.body)) {
      // Skip if the field is not in our schema
      if (!bodySchema?.properties[key]) continue;
      
      insertFields.push(key);
      insertValues.push(value);
      placeholders.push('?');
    }
    
    // Insert record into database
    const connection = await pool.getConnection();
    const insertQuery = \`
      INSERT INTO \${tableSchema.tableName} 
      (\${insertFields.join(', ')}) 
      VALUES (\${placeholders.join(', ')})
    \`;
    
    const [result] = await connection.query(insertQuery, insertValues);
    connection.release();
    
    // Respond with success and inserted ID
    res.status(201).json({
      id: result.insertId,
      ...req.body,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(\`API server running on port \${PORT}\`);
    });
  })
  .catch(err => {
    console.error('Failed to start server:', err);
  });
`;

  const serverFilePath = path.join(containerDir, "server.js");
  await fs.writeFile(serverFilePath, serverContent);
  return serverFilePath;
}

/**
 * Creates a .env file for the API container
 *
 * @param containerDir - Directory where .env will be created
 * @returns Path to the created .env file
 */
async function createEnvFile(containerDir: string): Promise<string> {
  const envContent = `
PORT=3000
DB_HOST=${process.env.DB_HOST || "localhost"}
DB_USER=${process.env.DB_USER || "root"}
DB_PASSWORD=${process.env.DB_PASSWORD || "password"}
DB_NAME=${process.env.DB_NAME || "api_db"}
`;

  const envFilePath = path.join(containerDir, ".env");
  await fs.writeFile(envFilePath, envContent);
  return envFilePath;
}

/**
 * Creates a Dockerfile for the API container
 *
 * @param containerDir - Directory where Dockerfile will be created
 * @returns Path to the created Dockerfile
 */
async function createDockerfile(containerDir: string): Promise<string> {
  const dockerfileContent = `
FROM node:18-alpine

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
`;

  const dockerfilePath = path.join(containerDir, "Dockerfile");
  await fs.writeFile(dockerfilePath, dockerfileContent);
  return dockerfilePath;
}

/**
 * Creates a package.json file for the API container
 *
 * @param containerDir - Directory where package.json will be created
 * @returns Path to the created package.json file
 */
async function createPackageJson(containerDir: string): Promise<string> {
  const packageJsonContent = `
{
  "name": "api-container",
  "version": "1.0.0",
  "description": "Generated API Container",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "mysql2": "^3.6.0"
  }
}
`;

  const packageJsonPath = path.join(containerDir, "package.json");
  await fs.writeFile(packageJsonPath, packageJsonContent);
  return packageJsonPath;
}

/**
 * Builds and starts a Docker container for the API
 *
 * @param containerDir - Directory with container files
 * @param containerName - Name for the Docker container
 * @returns Information about the created container
 */
async function buildAndStartContainer(
  containerDir: string,
  containerName: string
): Promise<{
  containerId: string;
  containerPort: number;
}> {
  try {
    // Build the Docker image
    const buildCmd = `docker build -t ${containerName} ${containerDir}`;
    logger.info(`Building Docker image: ${buildCmd}`);
    await execPromise(buildCmd);

    // Run the Docker container
    const hostPort = 30000 + Math.floor(Math.random() * 1000); // Random port between 30000-30999
    const runCmd = `docker run -d -p ${hostPort}:3000 --name ${containerName} ${containerName}`;
    logger.info(`Starting Docker container: ${runCmd}`);
    const { stdout } = await execPromise(runCmd);

    const containerId = stdout.trim();
    return {
      containerId,
      containerPort: hostPort,
    };
  } catch (error: any) {
    logger.error({ error }, "Failed to build or start Docker container");
    throw new Error(`Docker container error: ${error.message}`);
  }
}

/**
 * Generates schema files for an API
 *
 * @param apiId - The ID of the API
 * @returns Object containing paths to generated files and status
 */
export async function generateApiSchemas(apiId: number): Promise<{
  tableSchemaPath: string;
  apiSchemaPath: string;
  success: boolean;
  tableName?: string;
  containerDir?: string;
}> {
  try {
    // 1. Fetch API schema from MongoDB
    const apiSchema = await Api.findOne({ api_id: apiId });

    if (!apiSchema) {
      logger.error(
        `generateApiSchemas: API with ID ${apiId} not found in MongoDB`
      );
      throw new Error(`API with ID ${apiId} not found`);
    }

    // 2. Check if API method is POST
    if (apiSchema.http_method !== "POST") {
      logger.warn(
        `generateApiSchemas: API with ID ${apiId} is not a POST method API`
      );
      throw new Error("Only POST APIs can be used for table schema generation");
    }

    // 3. Check if API schema has body parameters
    if (!apiSchema.parameters || !apiSchema.parameters.body) {
      logger.warn(
        `generateApiSchemas: API with ID ${apiId} has no body parameters defined`
      );
      throw new Error(
        "API schema must contain body parameters for table generation"
      );
    }

    // 4. Generate table schema
    const tableSchema = generateTableSchema(
      apiSchema.user_id,
      apiSchema.project_id,
      apiSchema.endpoint_path,
      apiSchema.parameters.body
    );

    // 5. Create container directory
    const containerDir = path.join(
      process.cwd(),
      "containers",
      `api_${apiId}_${Date.now()}`
    );
    await fs.mkdir(containerDir, { recursive: true });

    // 6. Write table schema to file
    const tableSchemaPath = path.join(containerDir, "table_schema.json");
    await fs.writeFile(tableSchemaPath, JSON.stringify(tableSchema, null, 2));

    // 7. Write API schema to file
    const apiSchemaPath = path.join(containerDir, "api_schema.json");
    await fs.writeFile(
      apiSchemaPath,
      JSON.stringify(apiSchema.toObject(), null, 2)
    );

    logger.info(
      `generateApiSchemas: Successfully generated schemas for API ID ${apiId}`
    );

    return {
      tableSchemaPath,
      apiSchemaPath,
      success: true,
      tableName: tableSchema.tableName,
      containerDir,
    };
  } catch (error) {
    logger.error(
      { error },
      `generateApiSchemas: Failed to generate schemas for API ID ${apiId}`
    );
    throw error;
  }
}

/**
 * Starts the API by generating schemas and creating a Docker container
 *
 * @param apiId - The ID of the API to start
 * @returns Object containing status and information about the started API
 */
export async function startApi(apiId: number): Promise<{
  success: boolean;
  message: string;
  apiId: number;
  tableName?: string;
  schemaFiles?: {
    tableSchema: string;
    apiSchema: string;
  };
  container?: {
    id: string;
    name: string;
    port: number;
    url: string;
  };
}> {
  try {
    // Generate schema files
    const { tableSchemaPath, apiSchemaPath, tableName, containerDir } =
      await generateApiSchemas(apiId);

    if (!containerDir) {
      throw new Error("Container directory was not created");
    }

    // Get API schema from MongoDB to use in server.js template
    const apiSchema = await Api.findOne({ api_id: apiId });
    if (!apiSchema) {
      throw new Error(`API with ID ${apiId} not found in MongoDB`);
    }

    const tableSchema = JSON.parse(await fs.readFile(tableSchemaPath, "utf8"));

    // Create server.js file
    await createServerFile(containerDir, apiSchema, tableSchema);

    // Create .env file
    await createEnvFile(containerDir);

    // Create Dockerfile
    await createDockerfile(containerDir);

    // Create package.json
    await createPackageJson(containerDir);

    // Build and start Docker container
    const containerName = `api_${apiId}_${Date.now()}`;
    const { containerId, containerPort } = await buildAndStartContainer(
      containerDir,
      containerName
    );

    // Update API status in MongoDB to "active"
    await Api.findOneAndUpdate(
      { api_id: apiId },
      {
        api_status: "active",
        container_info: {
          id: containerId,
          name: containerName,
          port: containerPort,
          directory: containerDir,
        },
      }
    );

    logger.info(
      `startApi: Successfully started API ID ${apiId} in container ${containerName}`
    );

    return {
      success: true,
      message: "API started successfully",
      apiId,
      tableName,
      schemaFiles: {
        tableSchema: tableSchemaPath,
        apiSchema: apiSchemaPath,
      },
      container: {
        id: containerId,
        name: containerName,
        port: containerPort,
        url: `http://localhost:${containerPort}${apiSchema.endpoint_path}`,
      },
    };
  } catch (error) {
    logger.error({ error }, `startApi: Failed to start API ID ${apiId}`);
    throw error;
  }
}

/**
 * Stops and removes a running API container
 *
 * @param apiId - The ID of the API to stop
 * @returns Object indicating success/failure of the operation
 */
// export async function stopApi(apiId: number): Promise<{
//   success: boolean;
//   message: string;
//   apiId: number;
// }> {
//   try {
//     // Get API with container info from MongoDB
//     const apiSchema = await Api.findOne({ api_id: apiId });

//     if (!apiSchema) {
//       throw new Error(`API with ID ${apiId} not found`);
//     }

//     if (!apiSchema.container_info || !apiSchema.container_info.id) {
//       throw new Error(`API with ID ${apiId} is not running in a container`);
//     }

//     // Stop and remove the Docker container
//     try {
//       await execPromise(`docker stop ${apiSchema.container_info.id}`);
//       await execPromise(`docker rm ${apiSchema.container_info.id}`);
//     } catch (dockerError) {
//       logger.warn(
//         { error: dockerError },
//         `Container for API ${apiId} may not exist or failed to stop`
//       );
//     }

//     // Update API status in MongoDB to "inactive"
//     await Api.findOneAndUpdate(
//       { api_id: apiId },
//       {
//         api_status: "inactive",
//         container_info: null,
//       }
//     );

//     logger.info(`stopApi: Successfully stopped API ID ${apiId}`);

//     return {
//       success: true,
//       message: `API ID ${apiId} stopped successfully`,
//       apiId,
//     };
//   } catch (error) {
//     logger.error({ error }, `stopApi: Failed to stop API ID ${apiId}`);
//     throw error;
//   }
// }
