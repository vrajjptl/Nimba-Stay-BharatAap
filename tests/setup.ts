import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nimba-stay-'));
process.env.DATABASE_PATH = path.join(dir, 'test.sqlite');
