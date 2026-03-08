import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';
import { seedIfEmpty } from './seed/seedData.js';

dotenv.config();

const port = Number(process.env.PORT || 5000);

async function bootstrap() {
  await connectDB(process.env.MONGO_URI);
  if (process.env.SEED_DEMO === 'true') {
    await seedIfEmpty();
  }

  app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
