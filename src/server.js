import express from 'express';
import dotenv from 'dotenv';
import { exchangeCodeForToken } from './napista.js';

dotenv.config();

const app = express();

app.get('/napista/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      error: 'Authorization code não recebido'
    });
  }

  try {
    const tokenData = await exchangeCodeForToken(code);

    return res.json({
      success: true,
      message: 'Token gerado e armazenado com sucesso',
      expires_in: tokenData.expires_in
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao obter token',
      details: error.response?.data || error.message
    });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Servidor rodando na porta ${process.env.PORT}`);
});
