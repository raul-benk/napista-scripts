import fs from 'fs';
import path from 'path';

const filePath = path.resolve('data/napista-tokens.json');

export function saveToken(tokenData) {
  let tokens = [];

  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    tokens = fileContent ? JSON.parse(fileContent) : [];
  }

  tokens.push({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in,
    token_type: tokenData.token_type,
    scope: tokenData.scope,
    session_state: tokenData.session_state,
    created_at: new Date().toISOString()
  });

  fs.writeFileSync(filePath, JSON.stringify(tokens, null, 2));
}
