import fs from 'fs';
import path from 'path';

const filePath = path.resolve('data/napista-tokens.json');

// Garante que o diretório de dados exista
const dataDir = path.dirname(filePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

/**
 * Salva o token mais recente, sobrescrevendo o anterior.
 * @param {object} tokenData - O objeto de token recebido da API.
 */
export function saveToken(tokenData) {
  const tokenInfo = {
    ...tokenData,
    created_at: new Date().toISOString(),
  };

  fs.writeFileSync(filePath, JSON.stringify(tokenInfo, null, 2));
}

/**
 * Lê o token armazenado.
 * @returns {object|null} O objeto de token ou nulo se não existir.
 */
export function getToken() {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return fileContent ? JSON.parse(fileContent) : null;
}

/**
 * Obtém apenas o refresh_token.
 * @returns {string|null} O refresh token ou nulo.
 */
export function getRefreshToken() {
  const token = getToken();
  return token ? token.refresh_token : null;
}
