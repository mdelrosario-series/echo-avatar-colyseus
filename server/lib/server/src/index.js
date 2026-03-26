import { listen } from '@colyseus/tools';
import app from './app.config';
await listen(app, Number(process.env.COLYSEUS_PORT || 2568));
